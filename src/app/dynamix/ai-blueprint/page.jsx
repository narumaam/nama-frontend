'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { aiBlueprint } from '@/lib/dynamix-ai-data'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixAiBlueprintPage() {
  const searchParams = useSearchParams()
  const [workflow] = useState(() => {
    const currentWorkflow = loadWorkflow() || defaultWorkflow
    const categorySlug = searchParams.get('category') || currentWorkflow.aiFlow.categorySlug
    const categoryTitle = currentWorkflow.aiFlow.categoryTitle || aiBlueprint.primaryCategory
    const nextState = {
      ...currentWorkflow,
      aiFlow: {
        ...currentWorkflow.aiFlow,
        enabled: true,
        categorySlug,
        categoryTitle,
        blueprint: {
          primaryCategory: categoryTitle,
          idealDestination: aiBlueprint.idealDestination,
          confidence: aiBlueprint.confidence,
          reasons: aiBlueprint.reasons,
          commercialSignals: aiBlueprint.commercialSignals,
        },
      },
      query: {
        ...currentWorkflow.query,
        destination: aiBlueprint.idealDestination,
      },
    }
    saveWorkflow(nextState)
    return nextState
  })
  const [blueprintData, setBlueprintData] = useState(() => workflow.aiFlow.blueprint || {
    primaryCategory: workflow.aiFlow.categoryTitle || aiBlueprint.primaryCategory,
    idealDestination: aiBlueprint.idealDestination,
    confidence: aiBlueprint.confidence,
    reasons: aiBlueprint.reasons,
    commercialSignals: aiBlueprint.commercialSignals,
  })

  useEffect(() => {
    fetch(`/api/dynamix/ai-flow?kind=blueprint&categorySlug=${encodeURIComponent(workflow.aiFlow.categorySlug || 'reset-retreat')}&destination=${encodeURIComponent(workflow.query.destination)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.data) return
        setBlueprintData(payload.data)
        saveWorkflow({
          ...workflow,
          aiFlow: {
            ...workflow.aiFlow,
            blueprint: payload.data,
          },
        })
      })
      .catch(() => null)
  }, [workflow])

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className="glass rounded-[28px] p-8 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]">
          <p className="text-[11px] uppercase tracking-[0.18em] dynamix-subtle font-mono">AI Flow · Screen 2</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">AI builds the holiday blueprint.</h1>
          <p className="dynamix-muted mt-4 max-w-3xl leading-7">
            Instead of making the agent choose dozens of components first, Dynamix can use AI to define the right holiday architecture: category, destination fit, commercial tone, and closing strategy.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              ['Primary category', blueprintData.primaryCategory || workflow.aiFlow.categoryTitle || aiBlueprint.primaryCategory],
              ['Ideal destination', blueprintData.idealDestination || aiBlueprint.idealDestination],
              ['Confidence', blueprintData.confidence || aiBlueprint.confidence],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border dynamix-card-soft p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] dynamix-subtle font-mono mb-2">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="glass rounded-[28px] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] dynamix-subtle font-mono">Why AI chose this</p>
            <div className="space-y-3 mt-4">
              {(blueprintData.reasons || aiBlueprint.reasons).map((item) => (
                <div key={item} className="rounded-2xl border dynamix-card-soft p-4 text-sm dynamix-muted">{item}</div>
              ))}
            </div>
          </div>
          <div className="glass rounded-[28px] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] dynamix-subtle font-mono">Commercial signals</p>
            <div className="space-y-3 mt-4">
              {(blueprintData.commercialSignals || aiBlueprint.commercialSignals).map((item) => (
                <div key={item} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm dynamix-text">{item}</div>
              ))}
            </div>
          </div>
          <Link href="/dynamix/ai-composer" className="inline-flex items-center justify-center px-5 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold">
            Continue to AI composer
          </Link>
        </div>
      </section>
    </main>
  )
}
