'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { aiComposer } from '@/lib/dynamix-ai-data'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixAiComposerPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [composerData, setComposerData] = useState(() => ({
    itineraryMode: aiComposer.itineraryMode,
    modules: aiComposer.modules,
    pricingAdvice: aiComposer.pricingAdvice,
    salesNarrative: aiComposer.salesNarrative,
  }))

  useEffect(() => {
    fetch(`/api/dynamix/ai-flow?kind=composer&categorySlug=${encodeURIComponent(workflow.aiFlow.categorySlug || 'reset-retreat')}&destination=${encodeURIComponent(workflow.query.destination)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.data) return
        setComposerData(payload.data)
      })
      .catch(() => null)
  }, [workflow.aiFlow.categorySlug, workflow.query.destination])

  function handoffToBuilder() {
    const selectedModules = composerData.modules
      .filter((module) => module.status === 'Selected' || module.status === 'Suggested')
      .map((module) => module.label)

    const nextState = {
      ...workflow,
      aiFlow: {
        ...workflow.aiFlow,
        enabled: true,
        composerMode: composerData.itineraryMode,
        selectedModules,
      },
      selectedHoliday: {
        ...workflow.selectedHoliday,
        title: workflow.aiFlow.categoryTitle
          ? `${workflow.aiFlow.categoryTitle} · ${workflow.query.destination}`
          : workflow.selectedHoliday.title,
      },
      quote: {
        ...workflow.quote,
        message: `Hi Aarav, sharing your ${workflow.aiFlow.categoryTitle || 'AI-shaped'} holiday quote for ${workflow.query.destination}.`,
      },
    }

    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="grid xl:grid-cols-[1.04fr_0.96fr] gap-6">
        <div className="glass rounded-[28px] p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">AI Flow · Screen 3</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">AI composes the holiday modules.</h1>
          <p className="text-zinc-400 mt-4 leading-7 max-w-3xl">
            This is where a category-first system becomes truly flexible: AI arranges modules, not just inventory. The agent keeps control, but starts from a smarter commercial build.
          </p>
          <div className="space-y-4 mt-6">
            {composerData.modules.map((module) => (
              <div key={module.label} className="rounded-[24px] border border-white/8 bg-white/5 p-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{module.label}</h2>
                  <p className="text-sm text-zinc-400 mt-2">{module.summary}</p>
                </div>
                <span className={`px-3 py-2 rounded-full text-[11px] uppercase tracking-[0.14em] ${module.status === 'Selected' ? 'bg-red-600/15 border border-red-600/30 text-white' : 'bg-white/5 border border-white/8 text-zinc-400'}`}>
                  {module.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="glass rounded-[28px] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Pricing intelligence</p>
            <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">{composerData.itineraryMode}</h2>
            <p className="text-sm text-zinc-300 mt-4">{composerData.pricingAdvice}</p>
          </div>
          <div className="glass rounded-[28px] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Sales narrative</p>
            <p className="text-sm text-zinc-300 mt-4">{composerData.salesNarrative}</p>
          </div>
          <div className="glass rounded-[28px] p-6 bg-[linear-gradient(180deg,rgba(229,9,20,0.10),rgba(255,255,255,0.02))] border border-red-600/20">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">What next</p>
            <p className="text-sm text-zinc-300 mt-4">
              From here, Dynamix can hand the agent into the existing builder, but with a pre-shaped itinerary, margin-safe story, and better upsell order already decided by AI.
            </p>
            <div className="grid gap-3 mt-5">
              <Link href="/dynamix/builder" onClick={handoffToBuilder} className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold">
                Hand off to builder
              </Link>
              <Link href="/dynamix" className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium">
                Back to Dynamix entry
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
