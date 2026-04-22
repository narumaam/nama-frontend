'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoveDown,
  MoveUp,
  Plus,
  Star,
  X,
} from 'lucide-react'

import {
  getActivityLibrary,
  getBuilderItinerary,
  getDestinationPackageBundle,
  getPackageBySlug,
} from '@/lib/dynamix-data'
import { defaultWorkflow, loadWorkflow, normalizeItineraryItems, saveWorkflow } from '@/lib/dynamix-workflow'

const singaporeMedia = {
  main: 'https://source.unsplash.com/1600x1200/?singapore,marina-bay',
  cruise: 'https://source.unsplash.com/1200x900/?singapore,cruise',
  universal: 'https://source.unsplash.com/1200x900/?singapore,universal-studios',
  travellerOne: 'https://source.unsplash.com/1200x900/?singapore,chinatown',
  travellerTwo: 'https://source.unsplash.com/1200x900/?singapore,night',
  travellerThree: 'https://source.unsplash.com/1200x900/?singapore,gardens-by-the-bay',
  videoPoster: 'https://source.unsplash.com/1600x1200/?singapore,skyline,night',
}

const whyNama = [
  {
    title: '1,20,000+ Itinerary Moments Shaped',
    detail: 'Across fast-close city breaks, cruise combos, honeymoons, and family trips over the last decade.',
  },
  {
    title: '90,000+ Holidays Designed',
    detail: 'From premium getaways to practical family plans, customized around the traveller instead of a rigid package template.',
  },
  {
    title: 'Rated 4.7★ by Travellers',
    detail: 'Thousands of real guest reviews from people who booked, travelled, and came back wanting to plan the next one.',
  },
  {
    title: '24×7 Human Support',
    detail: 'On-trip help when it matters. Real people, quick escalation, and clear support during the holiday.',
  },
]

function formatTripDates(startDate, endDate) {
  if (!startDate && !endDate) return 'Dates to be confirmed'
  return `${startDate || 'TBC'} to ${endDate || 'TBC'}`
}

function parsePriceValue(priceLabel = '') {
  return Number(String(priceLabel).replace(/[^0-9.]/g, '')) || 0
}

function formatMoney(value, currency = 'INR') {
  if (!value) return 'Price on request'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function buildRouteItems(destination, selectedPackageTitle) {
  if (destination === 'Singapore') {
    return [
      'Arrival at SIN',
      'Singapore Cruise',
      'Transfer by car',
      'Singapore',
      'Departure at SIN',
    ]
  }

  return [
    `Arrival at ${destination}`,
    selectedPackageTitle,
    'Transfer by private vehicle',
    destination,
    `Departure from ${destination}`,
  ]
}

export default function DynamixBuilderPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const [activeDayIndex, setActiveDayIndex] = useState(1)

  const destination = workflow.query.destination || 'Singapore'
  const { normalizedDestination, destinationDetails, packages } = getDestinationPackageBundle(destination)
  const selectedFromSlug = getPackageBySlug(destination, workflow.selectedHoliday.slug).selectedPackage
  const selectedPackage = selectedFromSlug || packages[0] || null
  const safeDestination = normalizedDestination || destination.trim() || 'Singapore'
  const itinerarySource = workflow.aiFlow.enabled ? `ai:${workflow.aiFlow.categorySlug || 'default'}` : 'classic'
  const baseItinerary = getBuilderItinerary(safeDestination)
  const itineraryItems =
    workflow.itinerary?.items?.length && workflow.itinerary?.source === itinerarySource
      ? normalizeItineraryItems(workflow.itinerary.items)
      : normalizeItineraryItems(baseItinerary)
  const activityLibrary = getActivityLibrary(safeDestination)
  const activeDay = itineraryItems[activeDayIndex] || itineraryItems[1] || itineraryItems[0] || null
  const routeItems = useMemo(() => buildRouteItems(safeDestination, selectedPackage?.title || 'Holiday route'), [safeDestination, selectedPackage?.title])
  const basePrice = parsePriceValue(selectedPackage?.price)
  const markupValue = parsePriceValue(workflow.quote?.markup || '14000')
  const sellPrice = basePrice + markupValue

  function persistWorkflow(partialState = {}) {
    const nextState = {
      ...workflow,
      ...partialState,
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  function persistItinerary(items) {
    persistWorkflow({
      itinerary: {
        items: normalizeItineraryItems(items),
        source: itinerarySource,
      },
    })
  }

  function moveItem(fromIndex, toIndex) {
    if (fromIndex === 0 || toIndex === 0) return
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
    if (index === 0) return
    setDraggedIndex(index)
    setDropIndex(index)
  }

  function handleDrop(targetIndex) {
    if (draggedIndex === null || targetIndex === 0) return
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
      return { ...item, activities: [...currentActivities, activity] }
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
            Please head back to Dynamix and pick a supported destination before continuing.
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
    <main className="max-w-7xl mx-auto px-6 pb-12">
      <section className="pt-2">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          {workflow.query.duration || '6 nights'} to {selectedPackage.title}
        </h1>
        <div className="mt-5 border-b border-white/8 flex items-center gap-8 overflow-x-auto">
          {['Your Trip', 'Inclusions', 'Reviews'].map((tab, index) => (
            <button
              key={tab}
              className={`inline-flex items-center gap-2 py-3 text-sm whitespace-nowrap ${index === 0 ? 'text-white border-b-2 border-red-600' : 'text-zinc-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-[1fr_360px] gap-8 mt-6">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr_0.9fr] gap-3">
            <div
              className="h-[340px] md:h-[360px] border border-white/8 rounded-[20px] relative overflow-hidden bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(155deg,rgba(12,18,30,0.2),rgba(12,18,30,0.4)),url(${singaporeMedia.main})` }}
            >
              <div className="absolute inset-x-0 bottom-0 p-5 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4" />
                </span>
                <span className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
            <div className="grid grid-rows-2 gap-3">
              <div
                className="h-[168px] md:h-[174px] border border-white/8 rounded-[20px] bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(145deg,rgba(14,165,233,0.2),rgba(29,78,216,0.35)),url(${singaporeMedia.cruise})` }}
              />
              <div
                className="h-[168px] md:h-[174px] border border-white/8 rounded-[20px] bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(145deg,rgba(245,158,11,0.2),rgba(220,38,38,0.35)),url(${singaporeMedia.universal})` }}
              />
            </div>
            <div
              className="h-[340px] md:h-[360px] border border-white/8 rounded-[20px] relative overflow-hidden bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(145deg,rgba(15,23,42,0.55),rgba(71,85,105,0.35)),url(${singaporeMedia.videoPoster})` }}
            >
              <video
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                poster={singaporeMedia.videoPoster}
              >
                <source src="https://cdn.coverr.co/videos/coverr-singapore-skyline-1561881475775?download=1080p" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="8,5 19,12 8,19" /></svg>
                </div>
              </div>
              <div className="absolute bottom-16 left-4 right-4 px-3 py-2 rounded-xl bg-emerald-500/80 backdrop-blur text-xs font-semibold text-white shadow-lg">
                Singapore in motion
              </div>
              <button className="absolute bottom-4 right-4 px-3 py-2 rounded-xl bg-black/60 backdrop-blur text-xs font-semibold text-white border border-white/20">
                View all media
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold">Why choose NAMA?</h3>
            <div className="grid sm:grid-cols-2 gap-5 mt-4">
              {whyNama.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-600/25 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-red-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-zinc-300 mt-1 leading-5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Itinerary</h2>

            <div className="mt-5 rounded-[22px] overflow-hidden border border-white/8 bg-white/[0.02]">
              <div className="px-5 py-3 flex items-center gap-2 bg-[linear-gradient(90deg,rgba(220,38,38,0.18),rgba(220,38,38,0.04))] border-b border-red-600/20">
                <span className="font-display font-semibold">{safeDestination}</span>
                <span className="text-zinc-400 text-sm">— {itineraryItems.length} Days</span>
              </div>

              {itineraryItems.map((item, index) => {
                const isDayOne = index === 0
                const activities = item.activities || []
                const isActive = index === activeDayIndex
                return (
                  <div
                    key={`${item.day}-${item.title}`}
                    draggable={!isDayOne}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (dropIndex !== index) setDropIndex(index)
                    }}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    className={`grid grid-cols-[72px_1fr] border-t border-white/8 ${dropIndex === index ? 'bg-red-500/10' : ''}`}
                  >
                    <div className="bg-black/30 border-r border-white/8 p-4 flex flex-col items-center gap-3">
                      <span className="text-[10px] tracking-[0.18em] uppercase text-zinc-400 font-mono">{item.day}</span>
                      {isDayOne ? (
                        <span className="text-[10px] text-zinc-500 font-mono">Locked</span>
                      ) : (
                        <span className="text-zinc-500 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{item.title}</p>
                          <p className="text-sm mt-2 leading-6 text-zinc-300">{item.summary}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveDayIndex(index)}
                            className="text-red-400 hover:text-red-300 font-medium text-sm inline-flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Add Activity
                          </button>
                          {!isDayOne ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveItem(index, index - 1)}
                                disabled={index <= 1}
                                className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 disabled:opacity-40"
                              >
                                <MoveUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveItem(index, index + 1)}
                                disabled={index === itineraryItems.length - 1}
                                className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 disabled:opacity-40"
                              >
                                <MoveDown className="w-4 h-4" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {activities.length ? (
                        <div className="grid gap-3">
                          {activities.map((activity) => (
                            <div key={activity.slug} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-white">{activity.title}</p>
                                  <p className="text-zinc-400 text-xs mt-1">{activity.timing} · {activity.price}</p>
                                  <p className="text-zinc-300 mt-3 leading-6">{activity.summary}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeActivity(index, activity.slug)}
                                  className="text-zinc-500 hover:text-white"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {isActive ? (
                        <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Add activities for {item.day}</p>
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            {activityLibrary.map((activity) => {
                              const alreadyAdded = activities.some((entry) => entry.slug === activity.slug)
                              return (
                                <div key={activity.slug} className="rounded-[20px] border border-white/8 bg-black/20 p-4">
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {(activity.tags || []).map((tag) => (
                                      <span key={tag} className="px-2.5 py-1 rounded-full border border-white/8 bg-black/30 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                  <h4 className="text-base font-semibold">{activity.title}</h4>
                                  <p className="text-sm text-zinc-400 mt-2 leading-6">{activity.summary}</p>
                                  <div className="flex items-center justify-between gap-3 mt-4 text-sm">
                                    <span className="text-zinc-300">{activity.timing}</span>
                                    <strong>{activity.price}</strong>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addActivityToDay(activity, index)}
                                    disabled={alreadyAdded}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50"
                                  >
                                    <Plus className="w-4 h-4" />
                                    {alreadyAdded ? 'Already added' : `Add to ${item.day}`}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="font-display text-xl font-semibold">Photos from Travellers</h3>
            <div className="mt-4 grid grid-cols-[1.5fr_1fr] gap-3">
              <div
                className="h-[300px] border border-white/8 rounded-[20px] bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(145deg,rgba(239,68,68,0.2),rgba(245,158,11,0.2)),url(${singaporeMedia.travellerOne})` }}
              />
              <div className="grid grid-rows-2 gap-3">
                <div
                  className="h-[144px] border border-white/8 rounded-[20px] bg-cover bg-center"
                  style={{ backgroundImage: `linear-gradient(145deg,rgba(109,40,217,0.18),rgba(15,23,42,0.35)),url(${singaporeMedia.travellerTwo})` }}
                />
                <div
                  className="h-[144px] border border-white/8 rounded-[20px] bg-cover bg-center"
                  style={{ backgroundImage: `linear-gradient(145deg,rgba(245,158,11,0.18),rgba(251,191,36,0.18)),url(${singaporeMedia.travellerThree})` }}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display text-xl font-semibold">NAMA Reviews</h3>
            <div className="mt-4 glass rounded-[22px] p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-red-600/25 flex items-center justify-center font-semibold">NT</div>
                <div>
                  <p className="font-semibold text-sm">Nivedita Thomas</p>
                  <p className="text-xs text-zinc-500">Reviewed on · 22 Apr 2026</p>
                </div>
                <div className="ml-auto flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-zinc-300 mt-4 leading-6">
                “The Singapore plan felt clear from day one. The cruise-city combination was easy for our family to understand, and the NAMA team helped us shape the leisure days without making the itinerary feel crowded.”
              </p>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-[22px] p-4">
            <button className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 py-2">
              Edit Travel Details
            </button>
            <Link href="/dynamix/send" className="mt-2 w-full inline-flex items-center justify-center px-5 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-base font-semibold">
              Unlock your itinerary
            </Link>
          </div>

          <div className="glass rounded-[22px] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <span className="text-emerald-400 text-sm font-bold">WA</span>
              </div>
              <div>
                <p className="font-semibold text-sm">WhatsApp NAMA</p>
                <p className="text-xs text-zinc-500 mt-0.5">Planned 51,000+ trips so far</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-3 leading-5">
              Or call us on <a href="tel:+919360991166" className="text-red-400 hover:text-red-300 font-medium">+91 93609 91166</a> for help.
            </p>
          </div>

          <div className="glass rounded-[22px] p-4 flex gap-3 items-start">
            <div className="w-11 h-11 rounded-full bg-red-600/25 flex items-center justify-center shrink-0 font-semibold">KS</div>
            <div>
              <p className="text-xs text-zinc-300 leading-5">
                “The itinerary felt polished and easy to customize. We especially loved having one free day to shape the trip around our kids.”
              </p>
              <p className="text-xs font-semibold mt-2">Kiran S., Trip to Singapore</p>
            </div>
          </div>

          <div className="glass rounded-[22px] p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono text-center">Your Route</p>
            <div className="mt-4 relative pl-6">
              <span className="absolute left-[10px] top-2 bottom-2 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.25)_50%,transparent_50%)] bg-[length:1px_6px]" />
              {routeItems.map((item, index) => (
                <div key={item} className="relative flex items-center gap-3 py-2">
                  <span className={`absolute -left-[18px] ${index === 1 || index === 3 ? 'w-3 h-3 bg-red-600 rounded-full' : 'w-5 h-5 rounded-full bg-black border border-white/30 flex items-center justify-center text-[10px]'}`}>
                    {index === 1 || index === 3 ? null : '•'}
                  </span>
                  <span className={`text-sm ${index === 1 || index === 3 ? 'font-medium text-white' : 'text-zinc-300'}`}>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 grid grid-cols-2 gap-2 border-t border-white/8">
              <button className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black/20 border border-white/10 text-xs">
                Edit Route
              </button>
              <button className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black/20 border border-white/10 text-xs">
                Add City
              </button>
            </div>
          </div>

          <div className="glass rounded-[22px] p-3">
            <button className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-sm">
              Costing for this trip
            </button>
          </div>

          <div className="glass rounded-[22px] p-5 text-center">
            <div className="flex items-center justify-center gap-3">
              <p className="font-display text-4xl font-bold">4.7</p>
              <div className="flex flex-col items-start">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className={`w-4 h-4 ${index < 4 ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1">From 8,250 reviews</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-center gap-2">
              <p className="text-xs font-semibold">Verified Traveller Reviews</p>
            </div>
          </div>

          <div className="glass rounded-[22px] p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Trip summary</p>
            <div className="grid gap-3 mt-4 text-sm">
              {[
                ['Destination', safeDestination],
                ['Travel dates', formatTripDates(workflow.query.startDate, workflow.query.endDate)],
                ['Package', selectedPackage.title],
                ['Base package', selectedPackage.price],
                ['Current sell price', formatMoney(sellPrice)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-white/8 py-2">
                  <span className="text-zinc-400">{label}</span>
                  <strong className="text-right text-white">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
