'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { rankResultsForCategory } from '@/lib/dynamix-ai-data'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixResultsPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [results, setResults] = useState([])
  const [matchAssist, setMatchAssist] = useState('')

  useEffect(() => {
    fetch(
      `/api/dynamix/results?searchId=${encodeURIComponent(workflow.searchId || '')}&destination=${encodeURIComponent(workflow.query.destination)}&packageType=${encodeURIComponent(workflow.query.packageType)}&travelerType=${encodeURIComponent(workflow.query.travelerType)}`
    )
      .then((response) => response.json())
      .then((data) => setResults(rankResultsForCategory(data.data || [], workflow.aiFlow.categorySlug)))
      .catch(() => setResults([]))

    fetch(`/api/dynamix/assist?kind=match&destination=${encodeURIComponent(workflow.query.destination)}`)
      .then((response) => response.json())
      .then((data) => setMatchAssist(data.message || ''))
      .catch(() => setMatchAssist(''))
  }, [workflow.searchId, workflow.query.destination, workflow.query.packageType, workflow.query.travelerType, workflow.aiFlow.categorySlug])

  function chooseHoliday(item) {
    const nextState = {
      ...workflow,
      selectedHoliday: {
        id: item.id || null,
        slug: item.slug,
        title: item.title,
        price: item.price,
      },
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="glass rounded-[28px] p-8 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Step 2 · Matched Holidays</p>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">Choose the best-fit holiday.</h1>
            <p className="text-zinc-400 mt-3 max-w-2xl">After trip definition, agents should compare a small number of strong holiday matches before opening the deeper builder.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(workflow.query).slice(0, 5).map((value) => (
              <span key={value} className="px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.14em] text-zinc-400">{value}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[0.8fr_1.2fr] gap-6">
        <aside className="glass rounded-[28px] p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Filters</p>
          <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">Refine matches</h2>
          <div className="flex flex-wrap gap-3 mt-6">
            {[workflow.query.packageType, workflow.query.travelerType, '₹50K to ₹1.5L'].map((item, idx) => (
              <span key={item} className={`px-4 py-2 rounded-full text-sm border ${idx === 0 ? 'bg-red-600/15 border-red-600/30 text-white' : 'bg-white/5 border-white/8 text-zinc-400'}`}>{item}</span>
            ))}
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 mt-6">
            <h3 className="font-semibold text-sm mb-2">AI match insight</h3>
            <p className="text-sm text-zinc-300">{matchAssist || 'Ranking the strongest matches for this trip brief.'}</p>
          </div>
        </aside>

        <div className="space-y-4">
          {results.map((item) => (
            <article key={item.slug} className="glass rounded-[26px] p-6 grid md:grid-cols-[1fr_auto] gap-6 items-start">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.badges.map((badge) => (
                    <span key={badge} className="px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.12em] text-zinc-400">{badge}</span>
                  ))}
                </div>
                <h3 className="text-2xl font-display font-semibold tracking-tight">{item.title}</h3>
                <p className="text-zinc-400 mt-3 leading-7">{item.summary}</p>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 mt-4">
                  <h4 className="font-semibold text-sm mb-2">AI sales insight</h4>
                  <p className="text-sm text-zinc-300">{matchAssist || 'Position the option with the cleanest conversion path first.'}</p>
                </div>
              </div>
              <div className="min-w-[220px]">
                <div className="text-zinc-500 text-xs uppercase tracking-[0.18em] font-mono">Starts from</div>
                <div className="text-3xl font-display font-bold tracking-tight mt-1">{item.price}</div>
                <div className="flex flex-col gap-3 mt-6">
                  <Link
                    href="/dynamix/builder"
                    onClick={() => chooseHoliday(item)}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold"
                  >
                    Select holiday
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
