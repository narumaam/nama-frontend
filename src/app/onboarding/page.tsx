'use client'

/**
 * NAMA OS — Onboarding Wizard v2
 * ────────────────────────────────
 * 6-step guided setup designed for a fast "aha moment" (target: <10 min).
 *
 *   Step 1 → Welcome          Company name, timezone, currency. ~1 min.
 *   Step 2 → Live AI Triage   WOW moment — animated AI lead extraction demo.  CANNOT be skipped.
 *   Step 3 → AI Setup         Describe your agency → AI generates full config JSON. Skippable.
 *   Step 4 → Build Your Team  Invite up to 3 members with role selector. Skippable.
 *   Step 5 → AI Workspace     4 seed cards showing the workspace is already alive. Skippable.
 *   Step 6 → Launch           Full-screen celebration with CSS confetti. No going back.
 *
 * Progress persisted in localStorage under 'nama_onboarding_v2'.
 * Elapsed time is tracked from mount and displayed on the launch screen.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Building2, Zap, Wand2, Users, Sparkles, Rocket,
  Check, ChevronRight, ChevronLeft, CheckCircle2,
  Loader, ArrowRight, Brain,
  TrendingUp, FileText, BarChart3, Star, Pencil,
  MapPin, LayoutDashboard, Plug2, Phone, Mail, Globe, Copy,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CURRENCIES = ['INR', 'USD', 'EUR', 'AED', 'GBP', 'SGD', 'THB']
const TIMEZONES  = ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Asia/Bangkok']
const ROLES      = [
  { id: 'R3_SALES_MANAGER',  label: 'Sales',   desc: 'Leads + quotes' },
  { id: 'R4_OPS_EXECUTIVE',  label: 'Ops',     desc: 'Bookings + vendors' },
  { id: 'R5_FINANCE_ADMIN',  label: 'Finance', desc: 'Invoices + P&L' },
  { id: 'R2_ORG_ADMIN',      label: 'Admin',   desc: 'Full access' },
]

// Step config — icon, label, timing label, skippable flag
const STEPS = [
  { id: 1, label: 'Welcome',   Icon: Building2, timing: '~1 min',  skippable: false },
  { id: 2, label: 'AI Triage', Icon: Brain,     timing: '~2 min',  skippable: false },
  { id: 3, label: 'AI Setup',  Icon: Wand2,     timing: '~1 min',  skippable: true  },
  { id: 4, label: 'Channels',  Icon: Plug2,     timing: '~2 min',  skippable: true  },
  { id: 5, label: 'Team',      Icon: Users,     timing: '~2 min',  skippable: true  },
  { id: 6, label: 'Workspace', Icon: Sparkles,  timing: '~1 min',  skippable: true  },
  { id: 7, label: 'Launch',    Icon: Rocket,    timing: '',        skippable: false },
]

const LS_KEY = 'nama_onboarding_v2'

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI helpers
// ─────────────────────────────────────────────────────────────────────────────

const OInput = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#0F172A] placeholder-slate-400 focus:bg-white focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all'

function OLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">
      {children}
    </label>
  )
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m} minute${m > 1 ? 's' : ''}` : `${m}m ${s}s`
}

// ─────────────────────────────────────────────────────────────────────────────
// Top progress bar
// ─────────────────────────────────────────────────────────────────────────────

function ProgressBar({ current }: { current: number }) {
  const pct = Math.round(((current - 1) / (STEPS.length - 1)) * 100)
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
      <div
        className="h-full bg-[#14B8A6] rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step stepper (horizontal)
// ─────────────────────────────────────────────────────────────────────────────

function StepStepper({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-between w-full mb-10 relative">
      {/* connector line behind dots */}
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 z-0" />
      {STEPS.map((s) => {
        const done   = s.id < current
        const active = s.id === current
        return (
          <div key={s.id} className="flex flex-col items-center gap-1.5 z-10 flex-1">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 bg-white ${
              done   ? 'bg-[#14B8A6] border-[#14B8A6]' :
              active ? 'border-[#14B8A6]' :
                       'border-slate-200'
            }`}>
              {done
                ? <Check size={14} strokeWidth={3} className="text-white" style={{ background: '#14B8A6', borderRadius: '50%', padding: 1 }} />
                : <s.Icon size={14} className={active ? 'text-[#14B8A6]' : 'text-slate-300'} />
              }
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-tight ${
              active ? 'text-[#14B8A6]' : done ? 'text-emerald-600' : 'text-slate-300'
            }`}>
              {s.label}
            </span>
            {s.timing && (
              <span className="text-[9px] text-slate-300 font-medium">{s.timing}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Welcome
// ─────────────────────────────────────────────────────────────────────────────

interface WelcomeForm { name: string; timezone: string; currency: string }

function StepWelcome({ form, onChange }: {
  form: WelcomeForm
  onChange: (f: WelcomeForm) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <OLabel>Company Name</OLabel>
        <input
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Horizon Holidays Pvt. Ltd."
          className={OInput}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <OLabel>Timezone</OLabel>
          <select
            value={form.timezone}
            onChange={e => onChange({ ...form, timezone: e.target.value })}
            className={OInput}
          >
            {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <OLabel>Currency</OLabel>
          <select
            value={form.currency}
            onChange={e => onChange({ ...form, currency: e.target.value })}
            className={OInput}
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <p className="text-xs text-slate-400 font-medium pt-1">
        You can change these anytime in Settings → Organisation.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Live AI Triage Demo
// ─────────────────────────────────────────────────────────────────────────────

// AI triage sequence messages shown one-by-one during fake loading
const TRIAGE_STEPS = [
  'Extracting destination…',
  'Reading budget signals…',
  'Scoring lead intent…',
]

// Extracted fields revealed after loading
const EXTRACTED_FIELDS = [
  { label: 'Destination',  value: 'Maldives',          color: 'text-teal-600' },
  { label: 'Travelers',    value: '2 (Couple)',         color: 'text-teal-600' },
  { label: 'Budget',       value: '₹1.5L/pax',         color: 'text-teal-600' },
  { label: 'Style',        value: 'Luxury Honeymoon',  color: 'text-violet-600' },
  { label: 'Intent',       value: 'HIGH',              color: 'text-emerald-600' },
]

function StepAITriage() {
  const [phase, setPhase]         = useState<'idle' | 'loading' | 'done'>('idle')
  const [loadStep, setLoadStep]   = useState(0)   // 0-2 index into TRIAGE_STEPS
  const [ringPct, setRingPct]     = useState(0)   // 0-87 animated score ring
  const [visFields, setVisFields] = useState(0)   // how many extracted fields visible

  const runTriage = useCallback(async () => {
    if (phase !== 'idle') return
    setPhase('loading')
    setLoadStep(0)

    // Cycle through triage steps, ~600ms each
    for (let i = 0; i < TRIAGE_STEPS.length; i++) {
      setLoadStep(i)
      await new Promise(r => setTimeout(r, 650))
    }

    setPhase('done')

    // Reveal extracted fields one by one
    for (let i = 1; i <= EXTRACTED_FIELDS.length; i++) {
      await new Promise(r => setTimeout(r, 160 * i))
      setVisFields(i)
    }

    // Animate score ring 0 → 87
    const start = Date.now()
    const duration = 1200
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      setRingPct(Math.round(eased * 87))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [phase])

  // SVG ring dimensions
  const r = 36
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (ringPct / 100) * circumference

  return (
    <div className="space-y-5">
      {/* WhatsApp-style message bubble */}
      <div className="flex items-end gap-2">
        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0 text-white text-xs font-black">
          WA
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 max-w-xs">
          <p className="text-sm text-[#0F172A] font-medium leading-relaxed">
            Hi! Planning a Maldives honeymoon for 2 in Feb.
            Budget ₹3L. Private water villa please 🙏
          </p>
          <p className="text-[10px] text-slate-400 mt-1 text-right">10:42 AM</p>
        </div>
      </div>

      {/* Run AI triage button — or loading/results */}
      {phase === 'idle' && (
        <button
          onClick={runTriage}
          className="w-full flex items-center justify-center gap-2 bg-[#14B8A6] text-[#0F172A] py-3.5 rounded-xl font-black text-sm hover:bg-teal-400 active:scale-[0.98] transition-all shadow-lg shadow-[#14B8A6]/25"
        >
          <Brain size={16} />
          Run AI Triage
          <Zap size={14} />
        </button>
      )}

      {/* Loading sequence */}
      {phase === 'loading' && (
        <div className="bg-[#0F172A] rounded-xl p-4 flex flex-col gap-2">
          {TRIAGE_STEPS.map((msg, i) => (
            <div
              key={msg}
              className={`flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
                i < loadStep  ? 'text-[#14B8A6]' :
                i === loadStep ? 'text-white' :
                                 'text-slate-600'
              }`}
            >
              {i < loadStep
                ? <CheckCircle2 size={14} className="text-[#14B8A6] flex-shrink-0" />
                : i === loadStep
                ? <Loader size={14} className="animate-spin flex-shrink-0 text-[#14B8A6]" />
                : <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex-shrink-0" />
              }
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {phase === 'done' && (
        <div className="space-y-4">
          {/* Extracted fields */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 grid grid-cols-2 gap-y-3 gap-x-4">
            {EXTRACTED_FIELDS.map((f, i) => (
              <div
                key={f.label}
                className={`transition-all duration-300 ${i < visFields ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</p>
                <p className={`text-sm font-black ${f.color} flex items-center gap-1`}>
                  {f.value}
                  {i < visFields && <Check size={11} strokeWidth={3} className="text-emerald-500" />}
                </p>
              </div>
            ))}
          </div>

          {/* Score ring */}
          <div className="flex items-center gap-5 bg-[#0F172A] rounded-xl p-4">
            <svg width="88" height="88" viewBox="0 0 88 88" className="flex-shrink-0 -rotate-90">
              {/* Track */}
              <circle cx="44" cy="44" r={r} fill="none" stroke="#1E293B" strokeWidth="7" />
              {/* Progress */}
              <circle
                cx="44" cy="44" r={r}
                fill="none"
                stroke="#14B8A6"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-none"
              />
            </svg>
            <div>
              <p className="text-3xl font-black text-white">{ringPct}<span className="text-lg text-slate-400">%</span></p>
              <p className="text-sm font-black text-[#14B8A6] mt-0.5">HOT Lead · 87% conversion probability</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                NAMA just did in <strong className="text-white">3 seconds</strong> what takes your team 15 minutes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — AI Agency Setup
// ─────────────────────────────────────────────────────────────────────────────

// AgencyConfig TypeScript interface matching backend schema
interface AgencyConfigData {
  agency: {
    name: string
    type: string
    primary_destinations: string[]
    focus_segments: string[]
    team_size_estimate: number
  }
  roles: { name: string; type: string; permissions: string[]; count: number }[]
  team: { name: string; role: string; is_placeholder: boolean }[]
  dashboard_widgets: string[]
  initial_destinations: string[]
}

const QUICK_FILL_CHIPS = [
  {
    label: 'Luxury honeymoon specialist',
    text: "We're a 6-person luxury travel agency specialising in Maldives and Bali honeymoons. I'm the founder, we have 2 sales agents, 1 ops executive, and 1 finance person. High-end clientele, average booking value ₹3–5L.",
  },
  {
    label: 'Family & adventure tours',
    text: "An 8-person tour operator focused on family holidays and adventure travel to Bhutan, Nepal, and Rajasthan. 3 sales, 2 ops, 1 finance, 1 content, and me as founder.",
  },
  {
    label: 'Corporate travel management',
    text: "We manage corporate travel for 50+ companies. Team of 10: 4 sales/account managers, 3 ops, 1 finance, 1 tech, and me as admin. Primary destinations are Dubai, Singapore, London, and New York.",
  },
]

const GENERATION_STAGES = [
  { ms: 500,  label: 'Understanding your agency...',    icon: '🧠' },
  { ms: 1000, label: 'Building your team structure...', icon: '⚙️' },
  { ms: 1500, label: 'Configuring your workspace...',   icon: '✨' },
]

const WIDGET_LABELS: Record<string, string> = {
  leads: 'Leads pipeline',
  bookings: 'Bookings overview',
  revenue: 'Revenue tracker',
  agent_performance: 'Agent performance',
  destination_trends: 'Destination trends',
  quote_pipeline: 'Quote pipeline',
}

type AISetupPhase = 'input' | 'generating' | 'preview'

function StepAISetup({
  onConfigApplied,
}: {
  onConfigApplied: (config: AgencyConfigData) => void
}) {
  const [description, setDescription] = useState('')
  const [phase, setPhase]             = useState<AISetupPhase>('input')
  const [stageIndex, setStageIndex]   = useState(0)
  const [config, setConfig]           = useState<AgencyConfigData | null>(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [error, setError]             = useState('')

  // Run generation animation + API call
  const generate = useCallback(async () => {
    if (!description.trim() || phase === 'generating') return
    setPhase('generating')
    setStageIndex(0)
    setError('')

    // Kick off the stage animation loop
    const stageTimers: ReturnType<typeof setTimeout>[] = []
    GENERATION_STAGES.forEach((s, i) => {
      const t = setTimeout(() => setStageIndex(i), s.ms)
      stageTimers.push(t)
    })

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
      const res = await fetch('/api/v1/onboarding/generate-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ description }),
      })

      // Wait for animation to at least reach the last stage
      await new Promise(r => setTimeout(r, 1600))
      stageTimers.forEach(t => clearTimeout(t))

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setConfig(data.config)
      setPhase('preview')
    } catch (e) {
      stageTimers.forEach(t => clearTimeout(t))
      setError(String(e))
      setPhase('input')
    }
  }, [description, phase])

  // Apply config to backend and advance wizard.
  // Earlier this was fire-and-forget — wizard advanced even when the backend
  // rejected the config, leaving the user with a half-set-up workspace and
  // no error message. Now the wizard only advances on a real success; errors
  // are surfaced inline so the user can fix the input and retry.
  const applyConfig = useCallback(async () => {
    if (!config) return
    setApplyLoading(true)
    setError('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
      const res = await fetch('/api/v1/onboarding/apply-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ config }),
      })
      if (!res.ok) {
        const errBody: { detail?: string; error?: string } = await res.json().catch(() => ({}))
        const msg = errBody.detail || errBody.error || `Backend returned HTTP ${res.status}`
        throw new Error(msg)
      }
      // Success — advance the wizard.
      onConfigApplied(config)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save your setup. Please try again.'
      setError(msg)
    } finally {
      setApplyLoading(false)
    }
  }, [config, onConfigApplied])

  // ── Input phase ────────────────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div className="space-y-5">
        <div>
          <OLabel>Describe your agency</OLabel>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="e.g. We're a 8-person luxury travel agency focused on Maldives and Bali honeymoons. We have 3 sales agents, 2 ops, 1 finance person, and me as founder."
            className={OInput + ' resize-none leading-relaxed'}
          />
        </div>

        {/* Quick-fill chips */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick fill</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILL_CHIPS.map(chip => (
              <button
                key={chip.label}
                onClick={() => setDescription(chip.text)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:border-[#14B8A6] hover:text-[#0F172A] hover:bg-teal-50 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={generate}
          disabled={!description.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#14B8A6] text-[#0F172A] py-3.5 rounded-xl font-black text-sm hover:bg-teal-400 active:scale-[0.98] transition-all shadow-lg shadow-[#14B8A6]/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wand2 size={16} />
          Generate Setup
          <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  // ── Generating phase ───────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="space-y-4">
        <div className="bg-[#0F172A] rounded-xl p-5 flex flex-col gap-3">
          {GENERATION_STAGES.map((s, i) => (
            <div
              key={s.label}
              className={`flex items-center gap-3 text-sm font-medium transition-all duration-300 ${
                i < stageIndex  ? 'text-[#14B8A6]' :
                i === stageIndex ? 'text-white' :
                                   'text-slate-600'
              }`}
            >
              {i < stageIndex
                ? <CheckCircle2 size={16} className="text-[#14B8A6] flex-shrink-0" />
                : i === stageIndex
                ? <Loader size={16} className="animate-spin flex-shrink-0 text-[#14B8A6]" />
                : <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
              }
              <span className="text-lg">{s.icon}</span>
              {s.label}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 font-medium animate-pulse">
          AI is reading your description and generating your workspace configuration...
        </p>
      </div>
    )
  }

  // ── Preview phase ──────────────────────────────────────────────────────────
  if (phase === 'preview' && config) {
    const { agency, roles, dashboard_widgets, initial_destinations } = config
    return (
      <div className="space-y-4">
        {/* Agency type badge */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-full text-xs font-black text-[#14B8A6] uppercase tracking-widest">
            {agency.type.replace('_', ' ')}
          </span>
          <span className="text-sm font-black text-[#0F172A]">{agency.name}</span>
          <button
            onClick={() => setPhase('input')}
            className="ml-auto text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-all"
          >
            <Pencil size={11} /> Edit
          </button>
        </div>

        {/* Focus segments */}
        <div className="flex flex-wrap gap-1.5">
          {agency.focus_segments.map(seg => (
            <span
              key={seg}
              className="px-2.5 py-1 bg-violet-50 border border-violet-100 rounded-full text-[10px] font-black text-violet-700 uppercase tracking-widest"
            >
              {seg}
            </span>
          ))}
        </div>

        {/* Team / Roles */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your team structure</p>
            <button className="text-[10px] font-bold text-[#14B8A6] hover:underline flex items-center gap-0.5">
              <Pencil size={9} /> Edit
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {roles.map(role => (
              <div key={role.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    role.type === 'ADMIN'   ? 'bg-violet-500' :
                    role.type === 'SALES'   ? 'bg-[#14B8A6]' :
                    role.type === 'OPS'     ? 'bg-blue-500' :
                                              'bg-amber-500'
                  }`} />
                  <span className="text-sm font-bold text-[#0F172A]">{role.name}</span>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {role.count} {role.count === 1 ? 'person' : 'people'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-3">
            ~{agency.team_size_estimate} people total
          </p>
        </div>

        {/* Destinations */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin size={10} /> Focus destinations
            </p>
            <button className="text-[10px] font-bold text-[#14B8A6] hover:underline flex items-center gap-0.5">
              <Pencil size={9} /> Edit
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {initial_destinations.map(dest => (
              <span key={dest} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-[#0F172A]">
                {dest}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard widgets */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <LayoutDashboard size={10} /> Dashboard configured for your workflow
            </p>
            <button className="text-[10px] font-bold text-[#14B8A6] hover:underline flex items-center gap-0.5">
              <Pencil size={9} /> Edit
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {dashboard_widgets.map(widget => (
              <div key={widget} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                {WIDGET_LABELS[widget] ?? widget}
              </div>
            ))}
          </div>
        </div>

        {/* Apply CTA */}
        <button
          onClick={applyConfig}
          disabled={applyLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white py-3.5 rounded-xl font-black text-sm hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {applyLoading
            ? <><Loader size={14} className="animate-spin" /> Applying…</>
            : <>Looks good — Apply <ArrowRight size={15} /></>
          }
        </button>
      </div>
    )
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Connect Channels
// ─────────────────────────────────────────────────────────────────────────────

interface ChannelForm {
  whatsapp: string
  smtpHost: string
  smtpPort: string
  smtpEmail: string
  smtpPassword: string
}

function StepConnectChannels({
  form, onChange,
}: {
  form: ChannelForm
  onChange: (f: ChannelForm) => void
}) {
  const [waSaved, setWaSaved]       = useState(false)
  const [waSaving, setWaSaving]     = useState(false)
  const [smtpSaved, setSmtpSaved]   = useState(false)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [copied, setCopied]         = useState(false)

  const widgetSnippet = `<script
  src="https://getnama.app/widget.js"
  data-token="YOUR_TOKEN"
  data-color="#14B8A6"
  data-label="Plan a Trip"
></script>`

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(widgetSnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const saveWhatsApp = async () => {
    if (!form.whatsapp.trim()) return
    setWaSaving(true)
    try {
      await api.post('/api/v1/settings/whatsapp-number', { whatsapp_number: form.whatsapp.trim() })
      setWaSaved(true)
    } catch { /* best-effort */ } finally {
      setWaSaving(false)
    }
  }

  const saveSMTP = async () => {
    if (!form.smtpEmail.trim() || !form.smtpHost.trim()) return
    setSmtpSaving(true)
    try {
      await api.post('/api/v1/email-config', {
        smtp_host: form.smtpHost,
        smtp_port: parseInt(form.smtpPort) || 587,
        smtp_username: form.smtpEmail,
        smtp_password: form.smtpPassword,
        from_email: form.smtpEmail,
        from_name: 'Your Agency',
        use_tls: true,
      })
      setSmtpSaved(true)
    } catch { /* best-effort */ } finally {
      setSmtpSaving(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── WhatsApp Business ───────────────────────────────────────────── */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center text-white text-xs font-black flex-shrink-0">WA</div>
          <div className="flex-1">
            <p className="text-sm font-black text-[#0F172A]">WhatsApp Business</p>
            <p className="text-[11px] text-slate-500 font-medium">Leads from WhatsApp messages auto-captured</p>
          </div>
          {waSaved && <CheckCircle2 size={16} className="text-emerald-500" />}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <OLabel>Your Business WhatsApp Number</OLabel>
            <div className="flex gap-2">
              <input
                value={form.whatsapp}
                onChange={e => onChange({ ...form, whatsapp: e.target.value })}
                placeholder="+91 98765 43210"
                className={OInput + ' flex-1'}
                type="tel"
              />
              <button
                onClick={saveWhatsApp}
                disabled={!form.whatsapp.trim() || waSaving || waSaved}
                className="px-4 py-2.5 bg-[#0F172A] text-white text-xs font-black rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                {waSaving ? <Loader size={13} className="animate-spin" /> : waSaved ? <CheckCircle2 size={13} /> : <Phone size={13} />}
                {waSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Next step: In Meta WhatsApp Business Manager → Webhooks, paste your webhook URL:{' '}
            <code className="bg-slate-100 px-1 rounded text-slate-600">https://getnama.app/api/v1/whatsapp/webhook</code>
          </p>
        </div>
      </div>

      {/* ── Business Email (SMTP) ───────────────────────────────────────── */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Mail size={15} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-[#0F172A]">Business Email</p>
            <p className="text-[11px] text-slate-500 font-medium">Send quotes & proposals from your own domain</p>
          </div>
          {smtpSaved && <CheckCircle2 size={16} className="text-emerald-500" />}
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <OLabel>SMTP Host</OLabel>
              <input
                value={form.smtpHost}
                onChange={e => onChange({ ...form, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
                className={OInput}
              />
            </div>
            <div>
              <OLabel>Port</OLabel>
              <input
                value={form.smtpPort}
                onChange={e => onChange({ ...form, smtpPort: e.target.value })}
                placeholder="587"
                className={OInput}
                type="number"
              />
            </div>
          </div>
          <div>
            <OLabel>Email Address</OLabel>
            <input
              value={form.smtpEmail}
              onChange={e => onChange({ ...form, smtpEmail: e.target.value })}
              placeholder="bookings@youragency.com"
              className={OInput}
              type="email"
            />
          </div>
          <div>
            <OLabel>App Password</OLabel>
            <input
              value={form.smtpPassword}
              onChange={e => onChange({ ...form, smtpPassword: e.target.value })}
              placeholder="Google App Password / SMTP password"
              className={OInput}
              type="password"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveSMTP}
              disabled={!form.smtpEmail.trim() || !form.smtpHost.trim() || smtpSaving || smtpSaved}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0F172A] text-white py-2.5 rounded-xl text-xs font-black hover:bg-slate-800 disabled:opacity-40 transition-all"
            >
              {smtpSaving ? <Loader size={13} className="animate-spin" /> : smtpSaved ? <CheckCircle2 size={13} /> : <Mail size={13} />}
              {smtpSaved ? 'Email connected ✓' : 'Connect Email'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            Gmail users: use an App Password (Google Account → Security → 2FA → App passwords)
          </p>
        </div>
      </div>

      {/* ── Website Widget ──────────────────────────────────────────────── */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-[#14B8A6] flex items-center justify-center flex-shrink-0">
            <Globe size={15} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-[#0F172A]">Website Lead Widget</p>
            <p className="text-[11px] text-slate-500 font-medium">Capture leads from your travel website</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Paste this snippet before <code className="bg-slate-100 px-1 rounded">&lt;/body&gt;</code> on your website. Replace <code className="bg-slate-100 px-1 rounded">YOUR_TOKEN</code> with your widget token from{' '}
            <strong className="text-[#14B8A6]">Settings → Widget</strong> after setup.
          </p>
          <div className="relative">
            <pre className="bg-[#0F172A] text-[#14B8A6] text-[10px] font-mono rounded-xl p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {widgetSnippet}
            </pre>
            <button
              onClick={copySnippet}
              className="absolute top-2 right-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Build Your Team
// ─────────────────────────────────────────────────────────────────────────────

interface InviteRow { email: string; role: string }

function StepTeam({ invites, onChange }: {
  invites: InviteRow[]
  onChange: (rows: InviteRow[]) => void
}) {
  const setRow = (i: number, patch: Partial<InviteRow>) =>
    onChange(invites.map((r, j) => j === i ? { ...r, ...patch } : r))

  const canAdd = invites.length < 3

  return (
    <div className="space-y-5">
      {/* Role capability pills */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => (
          <div key={r.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-[10px] font-black text-[#0F172A] uppercase tracking-widest">{r.label}:</span>
            <span className="text-[10px] text-slate-500 font-medium">{r.desc}</span>
          </div>
        ))}
      </div>

      {/* Invite rows */}
      <div className="space-y-3">
        {invites.map((inv, i) => (
          <div key={i} className="flex gap-3 items-end">
            <div className="flex-1">
              {i === 0 && <OLabel>Email Address</OLabel>}
              <input
                type="email"
                value={inv.email}
                onChange={e => setRow(i, { email: e.target.value })}
                placeholder="colleague@yourco.com"
                className={OInput}
              />
            </div>
            <div className="w-40 flex-shrink-0">
              {i === 0 && <OLabel>Role</OLabel>}
              <select
                value={inv.role}
                onChange={e => setRow(i, { role: e.target.value })}
                className={OInput}
              >
                {ROLES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {canAdd && (
        <button
          type="button"
          onClick={() => onChange([...invites, { email: '', role: 'R3_SALES_MANAGER' }])}
          className="text-xs font-black text-[#14B8A6] hover:underline flex items-center gap-1"
        >
          + Add another member
        </button>
      )}
      {!canAdd && (
        <p className="text-xs text-slate-400 font-medium">
          Maximum 3 invites during onboarding. Add more from Settings → Team later.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — AI Workspace
// ─────────────────────────────────────────────────────────────────────────────

function StepWorkspace({
  leads,
  itinerary,
  loading,
}: {
  leads: Array<{ full_name: string; destination: string; status: string }>
  itinerary: { title: string } | null
  loading: boolean
}) {
  const [visible, setVisible] = useState(0)

  // Build dynamic cards from real seeded data
  const cards = [
    {
      icon: Brain,
      label: leads.length > 0 ? `${leads.length} lead${leads.length > 1 ? 's' : ''} ready to triage` : '2 leads ready to triage',
      sub: leads.length > 0
        ? leads.map(l => l.full_name).join(' · ')
        : 'Aarav & Priya Sharma · Mehta Family',
      color: 'text-violet-600', bg: 'bg-violet-50',
    },
    {
      icon: FileText,
      label: itinerary ? itinerary.title : '7N Maldives Luxury Package',
      sub: 'First itinerary seeded — ready to customise',
      color: 'text-amber-600', bg: 'bg-amber-50',
    },
    {
      icon: Sparkles,
      label: 'AI Copilot ready',
      sub: 'Chat with your AI travel advisor any time',
      color: 'text-[#14B8A6]', bg: 'bg-teal-50',
    },
    {
      icon: BarChart3,
      label: 'Smart pricing loaded',
      sub: 'Maldives, Bali, Europe benchmarks active',
      color: 'text-blue-600', bg: 'bg-blue-50',
    },
  ]

  useEffect(() => {
    if (loading) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setVisible(i)
      if (i >= cards.length) clearInterval(timer)
    }, 220)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Seeding your workspace…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 font-medium pb-1">
        Your workspace is live — here&apos;s what&apos;s already waiting for you:
      </p>
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm transition-all duration-500 ${
            i < visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
            <card.icon size={18} className={card.color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-[#0F172A] truncate">{card.label}</p>
            <p className="text-xs text-slate-400 font-medium">{card.sub}</p>
          </div>
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
        </div>
      ))}

      {/* WhatsApp channel connection card */}
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 text-lg">💬</div>
          <div className="flex-1">
            <p className="text-sm font-black text-[#0F172A]">Connect WhatsApp (optional)</p>
            <p className="text-xs text-slate-500 mt-0.5">Get leads automatically from WhatsApp messages</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="text-[10px] bg-white border border-green-200 px-2 py-1 rounded text-slate-600 font-mono flex-1 truncate">
                {typeof window !== 'undefined' ? window.location.origin : 'https://getnama.app'}/api/v1/whatsapp/webhook
              </code>
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined') {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/api/v1/whatsapp/webhook`
                    )
                  }
                }}
                className="text-[10px] font-bold text-green-700 hover:text-green-800 whitespace-nowrap"
              >
                Copy →
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Paste this URL in your Meta WhatsApp Business dashboard → Webhooks</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Launch (confetti + celebration)
// ─────────────────────────────────────────────────────────────────────────────

// 20 confetti particles: random colours, sizes, angles, distances
const CONFETTI_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  color: ['#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#10B981'][i % 6],
  size: 6 + (i % 4) * 2,
  angle: (i / 20) * 360,
  distance: 80 + (i % 5) * 30,
  delay: i * 40,
}))

function StepLaunch({ elapsed, onDashboard, onFirstLead }: {
  elapsed: number
  onDashboard: () => void
  onFirstLead: () => void
}) {
  const [burst, setBurst] = useState(false)
  // Tier 6C: respect prefers-reduced-motion. Users with vestibular sensitivity
  // get a static celebration instead of the spinning confetti burst.
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    // Skip the burst entirely if the user prefers reduced motion.
    if (!mql.matches) {
      const t = setTimeout(() => setBurst(true), 200)
      return () => { clearTimeout(t); mql.removeEventListener('change', handler) }
    }
    return () => mql.removeEventListener('change', handler)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      {/* Confetti burst container */}
      <div className="relative flex items-center justify-center w-28 h-28">
        {/* Particles — skipped when prefers-reduced-motion is set */}
        {!reducedMotion && CONFETTI_PARTICLES.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              transform: burst
                ? `rotate(${p.angle}deg) translateX(${p.distance}px) scale(1)`
                : 'rotate(0deg) translateX(0px) scale(0)',
              opacity: burst ? 0 : 1,
              transition: `transform 800ms cubic-bezier(0.22,1,0.36,1) ${p.delay}ms, opacity 400ms ease 600ms`,
            }}
          />
        ))}

        {/* Center emoji badge */}
        <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-[#14B8A6] to-teal-300 flex items-center justify-center shadow-xl shadow-teal-200">
          <span className="text-4xl select-none">🎉</span>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">You&apos;re live!</h2>
        <p className="text-slate-500 font-medium mt-1.5">
          Setup complete in{' '}
          <span className="text-[#14B8A6] font-black">{formatElapsed(elapsed)}</span>
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { Icon: Building2, text: 'Company configured' },
          { Icon: Brain,     text: 'AI Triage active' },
          { Icon: TrendingUp, text: 'Workspace ready' },
        ].map(({ Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
            <Icon size={12} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">{text}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 w-full pt-2">
        <button
          onClick={onFirstLead}
          className="w-full flex items-center justify-center gap-2 bg-[#14B8A6] text-[#0F172A] py-4 rounded-xl font-black text-base hover:bg-teal-400 active:scale-[0.98] transition-all shadow-lg shadow-[#14B8A6]/30"
        >
          <Star size={18} />
          See My First Lead
          <ArrowRight size={18} />
        </button>
        <button
          onClick={onDashboard}
          className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white py-3.5 rounded-xl font-black text-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
        >
          <Rocket size={16} />
          Explore Dashboard
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const auth = useAuth()

  // ── Persistent state ──────────────────────────────────────────────────────
  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)

  // Step 1
  const [welcome, setWelcome] = useState<WelcomeForm>({
    name: '', timezone: 'Asia/Kolkata', currency: 'INR',
  })

  // Step 3 — AI Setup
  const [agencyConfig, setAgencyConfig] = useState<AgencyConfigData | null>(null)

  // Step 4 — Connect Channels
  const [channels, setChannels] = useState<ChannelForm>({
    whatsapp: '', smtpHost: '', smtpPort: '587', smtpEmail: '', smtpPassword: '',
  })

  // Step 5 — Team
  const [invites, setInvites] = useState<InviteRow[]>([
    { email: '', role: 'R3_SALES_MANAGER' },
  ])
  const [inviteSendState, setInviteSendState] = useState<'idle' | 'sending' | 'done'>('idle')

  // Step 5 — real seeded workspace data
  const [seededLeads, setSeededLeads] = useState<Array<{ full_name: string; destination: string; status: string }>>([])
  const [seededItinerary, setSeededItinerary] = useState<{ title: string } | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)

  // Elapsed time tracking
  const startTimeRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)

  // ── Restore step from localStorage ───────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.step && parsed.step >= 1 && parsed.step <= 6) {
          setStep(parsed.step)
        }
        if (parsed.startTime) startTimeRef.current = parsed.startTime
      }
    } catch { /* ignore parse errors */ }
  }, [])

  // ── Persist step to localStorage ─────────────────────────────────────────
  useEffect(() => {
    try {
      const existing = localStorage.getItem(LS_KEY)
      const prev = existing ? JSON.parse(existing) : {}
      localStorage.setItem(LS_KEY, JSON.stringify({
        ...prev,
        step,
        startTime: prev.startTime ?? startTimeRef.current,
      }))
    } catch { /* ignore */ }
  }, [step])

  // ── Tick elapsed timer once on launch step ────────────────────────────────
  useEffect(() => {
    if (step !== 7) return
    const now = Math.floor((Date.now() - startTimeRef.current) / 1000)
    setElapsed(now)
  }, [step])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canSkip = STEPS[step - 1]?.skippable ?? false
  const isLastStep = step === 7

  const next = useCallback(async (skip = false) => {
    if (step === 7) return

    // Step 5 → send invites before advancing
    if (step === 5 && !skip) {
      const filled = invites.filter(i => i.email.trim())
      if (filled.length > 0) {
        setInviteSendState('sending')
        await Promise.allSettled(
          filled.map(inv =>
            api.post('/api/v1/settings/team/invite', { email: inv.email.trim(), role: inv.role }).catch(() => null)
          )
        )
        setInviteSendState('done')
      }
    }

    // Step 5 → 6: seed workspace and fetch real data to show in Step 6
    if (step === 5) {
      setWorkspaceLoading(true)
      try {
        await api.post('/api/v1/onboarding/seed-workspace', {})
        localStorage.setItem('nama_workspace_seeded', '1')
        // Fetch seeded leads to show in Step 5
        try {
          const data = await api.get<{items?: unknown[]} | unknown[]>('/api/v1/leads?limit=3')
          const leads = Array.isArray(data) ? data : ((data as {items?: unknown[]}).items ?? [])
          setSeededLeads((leads as []).slice(0, 2))
        } catch { /* best-effort */ }
        // Fetch seeded itineraries
        try {
          const itnData = await api.get<{items?: unknown[]} | unknown[]>('/api/v1/itineraries?limit=1')
          const itns = Array.isArray(itnData) ? itnData : ((itnData as {items?: unknown[]}).items ?? [])
          if (itns.length > 0) setSeededItinerary(itns[0] as never)
        } catch { /* best-effort */ }
      } catch { /* best-effort */ }
      setWorkspaceLoading(false)
    }

    if (!skip) {
      setSaving(true)
      await new Promise(r => setTimeout(r, 300))
      setSaving(false)
    }
    setStep(s => s + 1)
  }, [step, invites])

  const prev = useCallback(() => {
    if (step <= 1 || step === 7) return
    setStep(s => s - 1)
  }, [step])

  const finish = useCallback((destination: string) => {
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }

    const userEmail = auth.user?.email ?? ''
    const userName  = welcome.name || auth.user?.email?.split('@')[0] || ''
    const agencyName = agencyConfig?.agency?.name || welcome.name || 'Your Agency'

    // Fire Day 0 drip email with the actual user email
    api.post('/api/v1/onboarding/trigger-drip', { email: userEmail, name: userName, agency_name: agencyName, day: 0 }).catch(() => {})

    // Schedule days 1, 3, 7 drip emails via backend
    api.post('/api/v1/onboarding/schedule-drip', { email: userEmail, name: userName, agency_name: agencyName }).catch(() => {})

    router.push(destination)
  }, [router, welcome, agencyConfig, auth.user])

  const currentStepConfig = STEPS[step - 1]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="h-14 bg-white border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#0F172A] rounded-lg flex items-center justify-center font-black text-white text-xs">
            N
          </div>
          <span className="font-black text-[#0F172A] text-sm">NAMA OS</span>
        </div>

        {/* Compact progress bar in header */}
        <div className="flex-1 max-w-xs mx-6">
          <ProgressBar current={step} />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Step {step} of 7</span>
          {step < 7 && (
            <button
              onClick={() => finish('/dashboard')}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-bold transition-colors"
            >
              Skip all →
            </button>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">

          {/* Step stepper */}
          <StepStepper current={step} />

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">

            {/* Card header — hidden on launch step */}
            {step < 7 && (
              <div className="mb-7 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center flex-shrink-0">
                  <currentStepConfig.Icon size={20} className="text-[#14B8A6]" />
                </div>
                <div>
                  {step === 1 && (
                    <>
                      <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                        Your travel business. Automated.
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        Let&apos;s get your workspace set up. Takes about a minute.
                      </p>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                        Watch NAMA qualify a lead in 3 seconds
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        This is the AI that runs every inbound enquiry automatically.
                      </p>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                        Let AI set up your agency in 30 seconds
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        Describe your agency and we&apos;ll configure your team, roles, and dashboard automatically.
                      </p>
                    </>
                  )}
                  {step === 4 && (
                    <>
                      <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                        Connect your channels
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        WhatsApp, email, and website widget — set up now or skip and do it later.
                      </p>
                    </>
                  )}
                  {step === 5 && (
                    <>
                      <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                        Build your team
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        Invite up to 3 people now. More can be added later.
                      </p>
                    </>
                  )}
                  {step === 6 && (
                    <>
                      <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                        Your AI workspace is alive
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        We&apos;ve pre-loaded the essentials so you can start immediately.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Step bodies ─────────────────────────────────────────── */}
            {step === 1 && (
              <StepWelcome form={welcome} onChange={setWelcome} />
            )}

            {step === 2 && (
              <StepAITriage />
            )}

            {step === 3 && (
              <StepAISetup
                onConfigApplied={(cfg) => {
                  setAgencyConfig(cfg)
                  next(false)
                }}
              />
            )}

            {step === 4 && (
              <StepConnectChannels form={channels} onChange={setChannels} />
            )}

            {step === 5 && (
              <>
                <StepTeam invites={invites} onChange={setInvites} />
                {inviteSendState === 'done' && (
                  <div className="mt-3 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                    <CheckCircle2 size={15} /> Invites sent — they&apos;ll receive an email to join your workspace.
                  </div>
                )}
              </>
            )}

            {step === 6 && (
              <StepWorkspace
                leads={seededLeads}
                itinerary={seededItinerary}
                loading={workspaceLoading}
              />
            )}

            {step === 7 && (
              <StepLaunch
                elapsed={elapsed}
                onDashboard={() => finish('/dashboard')}
                onFirstLead={() => finish('/dashboard/leads')}
              />
            )}

            {/* ── Bottom navigation (hidden on launch step) ───────────── */}
            {!isLastStep && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                {/* Back */}
                <button
                  onClick={prev}
                  disabled={step === 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-all"
                >
                  <ChevronLeft size={15} /> Back
                </button>

                <div className="flex items-center gap-3">
                  {/* Skip — only on skippable steps */}
                  {canSkip && (
                    <button
                      onClick={() => next(true)}
                      className="px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
                    >
                      Skip
                    </button>
                  )}

                  {/* Continue */}
                  <button
                    onClick={() => next(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] text-white rounded-xl text-sm font-black hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {saving
                      ? <><Loader size={14} className="animate-spin" /> Saving…</>
                      : <>Continue <ChevronRight size={15} /></>
                    }
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Fine print below card */}
          {step < 7 && (
            <p className="text-center text-[11px] text-slate-300 font-medium mt-5">
              All settings can be changed later in{' '}
              <span className="text-slate-400 font-bold">Settings → Organisation</span>
            </p>
          )}

        </div>
      </div>
    </div>
  )
}
