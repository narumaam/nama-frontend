'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, Briefcase, FileText, Inbox, MessageCircle, Receipt, Sparkles, Users } from 'lucide-react'

import { loadDynamixQuotationDraft } from '@/lib/dynamix-handoff'

const MODULE_LINKS = [
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/queries', label: 'Queries', icon: Inbox },
  { href: '/dashboard/quotations', label: 'Quotations', icon: FileText },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Briefcase },
  { href: '/dashboard/documents', label: 'Documents', icon: Receipt },
  { href: '/dashboard/comms', label: 'Comms', icon: MessageCircle },
]

export default function DynamixHandoffBanner({
  moduleLabel,
}: {
  moduleLabel: string
}) {
  const handoff = useMemo(() => loadDynamixQuotationDraft(), [])

  if (!handoff) return null

  const refs = [
    handoff.lead_id ? `Lead #${handoff.lead_id}` : null,
    handoff.itinerary_id ? `Itinerary #${handoff.itinerary_id}` : null,
    handoff.quotation_id ? `Quote #${handoff.quotation_id}` : null,
    handoff.booking_id ? `Booking #${handoff.booking_id}` : null,
  ].filter(Boolean)

  const queryString = new URLSearchParams(
    Object.entries({
      leadId: handoff.lead_id ? String(handoff.lead_id) : '',
      itineraryId: handoff.itinerary_id ? String(handoff.itinerary_id) : '',
      quotationId: handoff.quotation_id ? String(handoff.quotation_id) : '',
      bookingId: handoff.booking_id ? String(handoff.booking_id) : '',
      destination: handoff.destination || '',
    }).filter(([, value]) => value)
  ).toString()

  return (
    <div className="rounded-2xl border border-red-200/70 bg-[linear-gradient(135deg,rgba(220,38,38,0.08),rgba(20,184,166,0.08))] px-5 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">
            <Sparkles className="h-3.5 w-3.5" />
            Dynamix Handoff Active
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {handoff.holiday_title || handoff.destination || 'Dynamix trip'} is ready inside {moduleLabel}.
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Continue the same booking lifecycle here instead of rebuilding the trip in a separate flow.
          </p>
          {refs.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {refs.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {MODULE_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={queryString ? `${href}?${queryString}` : href}
              className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Link
            href="/dynamix/approval"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            Back to Dynamix
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
