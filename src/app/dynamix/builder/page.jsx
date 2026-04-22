'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GripVertical, MoveDown, MoveUp } from 'lucide-react'

import { builderItinerary, dynamixAi, dynamixWeather } from '@/lib/dynamix-data'
import { getAiPlaybook } from '@/lib/dynamix-ai-data'
import { defaultWorkflow, loadWorkflow, normalizeItineraryItems, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixBuilderPage() {
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const initialWorkflow = useMemo(() => loadWorkflow() || defaultWorkflow, [])
  const initialPlaybook = getAiPlaybook(initialWorkflow.aiFlow.categorySlug)
  const [myMarkup, setMyMarkup] = useState(() => initialWorkflow?.quote?.markup || (initialWorkflow.aiFlow.enabled ? initialPlaybook.markupSuggestion : 'Rs 14,120 per person'))
  const [finalPrice, setFinalPrice] = useState(() => loadWorkflow()?.selectedHoliday?.price || defaultWorkflow.selectedHoliday.price)
  const aiPlaybook = getAiPlaybook(workflow.aiFlow.categorySlug)
  const itinerarySource = workflow.aiFlow.enabled ? `ai:${workflow.aiFlow.categorySlug || 'default'}` : 'classic'
  const baseItinerary = workflow.aiFlow.enabled ? aiPlaybook.itinerary : builderItinerary
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const itineraryItems = workflow.itinerary?.items?.length && workflow.itinerary?.source === itinerarySource
    ? normalizeItineraryItems(workflow.itinerary.items)
    : normalizeItineraryItems(baseItinerary)
  const itinerarySuggestion = workflow.aiFlow.enabled
    ? aiPlaybook.pricingAdvice
    : dynamixAi.itinerary
  const pricingSuggestion = workflow.aiFlow.enabled
    ? aiPlaybook.pricingAdvice
    : dynamixAi.pricing

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
        price: 'Rs 1,28,000 per person',
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

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="grid lg:grid-cols-[1.04fr_0.96fr] gap-6 mb-6">
        <div className="glass rounded-[28px] p-8 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Step 3 · Builder</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mt-3">{workflow.selectedHoliday.title}.<br />Now build the exact sellable trip.</h1>
          <p className="text-zinc-400 mt-4 max-w-3xl">This is the deeper working screen that should appear only after the agent chooses a holiday.</p>
        </div>
        <div className="grid gap-3">
          {[
            ['Selected holiday', workflow.selectedHoliday.title],
            ['Current status', 'Draft ready for pricing'],
            ['Trip conditions', dynamixWeather.summary],
          ].map(([label, value]) => (
            <div key={label} className="glass rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-2">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {workflow.aiFlow.enabled ? (
        <section className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5 mb-6">
          <div className="glass rounded-[28px] p-6 border border-red-600/20 bg-[linear-gradient(180deg,rgba(229,9,20,0.10),rgba(255,255,255,0.02))]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">AI briefing</p>
            <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">{workflow.aiFlow.categoryTitle || 'AI-shaped holiday'}</h2>
            <div className="grid gap-3 mt-5">
              {[
                ['Blueprint', workflow.aiFlow.blueprint?.idealDestination || workflow.query.destination],
                ['Composer mode', workflow.aiFlow.composerMode || 'AI Modular Build'],
                ['Confidence', workflow.aiFlow.blueprint?.confidence || 'High'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-2">{label}</p>
                  <p className="text-sm text-zinc-200">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-[28px] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Selected AI modules</p>
            <div className="flex flex-wrap gap-3 mt-4">
              {(workflow.aiFlow.selectedModules || []).map((module) => (
                <span key={module} className="px-4 py-3 rounded-2xl border border-white/8 bg-white/5 text-sm text-zinc-300">{module}</span>
              ))}
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 mt-5">
              <h3 className="font-semibold text-sm mb-2">Commercial AI signal</h3>
              <p className="text-sm text-zinc-300">{workflow.aiFlow.blueprint?.commercialSignals?.[0] || 'Lead with the category story before itemized components.'}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid xl:grid-cols-[1.08fr_0.92fr_0.72fr] gap-5">
        <div className="glass rounded-[28px] p-6">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Itinerary panel</p>
            <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">Review the holiday flow</h2>
            <p className="text-sm text-zinc-400 mt-2">Drag and reorder the days to match how you want to sell the trip.</p>
          </div>
          <div className="space-y-4">
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
        </div>

        <div className="glass rounded-[28px] p-6">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Edit panel</p>
            <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">Change what the customer sees</h2>
          </div>
          <div className="space-y-4">
            {[
              ['Hotel tier', '4 Star Standard — Included'],
              ['Transfers', 'SIC / shared transfer'],
              ['Display currency', 'INR'],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">{label}</span>
                <div className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm">{value}</div>
              </div>
            ))}
            <label className="grid gap-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">My markup</span>
              <input
                value={myMarkup}
                onChange={(event) => applyMarkup(event.target.value)}
                className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
              />
            </label>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <h3 className="font-semibold text-sm mb-2">AI itinerary suggestion</h3>
              <p className="text-sm text-zinc-300">{itinerarySuggestion}</p>
            </div>
          </div>
        </div>

        <aside className="glass rounded-[28px] p-6">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Pricing panel</p>
            <h2 className="text-2xl font-display font-semibold tracking-tight mt-2">Per-person pricing</h2>
          </div>
          <div className="space-y-3">
            {[
              ['Net price', 'Rs 1,13,880 per person'],
              ['My markup', myMarkup],
              ['Selected add-ons', 'Rs 3,000 per person'],
              ['Final sell price', finalPrice],
            ].map(([label, value], idx) => (
              <div key={label} className={`flex items-center justify-between gap-3 py-3 ${idx < 3 ? 'border-b border-white/8' : ''}`}>
                <span className="text-zinc-400 text-sm">{label}</span>
                <strong className={`${idx === 3 ? 'text-xl' : 'text-sm'} font-semibold`}>{value}</strong>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 mt-5">
            <h3 className="font-semibold text-sm mb-2">AI pricing suggestion</h3>
            <p className="text-sm text-zinc-300">{pricingSuggestion}</p>
          </div>
          <div className="grid gap-3 mt-5">
            <Link href="/dynamix/send" className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold">Send quote</Link>
            <button className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-medium">Publish quote</button>
          </div>
        </aside>
      </section>
    </main>
  )
}
