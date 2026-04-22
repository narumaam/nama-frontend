'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, CalendarDays, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react'

import { bookingsApi, paymentsApi } from '@/lib/api'
import { getAiPlaybook } from '@/lib/dynamix-ai-data'
import { loadDynamixQuotationDraft, saveDynamixQuotationDraft } from '@/lib/dynamix-handoff'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixApprovalPage() {
  const router = useRouter()
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [paymentState, setPaymentState] = useState(null)
  const [bookingState, setBookingState] = useState(null)
  const [approvalError, setApprovalError] = useState('')
  const [creatingLink, setCreatingLink] = useState(false)
  const [creatingBooking, setCreatingBooking] = useState(false)
  const aiPlaybook = getAiPlaybook(workflow.aiFlow.categorySlug)
  const approvalTone = workflow.aiFlow.enabled
    ? aiPlaybook.approvalTone
    : 'This is the clean client-facing quote handoff. It should help the client understand what they are getting and what to do next without showing internal NAMA mechanics.'
  const advanceDue = workflow.aiFlow.enabled ? aiPlaybook.approvalAdvance : 'Rs 35,000'
  const itineraryItems = workflow.itinerary?.items || []
  const handoff = loadDynamixQuotationDraft()
  const crm = workflow.meta?.crm || {}

  const shareMode = useMemo(() => {
    const channels = workflow.quote.selectedChannels || []
    if (!channels.length) return 'Not configured'
    return channels.join(' + ')
  }, [workflow.quote.selectedChannels])

  async function createPaymentLink() {
    if (!workflow.quote.quoteId) return

    setCreatingLink(true)
    setApprovalError('')
    try {
      const amount = Number(String(advanceDue).replace(/[^0-9.]/g, '')) || Math.round((Number(String(workflow.selectedHoliday.price).replace(/[^0-9.]/g, '')) || 0) * 0.25)
      const data = await paymentsApi.createLink({
        quotation_id: Number(workflow.quote.quoteId),
        amount,
        description: `Deposit for ${workflow.selectedHoliday.title}`,
        currency: 'INR',
      })

      setPaymentState(data)
      const nextState = {
        ...workflow,
        quote: {
          ...workflow.quote,
          status: 'accepted',
        },
      }
      setWorkflow(nextState)
      saveWorkflow(nextState)
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Payment link could not be created.')
    } finally {
      setCreatingLink(false)
    }
  }

  async function createBooking() {
    const leadId = crm.leadId || handoff?.lead_id
    const itineraryId = crm.itineraryId || handoff?.itinerary_id
    const totalPrice = crm.totalPrice || handoff?.total_price || Number(String(workflow.selectedHoliday.price).replace(/[^0-9.]/g, '')) || 0

    if (!leadId || !itineraryId) {
      setApprovalError('Create the live quotation first so Dynamix can attach a CRM lead and itinerary before booking.')
      return
    }

    setCreatingBooking(true)
    setApprovalError('')
    try {
      const booking = await bookingsApi.create({
        lead_id: Number(leadId),
        itinerary_id: Number(itineraryId),
        total_price: Number(totalPrice),
        currency: crm.currency || handoff?.currency || 'INR',
        idempotency_key: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `dynamix-${Date.now()}`,
      })

      setBookingState(booking)
      const nextState = {
        ...workflow,
        meta: {
          ...workflow.meta,
          crm: {
            ...crm,
            leadId: Number(leadId),
            itineraryId: Number(itineraryId),
            quotationId: crm.quotationId || handoff?.quotation_id,
            bookingId: booking.id,
            totalPrice: Number(totalPrice),
            currency: crm.currency || handoff?.currency || 'INR',
          },
        },
      }
      setWorkflow(nextState)
      saveWorkflow(nextState)

      if (handoff) {
        saveDynamixQuotationDraft({
          ...handoff,
          lead_id: Number(leadId),
          itinerary_id: Number(itineraryId),
          quotation_id: crm.quotationId || handoff?.quotation_id,
          booking_id: booking.id,
          total_price: Number(totalPrice),
          currency: crm.currency || handoff?.currency || 'INR',
        })
      }
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Booking could not be created.')
    } finally {
      setCreatingBooking(false)
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="grid gap-6">
          <section className="glass rounded-[28px] p-8 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Step 5 · Client Approval</p>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">{workflow.selectedHoliday.title}</h1>
            <p className="text-zinc-400 mt-4 max-w-3xl">{approvalTone}</p>

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-7">
              {[
                ['Travel dates', `${workflow.query.startDate} to ${workflow.query.endDate}`, CalendarDays],
                ['Guests', workflow.query.pax, BadgeCheck],
                ['Quotation reference', workflow.quote.quoteId || 'Create from send step', ShieldCheck],
                ['Advance due', advanceDue, CreditCard],
              ].map(([label, value, Icon]) => (
                <div key={label} className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                  <Icon className="w-5 h-5 text-red-300" />
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mt-4">{label}</p>
                  <p className="text-base font-semibold mt-2">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-[28px] p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Client-facing trip flow</p>
                <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">What the client is approving</h2>
              </div>
              <p className="text-sm text-zinc-400">The itinerary should feel curated, not overloaded.</p>
            </div>

            <div className="space-y-4 mt-6">
              {(itineraryItems.length ? itineraryItems : [
                { day: 'D1', title: 'Arrival and settle-in', summary: 'Smooth arrival, check-in, and first-evening ease.' },
                { day: 'D2', title: 'Core sightseeing', summary: 'One strong day that makes the destination feel real.' },
                { day: 'D3', title: 'Flexible signature day', summary: 'A curated day that carries the strongest emotional value.' },
              ]).map((item) => (
                <div key={`${item.day}-${item.title}`} className="grid grid-cols-[48px_1fr] gap-4 rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-600/20 flex items-center justify-center text-xs font-mono">
                    {item.day}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm text-zinc-400 mt-2 leading-6">{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-[28px] p-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Real NAMA follow-through</p>
            <div className="grid md:grid-cols-3 gap-4 mt-5">
              {[
                'Payment link creation stays in the existing NAMA payment flow.',
                'Once confirmed, use Bookings for confirmation status, cancellations, and ops.',
                'Invoices, vouchers, and document delivery stay in Finance and Documents.',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-zinc-300 leading-6">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="glass rounded-[28px] p-8 h-fit">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Approval + payment</p>
          <div className="space-y-3 mt-5">
            {[
              ['Holiday price', workflow.selectedHoliday.price],
              ['Advance due today', advanceDue],
              ['Share mode', shareMode],
              ['Quote reference', workflow.quote.quoteId || 'Create quotation first'],
            ].map(([label, value], idx) => (
              <div key={label} className={`flex items-center justify-between gap-3 py-3 ${idx < 3 ? 'border-b border-white/8' : ''}`}>
                <span className="text-zinc-400 text-sm">{label}</span>
                <strong className={`${idx === 1 ? 'text-lg' : 'text-sm'} font-semibold text-right`}>{value}</strong>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 mt-6">
            <h3 className="font-semibold text-sm mb-2">What happens after approval</h3>
            <p className="text-sm text-zinc-300">Create the payment link here, then continue the operational lifecycle in Quotations, Bookings, Finance, and Documents.</p>
          </div>

          {paymentState ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 mt-4">
              <h3 className="font-semibold text-sm mb-2">Payment link ready</h3>
              <a href={paymentState.payment_link_url} target="_blank" rel="noreferrer" className="text-sm text-white underline break-all">
                {paymentState.payment_link_url}
              </a>
            </div>
          ) : null}

          {bookingState ? (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 mt-4">
              <h3 className="font-semibold text-sm mb-2">Booking created in NAMA</h3>
              <p className="text-sm text-zinc-300">Booking ID: {bookingState.id}</p>
            </div>
          ) : null}

          {approvalError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 mt-4">
              <h3 className="font-semibold text-sm mb-2">Approval check</h3>
              <p className="text-sm text-zinc-300">{approvalError}</p>
            </div>
          ) : null}

          <div className="grid gap-3 mt-6">
            <button
              onClick={createBooking}
              disabled={creatingBooking}
              className="px-5 py-3 rounded-2xl bg-white text-black hover:bg-zinc-200 font-semibold disabled:opacity-60"
            >
              {creatingBooking ? 'Creating booking…' : 'Create booking in NAMA'}
            </button>
            <button
              onClick={createPaymentLink}
              disabled={!workflow.quote.quoteId || creatingLink}
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-60"
            >
              {creatingLink ? 'Creating payment link…' : 'Create payment link'}
            </button>
            <button
              onClick={() => router.push('/dashboard/quotations')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium"
            >
              Open Quotations <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/dashboard/bookings')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium"
            >
              Open Bookings <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/dashboard/finance')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium"
            >
              Open Finance <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}
