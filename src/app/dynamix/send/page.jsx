'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CheckCircle2, Mail, MessageCircle, Sparkles } from 'lucide-react'

import { itinerariesApi, leadsApi, quotationsApi } from '@/lib/api'
import { dynamixAi } from '@/lib/dynamix-data'
import { getAiPlaybook } from '@/lib/dynamix-ai-data'
import { saveDynamixQuotationDraft } from '@/lib/dynamix-handoff'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

const deliveryOptions = [
  {
    key: 'email',
    title: 'Send by email',
    summary: 'Best when the client wants a neat quote summary they can review later.',
    icon: Mail,
  },
  {
    key: 'whatsapp',
    title: 'Send by WhatsApp',
    summary: 'Best when the quote needs faster back-and-forth and same-day follow-up.',
    icon: MessageCircle,
  },
]

export default function DynamixSendPage() {
  const router = useRouter()
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [sending, setSending] = useState(false)
  const [sentState, setSentState] = useState(null)
  const [error, setError] = useState('')
  const aiPlaybook = getAiPlaybook(workflow.aiFlow.categorySlug)
  const sendAssist = workflow.aiFlow.enabled ? aiPlaybook.sendMessage : dynamixAi.send
  const selectedChannels = useMemo(
    () => workflow.quote.selectedChannels || [],
    [workflow.quote.selectedChannels]
  )

  const deliverySummary = useMemo(() => {
    if (!selectedChannels.length) return 'Choose at least one send channel.'
    if (selectedChannels.length === 2) return 'Email + WhatsApp'
    return selectedChannels[0] === 'email' ? 'Email only' : 'WhatsApp only'
  }, [selectedChannels])

  function parseDurationDays() {
    const duration = String(workflow.query.duration || '')
    const numeric = Number(duration.match(/\d+/)?.[0] || 0)
    if (numeric > 0) return numeric

    const start = workflow.query.startDate ? new Date(workflow.query.startDate) : null
    const end = workflow.query.endDate ? new Date(workflow.query.endDate) : null
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(diff, 1)
    }
    return 5
  }

  function parseTravelerCount() {
    const pax = String(workflow.query.pax || '')
    const matches = pax.match(/\d+/g) || []
    const total = matches.reduce((sum, value) => sum + Number(value || 0), 0)
    return total || 2
  }

  function persistMeta(nextMeta) {
    const nextState = {
      ...workflow,
      meta: {
        ...workflow.meta,
        ...nextMeta,
      },
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
    return nextState
  }

  function persistQuote(nextQuote) {
    const nextState = {
      ...workflow,
      quote: nextQuote,
    }

    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  function updateQuote(key, value) {
    persistQuote({
      ...workflow.quote,
      [key]: value,
    })
  }

  function toggleChannel(channel) {
    const nextChannels = selectedChannels.includes(channel)
      ? selectedChannels.filter((item) => item !== channel)
      : [...selectedChannels, channel]

    persistQuote({
      ...workflow.quote,
      selectedChannels: nextChannels,
    })
  }

  function applyMessageTemplate(mode) {
    const templates = {
      polished: sendAssist,
      concise: `Hi ${workflow.quote.customerEmail?.split('@')[0] || 'there'}, sharing your ${workflow.selectedHoliday.title} quote at ${workflow.selectedHoliday.price}.`,
      premium: `Hi, I have shaped your ${workflow.selectedHoliday.title} around the strongest flow, stay quality, and client-ready inclusions. Sharing the quote at ${workflow.selectedHoliday.price}.`,
    }

    updateQuote('message', templates[mode] || sendAssist)
  }

  function saveHandoffDraft() {
    const crm = workflow.meta?.crm || {}
    saveDynamixQuotationDraft({
      lead_name: workflow.quote.customerEmail?.split('@')[0] || workflow.query.travelerType || 'Dynamix Client',
      destination: workflow.selectedHoliday.title,
      base_price: String(Number(String(workflow.selectedHoliday.price).replace(/[^0-9.]/g, '')) || 0),
      margin_pct: String(Number(String(workflow.quote.markup || '').replace(/[^0-9.]/g, '')) || 20),
      notes: workflow.quote.message,
      customer_email: workflow.quote.customerEmail,
      customer_whatsapp: workflow.quote.customerWhatsapp,
      selected_channels: selectedChannels,
      holiday_title: workflow.selectedHoliday.title,
      lead_id: crm.leadId,
      itinerary_id: crm.itineraryId,
      quotation_id: crm.quotationId,
      booking_id: crm.bookingId,
      total_price: crm.totalPrice,
      currency: crm.currency || 'INR',
      travel_dates: workflow.query.startDate && workflow.query.endDate
        ? `${workflow.query.startDate} to ${workflow.query.endDate}`
        : undefined,
      duration_days: parseDurationDays(),
      travelers_count: parseTravelerCount(),
    })
  }

  async function ensureLifecycleRecords(basePrice) {
    const existingCrm = workflow.meta?.crm || {}
    if (existingCrm.leadId && existingCrm.itineraryId) return existingCrm

    const leadName = workflow.quote.customerEmail?.split('@')[0] || workflow.query.travelerType || 'Dynamix Client'
    const senderId = workflow.quote.customerEmail || workflow.quote.customerWhatsapp || `dynamix-${Date.now()}`

    const lead = await leadsApi.create({
      sender_id: senderId,
      source: 'DIRECT',
      raw_message: `Dynamix handoff for ${workflow.selectedHoliday.title}`,
      destination: workflow.query.destination || workflow.selectedHoliday.title,
      duration_days: parseDurationDays(),
      travelers_count: parseTravelerCount(),
      travel_dates: workflow.query.startDate && workflow.query.endDate
        ? `${workflow.query.startDate} to ${workflow.query.endDate}`
        : workflow.query.startDate || undefined,
      budget_per_person: basePrice || undefined,
      currency: 'INR',
      travel_style: workflow.query.packageType || 'Standard',
      preferences: [workflow.query.travelerType, workflow.aiFlow.categoryTitle].filter(Boolean),
      triage_confidence: 1,
      suggested_reply: workflow.quote.message || undefined,
      full_name: leadName,
      email: workflow.quote.customerEmail || undefined,
      phone: workflow.quote.customerWhatsapp || undefined,
    })

    const itinerary = await itinerariesApi.generate({
      lead_id: lead.id,
      destination: workflow.query.destination || workflow.selectedHoliday.title,
      duration_days: parseDurationDays(),
      traveler_count: parseTravelerCount(),
      travel_dates: workflow.query.startDate && workflow.query.endDate
        ? `${workflow.query.startDate} to ${workflow.query.endDate}`
        : undefined,
      preferences: [workflow.query.packageType, workflow.query.travelerType].filter(Boolean),
      style: workflow.query.packageType || 'Standard',
      budget_range: basePrice ? `Approx INR ${basePrice} per person` : undefined,
    })

    const crm = {
      ...existingCrm,
      leadId: lead.id,
      itineraryId: itinerary.id,
      currency: itinerary.currency || 'INR',
    }
    persistMeta({ crm })
    return crm
  }

  async function createQuotation() {
    setSending(true)
    setError('')
    try {
      const basePrice = Number(String(workflow.selectedHoliday.price).replace(/[^0-9.]/g, '')) || 0
      const rawMarkup = Number(String(workflow.quote.markup || '').replace(/[^0-9.]/g, '')) || 20
      const crm = await ensureLifecycleRecords(basePrice)
      const quotation = await quotationsApi.create({
        lead_name: workflow.quote.customerEmail?.split('@')[0] || workflow.query.travelerType || 'Dynamix Client',
        destination: workflow.selectedHoliday.title,
        base_price: basePrice,
        margin_pct: Math.min(rawMarkup > 100 ? 20 : rawMarkup || 20, 100),
        currency: 'INR',
        lead_id: crm.leadId,
        itinerary_id: crm.itineraryId,
        notes: workflow.quote.message || undefined,
      })

      if (crm.leadId) {
        leadsApi
          .addNote(crm.leadId, {
            author: 'Dynamix',
            content: `Dynamix quotation created for ${workflow.selectedHoliday.title}. Quote #${quotation.id} at ${quotation.currency} ${quotation.total_price}. Channels: ${selectedChannels.join(', ') || 'not selected'}.`,
          })
          .catch(() => null)
      }

      saveDynamixQuotationDraft({
        lead_name: workflow.quote.customerEmail?.split('@')[0] || workflow.query.travelerType || 'Dynamix Client',
        destination: workflow.selectedHoliday.title,
        base_price: String(basePrice),
        margin_pct: String(Math.min(rawMarkup > 100 ? 20 : rawMarkup || 20, 100)),
        notes: workflow.quote.message,
        customer_email: workflow.quote.customerEmail,
        customer_whatsapp: workflow.quote.customerWhatsapp,
        selected_channels: selectedChannels,
        holiday_title: workflow.selectedHoliday.title,
        lead_id: crm.leadId,
        itinerary_id: crm.itineraryId,
        quotation_id: quotation.id,
        total_price: quotation.total_price,
        currency: quotation.currency,
        travel_dates: workflow.query.startDate && workflow.query.endDate
          ? `${workflow.query.startDate} to ${workflow.query.endDate}`
          : undefined,
        duration_days: parseDurationDays(),
        travelers_count: parseTravelerCount(),
      })

      const nextState = {
        ...workflow,
        quote: {
          ...workflow.quote,
          status: 'sent',
          quoteId: String(quotation.id),
          sentAt: new Date().toISOString(),
        },
        meta: {
          ...workflow.meta,
          crm: {
            ...(crm || {}),
            quotationId: quotation.id,
            totalPrice: quotation.total_price,
            currency: quotation.currency,
          },
        },
      }

      setWorkflow(nextState)
      saveWorkflow(nextState)
      setSentState({
        quoteId: quotation.id,
        leadId: crm.leadId,
        itineraryId: crm.itineraryId,
        channels: selectedChannels,
        sentAt: nextState.quote.sentAt,
      })
    } catch (err) {
      setSentState(null)
      setError(err instanceof Error ? err.message : 'Quotation could not be created.')
    } finally {
      setSending(false)
    }
  }

  function openQuotations() {
    saveHandoffDraft()
    router.push('/dashboard/quotations')
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="grid lg:grid-cols-[1.02fr_0.98fr] gap-6">
        <div className="glass rounded-[28px] p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Step 4 · Send Quote</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">Create the real NAMA quotation.</h1>
          <p className="text-zinc-400 mt-4">
            Dynamix should shape the holiday, then hand the commercial output into the existing Quotations module so PDFs, payment links, approvals, invoices, and ops all stay in one system.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mt-7">
            {deliveryOptions.map((option) => {
              const isActive = selectedChannels.includes(option.key)
              const Icon = option.icon
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleChannel(option.key)}
                  className={`text-left rounded-[24px] border p-5 transition ${
                    isActive
                      ? 'border-red-600/40 bg-red-600/10 shadow-[0_0_0_1px_rgba(220,38,38,0.15)]'
                      : 'border-white/8 bg-white/5 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-black/25 border border-white/8 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {isActive ? <CheckCircle2 className="w-5 h-5 text-red-300" /> : null}
                  </div>
                  <h2 className="text-lg font-semibold mt-4">{option.title}</h2>
                  <p className="text-sm text-zinc-400 mt-2 leading-6">{option.summary}</p>
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 mt-7">
            <label className="grid gap-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Customer email</span>
              <input
                value={workflow.quote.customerEmail}
                onChange={(event) => updateQuote('customerEmail', event.target.value)}
                className="dynamix-input px-4 py-4 rounded-2xl border text-sm"
                placeholder="client@example.com"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Customer WhatsApp</span>
              <input
                value={workflow.quote.customerWhatsapp}
                onChange={(event) => updateQuote('customerWhatsapp', event.target.value)}
                className="dynamix-input px-4 py-4 rounded-2xl border text-sm"
                placeholder="+91 98xxx xxxxx"
              />
            </label>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">AI message assist</p>
                  <p className="text-sm text-zinc-400 mt-2">Choose the message style, then make your final edits below.</p>
                </div>
                <Sparkles className="w-5 h-5 text-red-300" />
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  ['polished', 'Polished default'],
                  ['concise', 'Concise'],
                  ['premium', 'Premium tone'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => applyMessageTemplate(value)}
                    className="px-4 py-2 rounded-full border border-white/10 bg-black/20 text-sm text-zinc-200 hover:bg-black/30"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="grid gap-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Final message</span>
              <textarea
                value={workflow.quote.message}
                onChange={(event) => updateQuote('message', event.target.value)}
                className="dynamix-input min-h-36 px-4 py-4 rounded-2xl border text-sm"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-6">
          <section className="glass rounded-[28px] p-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Quotations handoff</p>
            <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">Use the existing module, not a duplicate</h2>
            <div className="space-y-3 mt-5">
              {[
                ['Holiday', workflow.selectedHoliday.title],
                ['Sell price', workflow.selectedHoliday.price],
                ['Delivery mode', deliverySummary],
                ['Quotation status', workflow.quote.status === 'sent' ? 'Created in NAMA Quotations' : 'Ready to create'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-3 border-b border-white/8">
                  <span className="text-zinc-400 text-sm">{label}</span>
                  <strong className="text-sm">{value}</strong>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 mt-5">
              <h3 className="font-semibold text-sm mb-2">AI send assist</h3>
              <p className="text-sm text-zinc-300">{sendAssist}</p>
            </div>

            {sentState ? (
              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 mt-5">
                <h3 className="font-semibold text-sm mb-2">Quotation created</h3>
                <p className="text-sm text-zinc-300">Quotation ID: {sentState.quoteId}</p>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 mt-5">
                <h3 className="font-semibold text-sm mb-2">Create check</h3>
                <p className="text-sm text-zinc-300">{error}</p>
              </div>
            ) : null}

            <div className="grid gap-3 mt-6">
              <button
                onClick={createQuotation}
                disabled={sending}
                className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-60"
              >
                {sending ? 'Creating quotation…' : 'Create quotation in NAMA'}
              </button>
              <button
                onClick={openQuotations}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium"
              >
                Open Quotations with Dynamix draft
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push(`/dashboard/leads${workflow.meta?.crm?.leadId ? `?leadId=${workflow.meta.crm.leadId}` : ''}`)}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium"
                >
                  Open Leads
                </button>
                <button
                  onClick={() => router.push(`/dashboard/queries${workflow.meta?.crm?.leadId ? `?leadId=${workflow.meta.crm.leadId}` : ''}`)}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium"
                >
                  Open Queries
                </button>
                <button
                  onClick={() => router.push(`/dashboard/comms${workflow.meta?.crm?.leadId ? `?leadId=${workflow.meta.crm.leadId}` : ''}`)}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium"
                >
                  Open Comms
                </button>
                <button
                  onClick={() => router.push(`/dashboard/documents${workflow.meta?.crm?.bookingId ? `?bookingId=${workflow.meta.crm.bookingId}` : ''}`)}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium"
                >
                  Open Documents
                </button>
              </div>
              {sentState ? (
                <Link href="/dynamix/approval" className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium">
                  Continue to approval
                </Link>
              ) : (
                <button disabled className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white/50 font-medium cursor-not-allowed">
                  Continue to approval
                </button>
              )}
            </div>
          </section>

          <section className="glass rounded-[28px] p-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Existing NAMA ops backbone</p>
            <div className="space-y-3 mt-5">
              {[
                'Quotations already handles send, PDF, and payment link flow.',
                'Bookings already handles confirmation and cancellation states.',
                'Invoices, vouchers, and payments already belong to Finance/Documents.',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-zinc-300">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
