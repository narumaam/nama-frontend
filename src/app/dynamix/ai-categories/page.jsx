'use client'

import Link from 'next/link'
import { useState } from 'react'

import { categoryOptions, dynamixAiPrinciples } from '@/lib/dynamix-ai-data'
import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixAiCategoriesPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)

  function saveCategory(item) {
    const nextState = {
      ...workflow,
      aiFlow: {
        ...workflow.aiFlow,
        enabled: true,
        categorySlug: item.slug,
        categoryTitle: item.title,
      },
      query: {
        ...workflow.query,
        travelerType:
          item.slug === 'family-memory-maker'
            ? 'Family'
            : item.slug === 'flexi-land-hack'
              ? 'Solo'
              : 'Couple',
        packageType: item.slug === 'flexi-land-hack' ? 'Land only' : 'Full package',
      },
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="grid lg:grid-cols-[1fr_0.72fr] gap-6">
        <div className="glass rounded-[28px] p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] dynamix-subtle font-mono">AI Flow · Screen 1</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">Start from the category, not the city.</h1>
          <p className="dynamix-muted mt-4 max-w-3xl leading-7">
            A category-first travel OS should begin by asking what kind of holiday this is trying to become. The destination becomes a consequence of the category fit, not the first input.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {categoryOptions.map((item) => (
              <Link key={item.slug} href={`/dynamix/ai-blueprint?category=${item.slug}`} onClick={() => saveCategory(item)} className="rounded-[24px] border dynamix-card-soft p-5 hover:opacity-95 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-display font-semibold">{item.title}</h2>
                  <span className="px-3 py-2 rounded-full bg-red-600/10 border border-red-600/20 text-[10px] uppercase tracking-[0.16em] text-red-200">AI Fit</span>
                </div>
                <p className="text-sm dynamix-muted mt-3">{item.signal}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {item.outputs.map((output) => (
                    <span key={output} className="px-3 py-2 rounded-full border dynamix-card-strong text-[11px] uppercase tracking-[0.12em] dynamix-muted">{output}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="glass rounded-[28px] p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] dynamix-subtle font-mono">Top 3</p>
          <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">What makes this category-first</h2>
          <div className="space-y-4 mt-6">
            {dynamixAiPrinciples.map((item) => (
              <div key={item.title} className="rounded-2xl border dynamix-card-soft p-4">
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-sm dynamix-muted mt-2">{item.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}
