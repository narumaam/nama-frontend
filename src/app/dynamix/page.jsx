'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { getDestinationPackageBundle } from '@/lib/dynamix-data'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

const optionCardClass =
  'glass rounded-[28px] p-7 md:p-8 border border-white/8 min-h-[620px] flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]'

const categoryOptions = [
  'Reset Retreat',
  'Family Memory Maker',
  'Celebration Escape',
  'Flexi Land Hack',
]

const guaranteedModes = ['Best match', 'Family-safe', 'Higher margin', 'Land only']

function TripFields({ tripForm, updateTripField }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="grid gap-2 col-span-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Destination</span>
        <input
          value={tripForm.destination}
          onChange={(event) => updateTripField('destination', event.target.value)}
          className="dynamix-input px-4 py-3.5 rounded-2xl border text-sm"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">No. of days</span>
        <select
          value={tripForm.duration}
          onChange={(event) => updateTripField('duration', event.target.value)}
          className="dynamix-input px-4 py-3.5 rounded-2xl border text-sm"
        >
          {['3 nights / 4 days', '4 nights / 5 days', '5 nights / 6 days', '6 nights / 7 days', '7 nights / 8 days'].map(
            (value) => (
              <option key={value} value={value}>
                {value}
              </option>
            )
          )}
        </select>
      </label>
      <label className="grid gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">No. of pax</span>
        <select
          value={tripForm.adults}
          onChange={(event) => updateTripField('adults', Number(event.target.value))}
          className="dynamix-input px-4 py-3.5 rounded-2xl border text-sm"
        >
          {[1, 2, 3, 4, 5, 6].map((value) => (
            <option key={value} value={value}>
              {value} {value === 1 ? 'traveller' : 'travellers'}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Start date</span>
        <input
          type="date"
          value={tripForm.startDate}
          onChange={(event) => updateTripField('startDate', event.target.value)}
          className="dynamix-input px-4 py-3.5 rounded-2xl border text-sm"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">End date</span>
        <input
          type="date"
          value={tripForm.endDate}
          onChange={(event) => updateTripField('endDate', event.target.value)}
          className="dynamix-input px-4 py-3.5 rounded-2xl border text-sm"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Children</span>
        <select
          value={tripForm.children}
          onChange={(event) => updateTripField('children', Number(event.target.value))}
          className="dynamix-input px-4 py-3.5 rounded-2xl border text-sm"
        >
          {[0, 1, 2, 3].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 col-span-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Child age</span>
        <input
          value={tripForm.children ? tripForm.childAge : 'No child selected'}
          disabled={!tripForm.children}
          onChange={(event) => updateTripField('childAge', event.target.value)}
          className="dynamix-input px-4 py-3.5 rounded-2xl border text-sm disabled:opacity-40"
        />
      </label>
    </div>
  )
}

export default function DynamixLandingPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedMode, setSelectedMode] = useState('Best match')
  const [missingAlertSent, setMissingAlertSent] = useState(false)
  const confirmationsRef = useRef(null)
  const [tripForm, setTripForm] = useState(() => ({
    destination: workflow.query.destination || 'Bali',
    duration: workflow.query.duration || '5 nights / 6 days',
    startDate: workflow.query.startDate || '2026-06-12',
    endDate: workflow.query.endDate || '2026-06-18',
    adults: 2,
    children: 0,
    childAge: '7',
    packageType: workflow.query.packageType || 'Full package',
  }))

  const { normalizedDestination, packages: packageList } = getDestinationPackageBundle(tripForm.destination)
  const hasPackages = packageList.length > 0
  const activePackage = packageList[currentIndex] || null
  const visiblePackages = packageList.slice(currentIndex, currentIndex + 3)
  const displayDestination = normalizedDestination || tripForm.destination.trim() || 'this destination'

  useEffect(() => {
    if (hasPackages) {
      setMissingAlertSent(false)
      return
    }

    if (!tripForm.destination.trim() || missingAlertSent) return

    const agentEmail =
      typeof window !== 'undefined'
        ? localStorage.getItem('nama_session_email') || localStorage.getItem('nama_agent_email') || ''
        : ''

    fetch('/api/dynamix/missing-destination', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: tripForm.destination.trim(),
        startDate: tripForm.startDate,
        endDate: tripForm.endDate,
        duration: tripForm.duration,
        pax: `${tripForm.adults} adults${tripForm.children ? `, ${tripForm.children} child` : ''}`,
        agentEmail,
      }),
    }).catch(() => null)

    setMissingAlertSent(true)
  }, [hasPackages, missingAlertSent, tripForm])

  function scrollToConfirmations() {
    confirmationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function showPrev() {
    if (!packageList.length) return
    setCurrentIndex((prev) => (prev === 0 ? Math.max(packageList.length - 3, 0) : prev - 1))
  }

  function showNext() {
    if (!packageList.length) return
    setCurrentIndex((prev) => (prev >= Math.max(packageList.length - 3, 0) ? 0 : prev + 1))
  }

  function buildSelectedHoliday(item) {
    if (!item) {
      return {
        id: null,
        slug: null,
        title: '',
        price: '',
      }
    }

    return {
      id: item.id || null,
      slug: item.slug,
      title: item.title,
      price: item.price,
    }
  }

  function updateTripField(key, value) {
    const computeEndDate = (startDate, durationLabel) => {
      if (!startDate) return tripForm.endDate
      const nights = Number.parseInt(durationLabel, 10)
      if (!Number.isFinite(nights)) return tripForm.endDate
      const start = new Date(`${startDate}T00:00:00`)
      if (Number.isNaN(start.getTime())) return tripForm.endDate
      const end = new Date(start)
      end.setDate(start.getDate() + nights + 1)
      return end.toISOString().slice(0, 10)
    }

    const nextTrip = {
      ...tripForm,
      [key]: value,
    }

    if (key === 'startDate' || key === 'duration') {
      nextTrip.endDate = computeEndDate(
        key === 'startDate' ? value : nextTrip.startDate,
        key === 'duration' ? value : nextTrip.duration
      )
    }

    const nextBundle = getDestinationPackageBundle(nextTrip.destination)
    const nextActivePackage = nextBundle.packages[0] || null

    setTripForm(nextTrip)
    setCurrentIndex(0)

    const nextState = {
      ...workflow,
      query: {
        ...workflow.query,
        destination: nextTrip.destination,
        duration: nextTrip.duration,
        startDate: nextTrip.startDate,
        endDate: nextTrip.endDate,
        pax: `${nextTrip.adults} adults${nextTrip.children ? `, ${nextTrip.children} child` : ''}`,
        travelerType: nextTrip.children ? 'Family' : workflow.query.travelerType,
        packageType: nextTrip.packageType,
      },
      selectedHoliday: buildSelectedHoliday(nextActivePackage),
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  function setCategoryFlow(title) {
    if (!activePackage) return
    const nextState = {
      ...workflow,
      aiFlow: {
        ...workflow.aiFlow,
        enabled: true,
        categoryTitle: title,
        categorySlug: title.toLowerCase().replace(/\s+/g, '-'),
      },
      query: {
        ...workflow.query,
        destination: displayDestination,
        duration: tripForm.duration,
        startDate: tripForm.startDate,
        endDate: tripForm.endDate,
        pax: `${tripForm.adults} adults${tripForm.children ? `, ${tripForm.children} child` : ''}`,
        travelerType: title === 'Family Memory Maker' || tripForm.children ? 'Family' : 'Couple',
        packageType: tripForm.packageType,
      },
      selectedHoliday: buildSelectedHoliday(activePackage),
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  function selectGuaranteedPackage(item) {
    const nextState = {
      ...workflow,
      query: {
        ...workflow.query,
        destination: displayDestination,
        duration: tripForm.duration,
        startDate: tripForm.startDate,
        endDate: tripForm.endDate,
        pax: `${tripForm.adults} adults${tripForm.children ? `, ${tripForm.children} child` : ''}`,
        travelerType: tripForm.children ? 'Family' : workflow.query.travelerType,
        packageType: tripForm.packageType,
      },
      selectedHoliday: buildSelectedHoliday(item),
      quote: {
        ...workflow.quote,
        status: 'draft',
      },
    }

    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="glass rounded-[30px] p-8 md:p-10 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.16),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
        <div className="max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-mono">Dynamix Holidays</p>
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[0.94] mt-4">
            Build your
            <br />
            <span className="text-red-500">NAMA DYNAMIX Holiday.</span>
          </h1>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mt-6">
        <article className={optionCardClass}>
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.16em] text-zinc-300">
              Option A
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-300 font-mono">AI-led builder</span>
          </div>
          <h2 className="text-3xl font-display font-semibold tracking-tight mt-5">Category First Dynamix</h2>
          <p className="text-zinc-400 mt-3 leading-7">
            Let&apos;s help you build the holiday. The trip brief picks the direction and carries the destination cleanly into the next step.
          </p>

          <div className="mt-6">
            <TripFields tripForm={tripForm} updateTripField={updateTripField} />
          </div>

          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-3">Holiday category</p>
            <div className="flex flex-wrap gap-3">
              {categoryOptions.map((item) => {
                const isActive = workflow.aiFlow.categoryTitle === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategoryFlow(item)}
                    disabled={!activePackage}
                    className={`px-4 py-3 rounded-2xl border text-sm transition ${
                      isActive
                        ? 'border-red-600/30 bg-red-600/10 text-white'
                        : 'border-white/8 bg-white/5 text-zinc-300 hover:bg-white/8'
                    } ${!activePackage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-3">Package type</p>
            <div className="grid grid-cols-2 gap-3">
              {['Full package', 'Land only'].map((item) => {
                const isActive = tripForm.packageType === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateTripField('packageType', item)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      isActive
                        ? 'border-red-600/30 bg-red-600/10 text-white'
                        : 'border-white/8 bg-white/5 text-zinc-300 hover:bg-white/8'
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-5">
            {activePackage ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Selected package direction</p>
                    <h3 className="text-xl font-display font-semibold mt-2">{activePackage.title}</h3>
                  </div>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">{activePackage.price}</span>
                </div>
                <p className="text-sm text-zinc-400 mt-3 leading-6">{activePackage.summary}</p>
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">No destination content</p>
                <h3 className="text-xl font-display font-semibold mt-2">Sorry, there are no packages for {displayDestination}!</h3>
                <p className="text-sm text-zinc-400 mt-3 leading-6">
                  Thank you for finding this booper, an email is being triggered to the product manager.
                </p>
              </>
            )}
          </div>

          <div className="mt-auto pt-6 flex flex-wrap gap-3">
            <Link
              href="/dynamix/builder"
              onClick={() => setCategoryFlow(workflow.aiFlow.categoryTitle || categoryOptions[0])}
              className={`inline-flex items-center justify-center px-5 py-3 rounded-2xl text-white font-semibold ${
                activePackage ? 'bg-red-600 hover:bg-red-500' : 'bg-zinc-700 cursor-not-allowed pointer-events-none'
              }`}
            >
              Build this holiday
            </Link>
            <span className="inline-flex items-center px-4 py-3 rounded-2xl border border-white/8 bg-white/5 text-sm text-zinc-400">
              Destination, dates, days, and pax will carry forward
            </span>
          </div>
        </article>

        <article className={optionCardClass}>
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.16em] text-zinc-300">
              Option B
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em] text-amber-300 font-mono">Fast-track sell</span>
          </div>
          <h2 className="text-3xl font-display font-semibold tracking-tight mt-5">Guaranteed Confirmations</h2>
          <p className="text-zinc-400 mt-3 leading-7">
            Use this when the agent already knows the trip basics and wants a ready package fast.
          </p>

          <div className="mt-6">
            <TripFields tripForm={tripForm} updateTripField={updateTripField} />
          </div>

          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-3">What should surface first</p>
            <div className="flex flex-wrap gap-3">
              {guaranteedModes.map((item) => {
                const isActive = selectedMode === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedMode(item)}
                    className={`px-4 py-3 rounded-2xl border text-sm transition ${
                      isActive
                        ? 'border-red-600/30 bg-red-600/10 text-white'
                        : 'border-white/8 bg-white/5 text-zinc-300 hover:bg-white/8'
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 mt-6">
            {[
              `Destination: ${displayDestination}`,
              `Travel dates: ${tripForm.startDate} to ${tripForm.endDate}`,
              `Trip brief: ${tripForm.duration} · ${tripForm.adults} adults${tripForm.children ? ` · ${tripForm.children} child (${tripForm.childAge}y)` : ''}`,
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={scrollToConfirmations}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium"
            >
              View guaranteed packages
            </button>
            <span className="inline-flex items-center px-4 py-3 rounded-2xl border border-white/8 bg-white/5 text-sm text-zinc-400">
              Same trip brief used for the packages below
            </span>
          </div>
        </article>
      </section>

      <section ref={confirmationsRef} className="glass rounded-[30px] p-8 md:p-10 mt-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-mono">Guaranteed Confirmations</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mt-3">
              Confirmed packages
              <span className="text-red-500"> ready to sell now.</span>
            </h2>
            <p className="text-zinc-400 mt-4 leading-7">
              These packages stay steady and only change when the agent clicks the arrows. The package list changes entirely based on the destination entered above.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={showPrev}
              className="w-12 h-12 rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 flex items-center justify-center"
              aria-label="Previous package"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="w-12 h-12 rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 flex items-center justify-center"
              aria-label="Next package"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!hasPackages ? (
          <div className="mt-8 rounded-[28px] border border-white/8 bg-white/5 p-6">
            <h3 className="text-2xl font-display font-semibold">Sorry, there are no packages for {displayDestination}!</h3>
            <p className="text-zinc-400 mt-3 leading-7">
              Thank you for finding this booper, an email is being triggered to the product manager.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid lg:grid-cols-3 gap-4">
            {visiblePackages.map((item) => (
              <article
                key={item.slug}
                className={`rounded-[28px] border p-6 transition ${
                  item.slug === activePackage.slug
                    ? 'border-red-600/30 bg-red-600/10 shadow-[0_0_0_1px_rgba(220,38,38,0.12)]'
                    : 'border-white/8 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.badges.map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-2 rounded-full border border-white/8 bg-black/20 text-[11px] uppercase tracking-[0.12em] text-zinc-400"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-2xl font-display font-semibold tracking-tight">{item.title}</h3>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">{item.price}</span>
                </div>
                <p className="text-zinc-400 mt-4 leading-7 min-h-[112px]">{item.summary}</p>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    {tripForm.startDate} → {tripForm.endDate}
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    {tripForm.duration} · {tripForm.adults} adults{tripForm.children ? `, ${tripForm.children} child` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-7">
                  <Link
                    href="/dynamix/builder"
                    onClick={() => selectGuaranteedPackage(item)}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold"
                  >
                    Use this package
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const absoluteIndex = packageList.findIndex((pkg) => pkg.slug === item.slug)
                      setCurrentIndex(absoluteIndex)
                    }}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10"
                  >
                    Focus card
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <span className="inline-flex items-center px-4 py-2 rounded-full border border-white/8 bg-white/5">
            Current lane: {selectedMode}
          </span>
          <span className="inline-flex items-center px-4 py-2 rounded-full border border-white/8 bg-white/5">
            Selected destination: {displayDestination}
          </span>
          <span className="inline-flex items-center px-4 py-2 rounded-full border border-white/8 bg-white/5">
            Active package: {activePackage?.title || 'No package available'}
          </span>
        </div>
      </section>
    </main>
  )
}
