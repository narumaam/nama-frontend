'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { dynamixResults } from '@/lib/dynamix-data'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixLandingPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [currentIndex, setCurrentIndex] = useState(0)
  const confirmationsRef = useRef(null)

  const packages = useMemo(() => dynamixResults, [])
  const activePackage = packages[currentIndex] || packages[0]

  function scrollToConfirmations() {
    confirmationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function showPrev() {
    setCurrentIndex((prev) => (prev === 0 ? packages.length - 1 : prev - 1))
  }

  function showNext() {
    setCurrentIndex((prev) => (prev === packages.length - 1 ? 0 : prev + 1))
  }

  function selectGuaranteedPackage(item) {
    const nextState = {
      ...workflow,
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

  const optionCardClass =
    'glass rounded-[28px] p-8 border border-white/8 min-h-[420px] flex flex-col'

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

      <section className="grid lg:grid-cols-2 gap-6 mt-6">
        <article className={optionCardClass}>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            Option A
          </div>
          <h2 className="text-3xl font-display font-semibold tracking-tight mt-5">Category First Dynamix</h2>
          <p className="text-zinc-400 mt-3 leading-7">
            Let Dynamix start from the category, not the city. This path is best when the agent wants AI help deciding what type of holiday should be sold before getting into the detailed build.
          </p>
          <div className="space-y-3 mt-6">
            {[
              'Starts from holiday intent and traveller context',
              'AI shapes destination fit, sell story, and package structure',
              'Best when the agent wants help choosing what to build',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-auto pt-6">
            <Link
              href="/dynamix/ai-categories"
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              Open category-first flow
            </Link>
          </div>
        </article>

        <article className={optionCardClass}>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            Option B
          </div>
          <h2 className="text-3xl font-display font-semibold tracking-tight mt-5">Guaranteed Confirmations</h2>
          <p className="text-zinc-400 mt-3 leading-7">
            Use this when the agent already wants speed and confidence. Jump straight to ready-to-sell packages that can move quickly without going through the extra matching step first.
          </p>
          <div className="space-y-3 mt-6">
            {[
              'Ready-to-sell packages with clear pricing',
              'Best for quick quote turnaround and simple briefs',
              'One click takes the agent straight to available confirmed options below',
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
              View guaranteed packages
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
              When the agent wants quick turnaround, they should be able to pick a package right here and move straight into the builder and send flow.
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
                onClick={() => setCurrentIndex(index)}
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
