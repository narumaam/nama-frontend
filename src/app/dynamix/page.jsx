'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { dynamixResults } from '@/lib/dynamix-data'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixLandingPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [currentIndex, setCurrentIndex] = useState(0)
  const confirmationsRef = useRef(null)
  const carouselRef = useRef(null)
  const autoScrollRef = useRef(null)

  const packages = useMemo(() => dynamixResults, [])
  const activePackage = packages[currentIndex] || packages[0]
  const [tripForm, setTripForm] = useState(() => ({
    destination: workflow.query.destination || 'Bali',
    startDate: workflow.query.startDate || '12 Jun 2026',
    endDate: workflow.query.endDate || '18 Jun 2026',
    adults: 2,
    children: 0,
    childAge: '7',
    packageType: workflow.query.packageType || 'Full package',
  }))

  const categoryOptions = [
    'Reset Retreat',
    'Family Memory Maker',
    'Celebration Escape',
    'Flexi Land Hack',
  ]

  const composerModes = [
    'AI builds destination fit',
    'AI suggests module mix',
    'AI protects pricing story',
  ]

  useEffect(() => {
    autoScrollRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev === packages.length - 1 ? 0 : prev + 1
        scrollCarousel(next)
        return next
      })
    }, 3500)

    return () => {
      if (autoScrollRef.current) window.clearInterval(autoScrollRef.current)
    }
  }, [packages.length])

  function scrollToConfirmations() {
    confirmationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function showPrev() {
    setCurrentIndex((prev) => {
      const next = prev === 0 ? packages.length - 1 : prev - 1
      scrollCarousel(next)
      return next
    })
  }

  function showNext() {
    setCurrentIndex((prev) => {
      const next = prev === packages.length - 1 ? 0 : prev + 1
      scrollCarousel(next)
      return next
    })
  }

  function scrollCarousel(index) {
    const container = carouselRef.current
    if (!container) return
    const card = container.querySelector(`[data-package-index="${index}"]`)
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  function selectGuaranteedPackage(item) {
    const nextState = {
      ...workflow,
      query: {
        ...workflow.query,
        destination: tripForm.destination,
        startDate: tripForm.startDate,
        endDate: tripForm.endDate,
        pax: `${tripForm.adults} adults${tripForm.children ? `, ${tripForm.children} child` : ''}`,
        travelerType: tripForm.children ? 'Family' : workflow.query.travelerType,
        packageType: tripForm.packageType,
      },
      selectedHoliday: {
        id: item.id || null,
        slug: item.slug,
        title: item.title,
        price: item.price,
      },
      quote: {
        ...workflow.quote,
        status: 'draft',
      },
    }

    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  function updateTripField(key, value) {
    const nextTrip = {
      ...tripForm,
      [key]: value,
    }
    setTripForm(nextTrip)

    const nextState = {
      ...workflow,
      query: {
        ...workflow.query,
        destination: nextTrip.destination,
        startDate: nextTrip.startDate,
        endDate: nextTrip.endDate,
        pax: `${nextTrip.adults} adults${nextTrip.children ? `, ${nextTrip.children} child` : ''}`,
        travelerType: nextTrip.children ? 'Family' : workflow.query.travelerType,
        packageType: nextTrip.packageType,
      },
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  const optionCardClass =
    'glass rounded-[28px] p-8 border border-white/8 min-h-[520px] flex flex-col'

  function setCategoryFlow(slug) {
    const nextState = {
      ...workflow,
      aiFlow: {
        ...workflow.aiFlow,
        enabled: true,
        categoryTitle: slug,
      },
      query: {
        ...workflow.query,
        destination: tripForm.destination,
        startDate: tripForm.startDate,
        endDate: tripForm.endDate,
        pax: `${tripForm.adults} adults${tripForm.children ? `, ${tripForm.children} child` : ''}`,
        travelerType: slug === 'Family Memory Maker' || tripForm.children ? 'Family' : 'Couple',
        packageType: tripForm.packageType,
      },
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="glass rounded-[30px] p-8 md:p-10 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-mono">Dynamix Entry</p>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[0.94] mt-4">
              Choose how NAMA DYNAMIX
              <br />
              <span className="text-red-500">builds the holiday.</span>
            </h1>
            <p className="text-zinc-400 mt-5 leading-7 text-base md:text-lg">
              Start from the smarter planning mode. Use category-first Dynamix when the agent needs AI-led trip shaping, or jump straight into guaranteed confirmations when the brief is simple and speed matters most.
            </p>
          </div>
        </div>
      </section>

      <section className="glass rounded-[28px] p-6 mt-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Trip brief</p>
            <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">Define the essentials once.</h2>
            <p className="text-zinc-400 mt-2 text-sm leading-6">
              These trip inputs power both Category First Dynamix and Guaranteed Confirmations, so the agent does not have to repeat destination, travel dates, pax, or child age later.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            Shared across both paths
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4 mt-6">
          <label className="grid gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Destination</span>
            <input
              value={tripForm.destination}
              onChange={(event) => updateTripField('destination', event.target.value)}
              className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Start date</span>
            <input
              value={tripForm.startDate}
              onChange={(event) => updateTripField('startDate', event.target.value)}
              className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">End date</span>
            <input
              value={tripForm.endDate}
              onChange={(event) => updateTripField('endDate', event.target.value)}
              className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Adults</span>
            <select
              value={tripForm.adults}
              onChange={(event) => updateTripField('adults', Number(event.target.value))}
              className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
            >
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Children</span>
            <select
              value={tripForm.children}
              onChange={(event) => updateTripField('children', Number(event.target.value))}
              className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
            >
              {[0, 1, 2, 3].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Child age</span>
            <input
              value={tripForm.children ? tripForm.childAge : 'N/A'}
              disabled={!tripForm.children}
              onChange={(event) => updateTripField('childAge', event.target.value)}
              className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white disabled:opacity-40"
            />
          </label>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mt-6">
        <article className={optionCardClass}>
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[11px] uppercase tracking-[0.16em] text-emerald-200">
              AI-led builder
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Configure here</span>
          </div>
          <h2 className="text-3xl font-display font-semibold tracking-tight mt-5">Category First Dynamix</h2>
          <p className="text-zinc-400 mt-3 leading-7">
            Let Dynamix start from the category, not the city. This path is for actually shaping the package inside this panel before the agent moves deeper into the build.
          </p>

          <div className="grid gap-4 mt-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-3">Choose category</p>
              <div className="flex flex-wrap gap-3">
                {categoryOptions.map((item) => {
                  const isActive = workflow.aiFlow.categoryTitle === item
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategoryFlow(item)}
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

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-3">Package shape</p>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  `Destination: ${tripForm.destination}`,
                  `Dates: ${tripForm.startDate} to ${tripForm.endDate}`,
                  `Travellers: ${tripForm.adults} adults${tripForm.children ? `, ${tripForm.children} child (${tripForm.childAge}y)` : ''}`,
                  `Build style: ${tripForm.packageType}`,
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-3">What AI will configure next</p>
              <div className="space-y-3">
                {composerModes.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <Link
              href="/dynamix/ai-categories"
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              Continue with AI build
            </Link>
          </div>
        </article>

        <article className={optionCardClass}>
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-amber-500/20 bg-amber-500/10 text-[11px] uppercase tracking-[0.16em] text-amber-200">
              Fast-track sell
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-mono">Scroll to confirmed stock</span>
          </div>
          <h2 className="text-3xl font-display font-semibold tracking-tight mt-5">Guaranteed Confirmations</h2>
          <p className="text-zinc-400 mt-3 leading-7">
            Use this when the agent already wants speed and confidence. The packages below now use the same destination, date, pax, and child-age trip brief defined above.
          </p>
          <div className="space-y-3 mt-6">
            {[
              `Ready-to-sell options for ${tripForm.destination}`,
              `Built for ${tripForm.adults} adults${tripForm.children ? ` and ${tripForm.children} child` : ''}`,
              'One click jumps straight to the auto-scrolling confirmed stock below',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={scrollToConfirmations}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium"
            >
              Open guaranteed confirmations
            </button>
          </div>
        </article>
      </section>

      <section ref={confirmationsRef} className="glass rounded-[30px] p-8 md:p-10 mt-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-mono">Guaranteed Confirmations</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mt-3">
              Ready-to-sell packages
              <span className="text-red-500"> without the extra step.</span>
            </h2>
            <p className="text-zinc-400 mt-4 leading-7">
              These packages should keep moving on their own, while still allowing the agent to pause on the one that best fits the current trip brief.
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

        <div className="mt-8">
          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {packages.map((item, index) => (
              <article
                key={item.slug}
                data-package-index={index}
                className={`snap-start shrink-0 w-[330px] md:w-[380px] rounded-[28px] border p-7 transition ${
                  index === currentIndex
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
                <h3 className="text-3xl font-display font-semibold tracking-tight">{item.title}</h3>
                <p className="text-zinc-400 mt-4 leading-7 min-h-[112px]">{item.summary}</p>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    {tripForm.startDate} → {tripForm.endDate}
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    {tripForm.adults} adults{tripForm.children ? `, ${tripForm.children} child` : ''}
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-zinc-500 text-[11px] uppercase tracking-[0.18em] font-mono">Price</div>
                  <div className="text-3xl font-display font-bold tracking-tight mt-2">{item.price}</div>
                </div>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Link
                    href="/dynamix/builder"
                    onClick={() => selectGuaranteedPackage(item)}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold"
                  >
                    Use this package
                  </Link>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10"
                  >
                    Focus card
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-6 mt-8 items-start">
          <article className="rounded-[28px] border border-white/8 bg-white/5 p-7">
            <div className="flex flex-wrap gap-2 mb-4">
              {activePackage.badges.map((badge) => (
                <span
                  key={badge}
                  className="px-3 py-2 rounded-full border border-white/8 bg-black/20 text-[11px] uppercase tracking-[0.12em] text-zinc-400"
                >
                  {badge}
                </span>
              ))}
            </div>
            <h3 className="text-3xl font-display font-semibold tracking-tight">{activePackage.title}</h3>
            <p className="text-zinc-400 mt-4 leading-7">{activePackage.summary}</p>
            <div className="mt-6">
              <div className="text-zinc-500 text-[11px] uppercase tracking-[0.18em] font-mono">Price</div>
              <div className="text-3xl font-display font-bold tracking-tight mt-2">{activePackage.price}</div>
            </div>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/dynamix/builder"
                onClick={() => selectGuaranteedPackage(activePackage)}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold"
              >
                Use this package
              </Link>
              <Link
                href="/dynamix/results"
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10"
              >
                See full results screen
              </Link>
            </div>
          </article>

          <div className="grid gap-3">
            {packages.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => {
                  setCurrentIndex(index)
                  scrollCarousel(index)
                }}
                className={`text-left rounded-[24px] border p-5 transition ${
                  index === currentIndex
                    ? 'border-red-600/30 bg-red-600/10 shadow-[0_0_0_1px_rgba(220,38,38,0.12)]'
                    : 'border-white/8 bg-white/5 hover:bg-white/8'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-display font-semibold">{item.title}</h4>
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-3">{item.summary}</p>
                  </div>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">{item.price}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
