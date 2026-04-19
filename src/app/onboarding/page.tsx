'use client'

/**
 * NAMA OS — Onboarding Wizard v2
 * ────────────────────────────────
 * 6-step guided setup designed for a fast "aha moment" (target: <10 min).
 *
 *   Step 1 → Welcome          Company name, timezone, currency. ~1 min.
 *   Step 2 → Live AI Triage   WOW moment — animated AI lead extraction demo.  CANNOT be skipped.
 *   Step 3 → Connect Channels WhatsApp webhook + Email SMTP options. Skippable.
 *   Step 4 → Build Your Team  Invite up to 3 members with role selector. Skippable.
 *   Step 5 → AI Workspace     4 seed cards showing the workspace is already alive. Skippable.
 *   Step 6 → Launch           Full-screen celebration with CSS confetti. No going back.
 *
 * Progress persisted in localStorage under 'nama_onboarding_v2'.
 * Elapsed time is tracked from mount and displayed on the launch screen.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Zap, Phone, Users, Sparkles, Rocket,
  Check, ChevronRight, ChevronLeft, Copy, CheckCircle2,
  Loader, AlertCircle, ArrowRight, Mail, Brain,
  TrendingUp, FileText, BarChart3, Star,
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
  { id: 1, label: 'Welcome',    Icon: Building2, timing: '~1 min',  skippable: false },
  { id: 2, label: 'AI Triage',  Icon: Brain,     timing: '~2 min',  skippable: false },
  { id: 3, label: 'Channels',   Icon: Phone,     timing: '~2 min',  skippable: true  },
  { id: 4, label: 'Team',       Icon: Users,     timing: '~2 min',  skippable: true  },
  { id: 5, label: 'Workspace',  Icon: Sparkles,  timing: '~1 min',  skippable: true  },
  { id: 6, label: 'Launch',     Icon: Rocket,    timing: '',        skippable: false },
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

function useCopyToClipboard(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])
  return [copied, copy]
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
// Step 3 — Connect Channels
// ─────────────────────────────────────────────────────────────────────────────

function StepChannels() {
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/webhooks/whatsapp`
    : 'https://app.namatravel.com/api/v1/webhooks/whatsapp'

  const [waToken] = useState(() => `nama_${Math.random().toString(36).slice(2, 12)}`)
  const [waTokenCopied, copyWaToken]   = useCopyToClipboard()
  const [webhookCopied, copyWebhook]   = useCopyToClipboard()
  const [smtpHost, setSmtpHost]         = useState('')
  const [smtpUser, setSmtpUser]         = useState('')
  const [activeTab, setActiveTab]       = useState<'whatsapp' | 'email'>('whatsapp')

  return (
    <div className="space-y-5">
      {/* Tab toggle */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        {(['whatsapp', 'email'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'whatsapp' ? '📱 WhatsApp' : '✉️ Email SMTP'}
          </button>
        ))}
      </div>

      {activeTab === 'whatsapp' && (
        <div className="space-y-4">
          <div className="bg-[#0F172A] rounded-xl p-4 text-white">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">What you'll need</p>
            <p className="text-sm font-medium text-slate-300 leading-relaxed">
              A{' '}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[#14B8A6] underline font-bold">
                WhatsApp Business Platform
              </a>{' '}
              account from Meta → Your App → WhatsApp → Configuration.
            </p>
          </div>

          <div>
            <OLabel>Verify Token</OLabel>
            <div className="flex gap-2">
              <input value={waToken} readOnly className={OInput + ' font-mono flex-1'} />
              <button onClick={() => copyWaToken(waToken)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-all flex-shrink-0">
                {waTokenCopied ? <><CheckCircle2 size={13} className="text-emerald-500" /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
          </div>

          <div>
            <OLabel>Webhook URL</OLabel>
            <div className="flex gap-2">
              <input value={webhookUrl} readOnly className={OInput + ' font-mono flex-1 text-xs'} />
              <button onClick={() => copyWebhook(webhookUrl)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-all flex-shrink-0">
                {webhookCopied ? <><CheckCircle2 size={13} className="text-emerald-500" /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium">
              Subscribe to the <strong>messages</strong> field. Enquiries will appear in{' '}
              <strong>Query Inbox → M1 Triage</strong> automatically.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <OLabel>SMTP Host</OLabel>
              <input
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className={OInput}
              />
            </div>
            <div>
              <OLabel>SMTP Username</OLabel>
              <input
                value={smtpUser}
                onChange={e => setSmtpUser(e.target.value)}
                placeholder="you@yourco.com"
                className={OInput}
              />
            </div>
            <div>
              <OLabel>SMTP Port</OLabel>
              <input defaultValue="587" className={OInput} />
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Email channel lets clients reply to quotes and confirmations directly into NAMA.
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Build Your Team
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

const WORKSPACE_CARDS = [
  { icon: Brain,     label: '2 leads waiting for AI score', sub: 'Ready to triage in Query Inbox',    color: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: Sparkles,  label: 'AI Copilot ready',             sub: 'Chat with your AI travel advisor',   color: 'text-[#14B8A6]',  bg: 'bg-teal-50'   },
  { icon: BarChart3, label: 'Smart pricing benchmarks',     sub: 'Maldives, Bali, Europe loaded',       color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { icon: FileText,  label: 'First itinerary template',     sub: 'Maldives 5N honeymoon installed',     color: 'text-amber-600',  bg: 'bg-amber-50'  },
]

function StepWorkspace() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    // Stagger cards in on mount
    let i = 0
    const timer = setInterval(() => {
      i++
      setVisible(i)
      if (i >= WORKSPACE_CARDS.length) clearInterval(timer)
    }, 220)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 font-medium pb-1">
        Your workspace is already alive — here's what's waiting for you:
      </p>
      {WORKSPACE_CARDS.map((card, i) => (
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

  useEffect(() => {
    // Trigger confetti burst shortly after mount
    const t = setTimeout(() => setBurst(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      {/* Confetti burst container */}
      <div className="relative flex items-center justify-center w-28 h-28">
        {/* Particles */}
        {CONFETTI_PARTICLES.map(p => (
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
        <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">You're live!</h2>
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
  useAuth() // ensures auth context is available; user object unused directly

  // ── Persistent state ──────────────────────────────────────────────────────
  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)

  // Step 1
  const [welcome, setWelcome] = useState<WelcomeForm>({
    name: '', timezone: 'Asia/Kolkata', currency: 'INR',
  })

  // Step 4
  const [invites, setInvites] = useState<InviteRow[]>([
    { email: '', role: 'R3_SALES_MANAGER' },
  ])

  // Elapsed time tracking
  const startTimeRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)

  // ── Restore step from localStorage ───────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.step && parsed.step >= 1 && parsed.step <= 5) {
          setStep(parsed.step)
        }
        if (parsed.startTime) startTimeRef.current = parsed.startTime
      }
    } catch (_) { /* ignore parse errors */ }
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
    } catch (_) { /* ignore */ }
  }, [step])

  // ── Tick elapsed timer once on launch step ────────────────────────────────
  useEffect(() => {
    if (step !== 6) return
    const now = Math.floor((Date.now() - startTimeRef.current) / 1000)
    setElapsed(now)
  }, [step])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canSkip = STEPS[step - 1]?.skippable ?? false
  const isLastStep = step === 6

  const next = useCallback(async (skip = false) => {
    if (step === 6) return
    if (!skip) {
      setSaving(true)
      await new Promise(r => setTimeout(r, 500))
      setSaving(false)
    }
    setStep(s => s + 1)
  }, [step])

  const prev = useCallback(() => {
    if (step <= 1 || step === 6) return
    setStep(s => s - 1)
  }, [step])

  const finish = useCallback((destination: string) => {
    try { localStorage.removeItem(LS_KEY) } catch (_) { /* ignore */ }
    router.push(destination)
  }, [router])

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
          <span className="text-xs text-slate-400 font-medium">Step {step} of 6</span>
          {step < 6 && (
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
            {step < 6 && (
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
                        Let's get your workspace set up. Takes about a minute.
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
                        Connect your channels
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        Route WhatsApp messages and emails into NAMA automatically.
                      </p>
                    </>
                  )}
                  {step === 4 && (
                    <>
                      <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                        Build your team
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        Invite up to 3 people now. More can be added later.
                      </p>
                    </>
                  )}
                  {step === 5 && (
                    <>
                      <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                        Your AI workspace is alive
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        We've pre-loaded the essentials so you can start immediately.
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
              <StepChannels />
            )}

            {step === 4 && (
              <StepTeam invites={invites} onChange={setInvites} />
            )}

            {step === 5 && (
              <StepWorkspace />
            )}

            {step === 6 && (
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
          {step < 6 && (
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
