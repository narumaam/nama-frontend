'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { defaultWorkflow, loadWorkflow, saveWorkflow } from '@/lib/dynamix-workflow'

export default function DynamixClassicPage() {
  const router = useRouter()
  const [workflow, setWorkflow] = useState(() => loadWorkflow() || defaultWorkflow)
  const [weather, setWeather] = useState(null)
  const [tripAssist, setTripAssist] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const destination = workflow.query.destination || 'Bali'

    fetch(`/api/dynamix/weather?destination=${encodeURIComponent(destination)}`)
      .then((response) => response.json())
      .then((data) => setWeather(data))
      .catch(() => setWeather(null))

    fetch(`/api/dynamix/assist?kind=trip&destination=${encodeURIComponent(destination)}`)
      .then((response) => response.json())
      .then((data) => setTripAssist(data.message || ''))
      .catch(() => setTripAssist(''))
  }, [workflow.query.destination])

  function updateField(key, value) {
    const nextState = {
      ...workflow,
      query: {
        ...workflow.query,
        [key]: value,
      },
    }
    setWorkflow(nextState)
    saveWorkflow(nextState)
  }

  async function continueToResults() {
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/dynamix/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Trip definition could not be saved.')
        return
      }

      const nextState = {
        ...workflow,
        searchId: data.searchId,
        meta: {
          ...workflow.meta,
          persisted: Boolean(data.persisted),
        },
      }

      setWorkflow(nextState)
      saveWorkflow(nextState)
      router.push('/dynamix/results')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className="glass rounded-[28px] p-8 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            Classic Dynamix Flow
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[0.94] mt-5">Start with the trip.<br /><span className="text-red-500">Not the itinerary.</span></h1>
          <p className="text-zinc-400 max-w-2xl mt-4 leading-7">This keeps the original structured Dynamix path intact for agents who want the faster, destination-led workflow already built.</p>
        </div>

        <div className="glass rounded-[28px] p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Create Holiday</p>
              <h2 className="text-3xl font-display font-semibold tracking-tight mt-2">Tell NAMA what to build.</h2>
            </div>
            <span className="px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.14em] text-zinc-400">Step 1 of 5</span>
          </div>
          <div className="grid gap-4">
            {[
              ['destination', 'Destination', ['Bali', 'Dubai', 'Thailand']],
              ['duration', 'No. of days', ['5 nights / 6 days', '4 nights / 5 days', '6 nights / 7 days']],
              ['pax', 'No. of pax', ['2 adults', '2 adults, 1 child', '4 adults']],
              ['startDate', 'Start date', ['2026-06-12', '2026-06-19']],
              ['endDate', 'End date', ['2026-06-18', '2026-06-24']],
              ['packageType', 'Package type', ['Full package', 'Land only']],
              ['travelerType', 'Who is travelling?', ['Couple', 'Family', 'Friends', 'Solo']],
            ].map(([key, label, options]) => (
              <label key={key} className="grid gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">{label}</span>
                <select
                  value={workflow.query[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                  className="px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white"
                >
                  {options.map((option) => <option key={option} value={option} className="bg-zinc-900">{option}</option>)}
                </select>
              </label>
            ))}
            <button
              type="button"
              onClick={continueToResults}
              disabled={submitting}
              className="mt-2 inline-flex items-center justify-center px-5 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg shadow-red-600/20 disabled:opacity-60"
            >
              {submitting ? 'Saving trip...' : 'Show matching holidays'}
            </button>
            {error ? <p className="text-sm text-amber-300">{error}</p> : null}
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <h3 className="font-semibold text-sm mb-2">{weather?.title || 'Weather for selected dates'}</h3>
              <p className="text-sm text-zinc-300">{weather?.summary || 'Loading forecast guidance for the selected destination.'}</p>
              <p className="text-xs text-zinc-500 mt-2">{weather?.salesHint || 'Use weather context to position upsells more confidently.'}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-emerald-500/10 p-4">
              <h3 className="font-semibold text-sm mb-2">AI trip assist</h3>
              <p className="text-sm text-zinc-300">{tripAssist || 'Preparing destination-aware trip guidance.'}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
