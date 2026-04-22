'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CheckCircle2, Mail, MessageCircle, Sparkles } from 'lucide-react'

import { quotationsApi } from '@/lib/api'
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
    })
  }

  async function createQuotation() {
    setSending(true)
    setError('')
    try {
      const basePrice = Number(String(workflow.selectedHoliday.price).replace(/[^0-9.]/g, '')) || 0
      const rawMarkup = Number(String(workflow.quote.markup || '').replace(/[^0-9.]/g, '')) || 20
      const quotation = await quotationsApi.create({
        lead_name: workflow.quote.customerEmail?.split('@')[0] || workflow.query.travelerType || 'Dynamix Client',
        destination: workflow.selectedHoliday.title,
        base_price: basePrice,
        margin_pct: Math.min(rawMarkup > 100 ? 20 : rawMarkup || 20, 100),
        currency: 'INR',
        notes: workflow.quote.message || undefined,
      })

      const nextState = {
        ...workflow,
        quote: {
          ...workflow.quote,
          status: 'sent',
          quoteId: String(quotation.id),
          sentAt: new Date().toISOString(),
        },
      }

      setWorkflow(nextState)
      saveWorkflow(nextState)
      setSentState({
        quoteId: quotation.id,
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
                className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
                placeholder="client@example.com"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Customer WhatsApp</span>
              <input
                value={workflow.quote.customerWhatsapp}
                onChange={(event) => updateQuote('customerWhatsapp', event.target.value)}
                className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
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
                className="min-h-36 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
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
