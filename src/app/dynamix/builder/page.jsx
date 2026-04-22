'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GripVertical, MoveDown, MoveUp, Plus, X } from 'lucide-react'

import {
  dynamixAi,
  getActivityLibrary,
  getBuilderItinerary,
  getDestinationPackageBundle,
  getPackageBySlug,
  getWeatherForDestination,
} from '@/lib/dynamix-data'
import { getAiPlaybook } from '@/lib/dynamix-ai-data'
import { defaultWorkflow, loadWorkflow, normalizeItineraryItems, saveWorkflow } from '@/lib/dynamix-workflow'

function formatTripDates(startDate, endDate) {
  if (!startDate && !endDate) return 'Dates to be confirmed'
  return `${startDate || 'TBC'} to ${endDate || 'TBC'}`
}

function parsePriceValue(priceLabel = '') {
  return Number(String(priceLabel).replace(/[^0-9.]/g, '')) || 0
}

function formatMoney(value, fallbackCurrency = 'INR') {
  if (!value) return 'Price on request'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: fallbackCurrency,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function DynamixBuilderPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const initialWorkflow = useMemo(() => loadWorkflow() || defaultWorkflow, [])
  const initialPlaybook = getAiPlaybook(initialWorkflow.aiFlow.categorySlug)
  const [myMarkup, setMyMarkup] = useState(
    () => initialWorkflow?.quote?.markup || (initialWorkflow.aiFlow.enabled ? initialPlaybook.markupSuggestion : 'Rs 14,120 per person')
  )
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const [activeDayIndex, setActiveDayIndex] = useState(0)

  const aiPlaybook = getAiPlaybook(workflow.aiFlow.categorySlug)
  const destination = workflow.query.destination || 'Bali'
  const { normalizedDestination, destinationDetails, packages } = getDestinationPackageBundle(destination)
  const selectedFromSlug = getPackageBySlug(destination, workflow.selectedHoliday.slug).selectedPackage
  const selectedPackage = selectedFromSlug || packages[0] || null
  const safeDestination = normalizedDestination || destination.trim() || 'your destination'
  const itinerarySource = workflow.aiFlow.enabled ? `ai:${workflow.aiFlow.categorySlug || 'default'}` : 'classic'
  const baseItinerary = workflow.aiFlow.enabled ? aiPlaybook.itinerary : getBuilderItinerary(safeDestination)
  const itineraryItems =
    workflow.itinerary?.items?.length && workflow.itinerary?.source === itinerarySource
      ? normalizeItineraryItems(workflow.itinerary.items)
      : normalizeItineraryItems(baseItinerary)
  const activeDay = itineraryItems[activeDayIndex] || itineraryItems[0] || null
  const pricingSuggestion = workflow.aiFlow.enabled ? aiPlaybook.pricingAdvice : dynamixAi.pricing
  const weather = getWeatherForDestination(safeDestination)
  const activityLibrary = getActivityLibrary(safeDestination)
  const crm = workflow.meta?.crm || {}
  const basePrice = parsePriceValue(selectedPackage?.price)
  const markupValue = parsePriceValue(myMarkup)
  const sellPrice = crm.totalPrice || basePrice + markupValue
  const currency = crm.currency || 'INR'
  const bookHref = workflow.quote?.quoteId ? '/dynamix/approval' : '/dynamix/send'

  function persistWorkflow(partialState = {}) {
    const nextState = {
      ...workflow,
      ...partialState,
    }

    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  function applyMarkup(value) {
    setMyMarkup(value)
    persistWorkflow({
      quote: {
        ...workflow.quote,
        markup: value,
      },
    })
  }

  function persistItinerary(items) {
    const normalizedItems = normalizeItineraryItems(items)
    persistWorkflow({
      itinerary: {
        items: normalizedItems,
        source: itinerarySource,
      },
    })
  }

  function moveItem(fromIndex, toIndex) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= itineraryItems.length ||
      toIndex >= itineraryItems.length
    ) {
      return
    }

    const nextItems = [...itineraryItems]
    const [movedItem] = nextItems.splice(fromIndex, 1)
    nextItems.splice(toIndex, 0, movedItem)
    persistItinerary(nextItems)
    setActiveDayIndex(toIndex)
  }

  function handleDragStart(index) {
    setDraggedIndex(index)
    setDropIndex(index)
  }

  function handleDrop(targetIndex) {
    if (draggedIndex === null) return
    moveItem(draggedIndex, targetIndex)
    setDraggedIndex(null)
    setDropIndex(null)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDropIndex(null)
  }

  function addActivityToDay(activity, dayIndex) {
    const nextItems = itineraryItems.map((item, index) => {
      if (index !== dayIndex) return item
      const currentActivities = item.activities || []
      if (currentActivities.some((entry) => entry.slug === activity.slug)) return item
      return {
        ...item,
        activities: [...currentActivities, activity],
      }
    })
    persistItinerary(nextItems)
    setActiveDayIndex(dayIndex)
  }

  function removeActivity(dayIndex, activitySlug) {
    const nextItems = itineraryItems.map((item, index) => {
      if (index !== dayIndex) return item
      return {
        ...item,
        activities: (item.activities || []).filter((entry) => entry.slug !== activitySlug),
      }
    })
    persistItinerary(nextItems)
  }

  if (!selectedPackage || !destinationDetails) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="glass rounded-[28px] p-8 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Package details</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">
            Sorry, there are no packages for {safeDestination}!
          </h1>
          <p className="text-zinc-400 mt-4 max-w-3xl">
            Thank you for finding this booper, an email is being triggered to the product manager. Go back to page 1 to pick a supported destination before continuing to booking or quotation steps.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/dynamix" className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold">
              Back to Dynamix
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="glass rounded-[30px] p-8 md:p-10 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]">
        <div className="flex flex-wrap gap-2 mb-5">
          {selectedPackage.badges.map((badge) => (
            <span key={badge} className="px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.12em] text-zinc-300">
              {badge}
            </span>
          ))}
        </div>
        <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Package detail</p>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">{selectedPackage.title}</h1>
            <p className="text-zinc-400 mt-4 max-w-3xl leading-7">{selectedPackage.summary}</p>

            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {(destinationDetails.heroMedia || []).map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] min-h-[240px] p-6 flex items-end border border-white/8 bg-[linear-gradient(145deg,rgba(38,94,170,0.8),rgba(229,9,20,0.32))]"
                >
                  <div className="rounded-2xl bg-black/30 backdrop-blur px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-200">{item.eyebrow}</p>
                    <h2 className="text-2xl font-display font-semibold mt-2">{item.title}</h2>
                    <p className="text-sm text-zinc-200/80 mt-3 leading-6">{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/8 bg-black/20 p-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Trip summary</p>
              <div className="grid gap-3 mt-4 text-sm">
                {[
                  ['Destination', safeDestination],
                  ['Travel dates', formatTripDates(workflow.query.startDate, workflow.query.endDate)],
                  ['No. of days', workflow.query.duration],
                  ['Travellers', workflow.query.pax],
                  ['Package type', workflow.query.packageType],
                  ['Weather fit', weather.summary],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-white/8 py-3">
                    <span className="text-zinc-400">{label}</span>
                    <strong className="text-right text-white max-w-[60%]">{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Commercial snapshot</p>
              <div className="grid gap-4 mt-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-300">Current sell price</p>
                    <h2 className="text-3xl font-display font-bold tracking-tight mt-1">{formatMoney(sellPrice, currency)}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Base package</p>
                    <p className="text-sm font-semibold">{selectedPackage.price}</p>
                  </div>
                </div>
                <label className="grid gap-2">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">My markup</span>
                  <input
                    value={myMarkup}
                    onChange={(event) => applyMarkup(event.target.value)}
                    className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
                  />
                </label>
                <p className="text-sm text-zinc-300 leading-6">{pricingSuggestion}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="glass rounded-[28px] p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Highlights</p>
          <div className="grid gap-3 mt-4">
            {destinationDetails.tripHighlights.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[28px] p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Inclusions</p>
          <div className="grid gap-3 mt-4">
            {destinationDetails.inclusions.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[28px] p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Exclusions</p>
          <div className="grid gap-3 mt-4">
            {(destinationDetails.exclusions || []).map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass rounded-[30px] p-6 md:p-8 mt-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Itinerary</p>
            <h2 className="text-3xl font-display font-semibold tracking-tight mt-2">Customize the day-wise trip flow</h2>
            <p className="text-sm text-zinc-400 mt-2 leading-6">
              Keep the drag and drop structure, then layer optional activities the way an agent would co-build a custom holiday with the traveller.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {itineraryItems.map((item, index) => (
              <button
                key={`${item.day}-${item.title}`}
                type="button"
                onClick={() => setActiveDayIndex(index)}
                className={`px-4 py-2 rounded-full border text-sm transition ${
                  index === activeDayIndex
                    ? 'border-red-600/30 bg-red-600/10 text-white'
                    : 'border-white/8 bg-white/5 text-zinc-300 hover:bg-white/8'
                }`}
              >
                {item.day}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 mt-6">
          {itineraryItems.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => {
                event.preventDefault()
                if (dropIndex !== index) setDropIndex(index)
              }}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`rounded-[26px] border p-5 transition-colors ${
                dropIndex === index ? 'border-red-500/60 bg-red-500/10' : 'bg-white/5 border-white/8'
              } ${draggedIndex === index ? 'opacity-70' : ''}`}
            >
              <div className="grid lg:grid-cols-[52px_1fr_auto] gap-4 items-start">
                <button
                  type="button"
                  onClick={() => setActiveDayIndex(index)}
                  className={`w-12 h-12 rounded-2xl text-xs font-mono flex items-center justify-center ${
                    index === activeDayIndex ? 'bg-red-600 text-white' : 'bg-red-600/20 text-white'
                  }`}
                >
                  {item.day}
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <button
                      type="button"
                      onClick={() => setActiveDayIndex(index)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-black/20 text-xs uppercase tracking-[0.12em] text-zinc-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add activity
                    </button>
                  </div>
                  <p className="text-zinc-400 text-sm leading-6 mt-3">{item.summary}</p>
                  {(item.activities || []).length ? (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {item.activities.map((activity) => (
                        <div key={activity.slug} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div>
                              <p className="font-semibold text-white">{activity.title}</p>
                              <p className="text-zinc-400 text-xs mt-1">{activity.timing} · {activity.price}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeActivity(index, activity.slug)}
                              className="text-zinc-500 hover:text-white"
                              aria-label={`Remove ${activity.title}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-zinc-500 cursor-grab active:cursor-grabbing" aria-hidden="true">
                    <GripVertical className="w-5 h-5" />
                  </span>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => moveItem(index, index - 1)}
                      disabled={index === 0}
                      className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Move ${item.title} up`}
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, index + 1)}
                      disabled={index === itineraryItems.length - 1}
                      className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Move ${item.title} down`}
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activeDay ? (
          <div className="mt-8 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Add activity</p>
                <h3 className="text-2xl font-display font-semibold tracking-tight mt-2">
                  Layer optional experiences into {activeDay.day}
                </h3>
                <p className="text-sm text-zinc-400 mt-2 leading-6">
                  Inspired by the smoother custom-tour pattern: pick the day first, then add only the experiences that improve the story, close rate, or value perception.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-zinc-200">
                Active day: <strong>{activeDay.title}</strong>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
              {activityLibrary.map((activity) => {
                const alreadyAdded = (activeDay.activities || []).some((entry) => entry.slug === activity.slug)
                return (
                  <div key={activity.slug} className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(activity.tags || []).map((tag) => (
                        <span key={tag} className="px-3 py-1.5 rounded-full border border-white/8 bg-black/20 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h4 className="text-lg font-semibold">{activity.title}</h4>
                    <p className="text-sm text-zinc-400 mt-2 leading-6">{activity.summary}</p>
                    <div className="flex items-center justify-between gap-3 mt-5 text-sm">
                      <span className="text-zinc-300">{activity.timing}</span>
                      <strong>{activity.price}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => addActivityToDay(activity, activeDayIndex)}
                      disabled={alreadyAdded}
                      className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      {alreadyAdded ? 'Already added' : `Add to ${activeDay.day}`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="glass rounded-[28px] p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Trust + commercial info</p>
          <div className="grid gap-4 mt-4">
            {[
              ...(destinationDetails.trustNotes || []),
              ...(destinationDetails.commercialNotes || []),
              weather.salesHint,
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-zinc-300 leading-6">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[28px] p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Connected NAMA flow</p>
          <div className="grid gap-4 mt-4">
            {[
              `Quotation handoff: ${workflow.quote?.quoteId ? `Quote #${workflow.quote.quoteId} created` : 'Ready to create from Send Quote'}`,
              `Bookings handoff: ${crm.bookingId ? `Booking #${crm.bookingId} connected` : 'Book action routes into the live Dynamix approval and booking path'}`,
              `Publish handoff: Quotations module remains the source of truth for PDFs, approvals, and commercial follow-through.`,
              `Documents + finance: Once booking exists, confirmations, vouchers, invoices, and finance continue inside the existing NAMA modules rather than a duplicate Dynamix stack.`,
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-zinc-300 leading-6">
                {item}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/dashboard/bookings" className="inline-flex items-center justify-center px-4 py-3 rounded-2xl border border-white/10 bg-black/20 text-sm text-white font-medium hover:bg-black/30">
              Open Bookings
            </Link>
            <Link href="/dashboard/documents" className="inline-flex items-center justify-center px-4 py-3 rounded-2xl border border-white/10 bg-black/20 text-sm text-white font-medium hover:bg-black/30">
              Open Documents
            </Link>
            <Link href="/dashboard/finance" className="inline-flex items-center justify-center px-4 py-3 rounded-2xl border border-white/10 bg-black/20 text-sm text-white font-medium hover:bg-black/30">
              Open Finance
            </Link>
          </div>
        </div>
      </section>

      <section className="glass rounded-[28px] p-6 mt-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Actions</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          <Link
            href={bookHref}
            className="inline-flex items-center justify-center px-5 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold"
          >
            Book
          </Link>
          <Link
            href="/dynamix/send"
            className="inline-flex items-center justify-center px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10"
          >
            Send quote
          </Link>
          <Link
            href="/dashboard/comms"
            className="inline-flex items-center justify-center px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10"
          >
            WhatsApp
          </Link>
          <Link
            href="/dashboard/quotations"
            className="inline-flex items-center justify-center px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10"
          >
            Publish
          </Link>
        </div>
      </section>
    </main>
  )
}
