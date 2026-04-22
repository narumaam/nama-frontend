'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GripVertical, MoveDown, MoveUp } from 'lucide-react'

import {
  dynamixAi,
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

export default function DynamixBuilderPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const initialWorkflow = useMemo(() => loadWorkflow() || defaultWorkflow, [])
  const initialPlaybook = getAiPlaybook(initialWorkflow.aiFlow.categorySlug)
  const [myMarkup, setMyMarkup] = useState(
    () => initialWorkflow?.quote?.markup || (initialWorkflow.aiFlow.enabled ? initialPlaybook.markupSuggestion : 'Rs 14,120 per person')
  )
  const [finalPrice, setFinalPrice] = useState(
    () => loadWorkflow()?.selectedHoliday?.price || defaultWorkflow.selectedHoliday.price
  )
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)

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
  const pricingSuggestion = workflow.aiFlow.enabled ? aiPlaybook.pricingAdvice : dynamixAi.pricing
  const weather = getWeatherForDestination(safeDestination)

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
    const nextState = {
      selectedHoliday: {
        ...workflow.selectedHoliday,
        price: workflow.selectedHoliday.price || selectedPackage?.price || '',
      },
      quote: {
        ...workflow.quote,
        markup: value,
      },
    }

    persistWorkflow(nextState)
    setFinalPrice(nextState.selectedHoliday.price)
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
      <section className="glass rounded-[28px] p-8 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Package details</p>
        <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 mt-3 items-end">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPackage.badges.map((badge) => (
                <span key={badge} className="px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.12em] text-zinc-300">
                  {badge}
                </span>
              ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
              {selectedPackage.title}
            </h1>
            <p className="text-zinc-400 mt-4 max-w-3xl">{selectedPackage.summary}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Trip summary</p>
            <div className="grid gap-3 mt-4 text-sm">
              {[
                ['Destination', safeDestination],
                ['Travel dates', formatTripDates(workflow.query.startDate, workflow.query.endDate)],
                ['No. of days', workflow.query.duration],
                ['Travellers', workflow.query.pax],
                ['Package type', workflow.query.packageType],
                ['Price', selectedPackage.price],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-white/8 py-2">
                  <span className="text-zinc-400">{label}</span>
                  <strong className="text-white text-right">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 mb-6">
        <div className="glass rounded-[28px] p-6 overflow-hidden">
          <div className="grid md:grid-cols-[1.35fr_0.65fr] gap-3">
            <div className="rounded-[24px] min-h-[340px] bg-[linear-gradient(135deg,rgba(38,94,170,0.95),rgba(229,9,20,0.45))] p-6 flex items-end">
              <div className="max-w-md rounded-2xl bg-black/30 backdrop-blur px-5 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-200">{destinationDetails.heroLabel}</p>
                <p className="text-2xl font-semibold text-white mt-2">{safeDestination}</p>
                <p className="text-sm text-zinc-200/80 mt-3 leading-6">{destinationDetails.heroSummary}</p>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[24px] min-h-[164px] bg-[linear-gradient(135deg,rgba(148,101,53,0.85),rgba(229,9,20,0.35))] p-5 flex items-end">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-200">Weather-fit</p>
                  <p className="text-sm text-white mt-2 leading-6">{weather.summary}</p>
                </div>
              </div>
              <div className="rounded-[24px] min-h-[164px] bg-[linear-gradient(135deg,rgba(86,102,122,0.85),rgba(255,255,255,0.16))] p-5 flex items-end">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-200">Why this works</p>
                  <p className="text-sm text-white mt-2 leading-6">
                    {workflow.aiFlow.enabled
                      ? aiPlaybook.sendMessage.replaceAll('Bali', safeDestination)
                      : `This ${safeDestination} route matches the selected travel window and keeps the package clean to sell.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <section className="glass rounded-[28px] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Highlights</p>
            <div className="grid gap-3 mt-4">
              {destinationDetails.tripHighlights.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-[28px] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Commercial snapshot</p>
            <div className="grid gap-4 mt-4">
              <div>
                <h2 className="text-lg font-semibold">Pricing guidance</h2>
                <p className="text-sm text-zinc-400 mt-2 leading-6">{pricingSuggestion}</p>
              </div>
              <label className="grid gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">My markup</span>
                <input
                  value={myMarkup}
                  onChange={(event) => applyMarkup(event.target.value)}
                  className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
                />
              </label>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">Current sell price</span>
                  <strong className="text-lg text-white">{finalPrice}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="glass rounded-[28px] p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Itinerary</p>
            <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">Day-wise trip flow</h2>
            <p className="text-sm text-zinc-400 mt-2">Reorder if needed, but keep the package readable and client-friendly.</p>
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
              className={`grid grid-cols-[42px_1fr_auto] gap-4 p-4 rounded-2xl border transition-colors ${
                dropIndex === index ? 'border-red-500/60 bg-red-500/10' : 'bg-white/5 border-white/8'
              } ${draggedIndex === index ? 'opacity-70' : ''}`}
            >
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-white text-xs font-mono flex items-center justify-center">{item.day}</div>
              <div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-6 mt-2">{item.summary}</p>
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
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mb-6">
        <section className="glass rounded-[28px] p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Inclusions</p>
          <div className="grid gap-3 mt-4">
            {destinationDetails.inclusions.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-[28px] p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Trust and delivery</p>
          <div className="grid gap-4 mt-4">
            {[
              ...destinationDetails.trustNotes,
              'Dynamix should hand off into the existing NAMA quotation and booking modules.',
              'No duplicate booking or payment flow should be created here.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-zinc-300 leading-6">
                {item}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="glass rounded-[28px] p-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Actions</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          <Link
            href="/dashboard/bookings"
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
