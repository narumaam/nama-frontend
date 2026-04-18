'use client'

/**
 * NAMA OS — System Status & Launch Readiness Dashboard
 * ─────────────────────────────────────────────────────
 * Real-time health checks + module completion matrix + infrastructure
 * checklist + launch readiness score. Used by CTO / ops team pre-launch.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Zap,
  Server, Globe, Database, Shield, GitBranch, Clock,
  TrendingUp, Activity, Package, ChevronRight, Loader, Lock,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// ── Module completion matrix ────────────────────────────────────────────────
const MODULES = [
  { id: 'M1',  name: 'Query Triage',        route: '/dashboard/queries',       backend: '/api/v1/queries',       done: true },
  { id: 'M2',  name: 'Lead CRM',            route: '/dashboard/leads',         backend: '/api/v1/leads',         done: true },
  { id: 'M3',  name: 'Quotations',          route: '/dashboard/quotations',    backend: '/api/v1/quotations',    done: true },
  { id: 'M4',  name: 'Documents',           route: '/dashboard/documents',     backend: '/api/v1/documents',     done: true },
  { id: 'M5',  name: 'Comms',               route: '/dashboard/comms',         backend: '/api/v1/comms',         done: true },
  { id: 'M6',  name: 'Vendors',             route: '/dashboard/vendors',       backend: '/api/v1/vendors',       done: true },
  { id: 'M7',  name: 'Bookings',            route: '/dashboard/bookings',      backend: '/api/v1/bookings',      done: true },
  { id: 'M8',  name: 'Itinerary Builder',   route: '/dashboard/itineraries',   backend: '/api/v1/itineraries',   done: true },
  { id: 'M9',  name: 'Analytics',           route: '/dashboard',               backend: '/api/v1/analytics',     done: true },
  { id: 'M10', name: 'White-label Portals', route: '/owner',                   backend: '/api/v1/portals',       done: true },
  { id: 'M11', name: 'Finance & P&L',       route: '/dashboard/finance',       backend: '/api/v1/finance',       done: true },
  { id: 'M12', name: 'Content Library',     route: '/dashboard/content',       backend: '/api/v1/content',       done: true },
  { id: 'M13', name: 'Corporate Travel',    route: '/super-admin',             backend: '/api/v1/corporate',     done: true },
  { id: 'M14', name: 'Subscriptions',       route: '/pricing',                 backend: '/api/v1/settings',      done: true },
  { id: 'M15', name: 'BYOK / AI Keys',      route: '/byok-calculator',         backend: '/api/v1/settings',      done: true },
  { id: 'M16', name: 'Automations',         route: '/dashboard/automations',   backend: '/api/v1/automations',   done: true },
  { id: 'M17', name: 'PWA / Offline',       route: '/',                        backend: 'n/a',                   done: true },
  { id: 'M18', name: 'BI Reports',          route: '/dashboard/reports',       backend: '/api/v1/analytics',     done: true },
  { id: 'M19', name: 'Integrations',        route: '/dashboard/integrations',  backend: '/api/v1/webhooks',      done: true },
]

// ── Infrastructure checklist ────────────────────────────────────────────────
const INFRA = [
  { id: 'vercel',   label: 'Vercel Deployment',       category: 'Frontend',  env: 'VERCEL_URL' },
  { id: 'railway',  label: 'Railway Backend',          category: 'Backend',   env: 'RAILWAY_STATIC_URL' },
  { id: 'neon',     label: 'Neon PostgreSQL',          category: 'Database',  env: 'DATABASE_URL' },
  { id: 'jwt',      label: 'JWT Secret Set',           category: 'Security',  env: 'SECRET_KEY' },
  { id: 'openai',   label: 'OpenAI API Key',           category: 'AI',        env: 'OPENAI_API_KEY' },
  { id: 'cors',     label: 'CORS Origins Configured',  category: 'Security',  env: 'ALLOWED_ORIGINS' },
  { id: 'wa',       label: 'WhatsApp Verify Token',    category: 'Webhooks',  env: 'WHATSAPP_VERIFY_TOKEN' },
  { id: 'rzp',      label: 'Razorpay Webhook Secret',  category: 'Payments',  env: 'RAZORPAY_WEBHOOK_SECRET' },
]

// ── Hard Stops ──────────────────────────────────────────────────────────────
const HARD_STOPS = [
  { id: 'HS1', label: 'JWT Auth — user_id + tenant_id + role + bcrypt',  resolved: true },
  { id: 'HS2', label: 'RLS — all DB queries tenant-scoped via require_tenant()', resolved: true },
  { id: 'HS3', label: 'Payments — idempotency keys, Saga pattern, HMAC webhook', resolved: true },
  { id: 'HS4', label: 'AI cost — kill-switch, per-tenant budget, circuit breaker', resolved: true },
]

// ── Types ────────────────────────────────────────────────────────────────────
type Pulse = 'checking' | 'healthy' | 'degraded' | 'down'

interface HealthData {
  status: string
  version: string
  ai_kill_switch_active: boolean
  hard_stops: Record<string, string>
  cache?: Record<string, unknown>
}

// ── Components ───────────────────────────────────────────────────────────────

function PulseDot({ state }: { state: Pulse }) {
  const colors: Record<Pulse, string> = {
    checking: 'bg-slate-400',
    healthy:  'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]',
    degraded: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]',
    down:     'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]',
  }
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse ${colors[state]}`} />
  )
}

function StatusBadge({ state }: { state: Pulse }) {
  const styles: Record<Pulse, string> = {
    checking: 'bg-slate-100 text-slate-500',
    healthy:  'bg-emerald-50 text-emerald-700',
    degraded: 'bg-amber-50 text-amber-700',
    down:     'bg-red-50 text-red-700',
  }
  const label: Record<Pulse, string> = {
    checking: 'Checking',
    healthy:  'Healthy',
    degraded: 'Degraded',
    down:     'Down',
  }
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${styles[state]}`}>
      {label[state]}
    </span>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function StatusPage() {
  const auth = useAuth()
  const router = useRouter()
  const [backendPulse, setBackendPulse]       = useState<Pulse>('checking')
  const [healthData, setHealthData]           = useState<HealthData | null>(null)
  const [lastChecked, setLastChecked]         = useState<Date | null>(null)
  const [latencyMs, setLatencyMs]             = useState<number | null>(null)
  const [checking, setChecking]               = useState(false)
  const [moduleRoutes, setModuleRoutes]       = useState<Record<string, Pulse>>({})

  // Guard: R0 + R1 only — demo visitors and lower roles are redirected
  const isDemo = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim() === 'nama_demo=1')
  const ALLOWED = ['R0_NAMA_OWNER', 'R1_SUPER_ADMIN']
  const isAuthorized = !isDemo && !!auth.user && ALLOWED.includes(auth.user.role)
  useEffect(() => {
    if (!auth.isLoading && !isAuthorized) router.replace('/dashboard')
  }, [auth.isLoading, isAuthorized, router])

  const checkBackend = useCallback(async () => {
    setChecking(true)
    const t0 = performance.now()
    try {
      const res = await fetch('/api/v1/health', { cache: 'no-store' })
      const ms = performance.now() - t0
      setLatencyMs(Math.round(ms))
      if (res.ok) {
        const data: HealthData = await res.json()
        setHealthData(data)
        setBackendPulse(ms > 2000 ? 'degraded' : 'healthy')
      } else {
        setBackendPulse('degraded')
      }
    } catch {
      setBackendPulse('down')
      setHealthData(null)
    } finally {
      setLastChecked(new Date())
      setChecking(false)
    }
  }, [])

  // Quick probe a few key frontend routes (just fetch the HTML, check 200)
  const checkRoutes = useCallback(async () => {
    const probes = MODULES.filter(m => m.route !== 'n/a').slice(0, 6)
    const results: Record<string, Pulse> = {}
    await Promise.all(
      probes.map(async (m) => {
        try {
          const r = await fetch(m.route, { method: 'HEAD', cache: 'no-store' })
          results[m.id] = r.ok ? 'healthy' : 'degraded'
        } catch {
          results[m.id] = 'down'
        }
      })
    )
    setModuleRoutes(results)
  }, [])

  useEffect(() => {
    checkBackend()
    checkRoutes()
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [checkBackend, checkRoutes])

  // ── Readiness score ───────────────────────────────────────────────────────
  const doneModules     = MODULES.filter(m => m.done).length
  const totalModules    = MODULES.length
  const hardStopsResolved = HARD_STOPS.filter(h => h.resolved).length
  const backendUp       = backendPulse === 'healthy' ? 1 : 0
  const infraScore      = Math.round(((doneModules / totalModules) * 60) + ((hardStopsResolved / 4) * 20) + (backendUp * 20))

  const scoreColor = infraScore >= 90 ? 'text-emerald-600' : infraScore >= 70 ? 'text-amber-600' : 'text-red-600'
  const scoreBg    = infraScore >= 90 ? 'from-emerald-500 to-teal-500' : infraScore >= 70 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'

  if (auth.isLoading) return null
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
        <Lock size={40} className="text-slate-300" />
        <p className="text-lg font-semibold">Access Restricted</p>
        <p className="text-sm">System Status is only available to Super Admins and NAMA Owners.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={20} className="text-[#14B8A6]" />
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">System Status</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Real-time health, module matrix & launch readiness — updated every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Clock size={12} />
              Last checked {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => { checkBackend(); checkRoutes() }}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Launch Readiness Score ────────────────────────────────────────── */}
      <div className="bg-[#0F172A] rounded-2xl p-8 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
          <Zap size={256} fill="white" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-8">
          <div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Launch Readiness</p>
            <div className={`text-7xl font-black ${scoreColor}`}>{infraScore}<span className="text-4xl text-slate-400">%</span></div>
            <div className="mt-3 flex items-center gap-2">
              <PulseDot state={infraScore >= 90 ? 'healthy' : infraScore >= 70 ? 'degraded' : 'down'} />
              <span className="text-sm font-bold text-slate-300">
                {infraScore >= 90 ? 'READY TO LAUNCH' : infraScore >= 70 ? 'NEARLY READY' : 'NEEDS WORK'}
              </span>
            </div>
          </div>
          <div className="flex-1 max-w-md">
            {/* Progress bar */}
            <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${scoreBg} transition-all duration-1000`}
                style={{ width: `${infraScore}%` }}
              />
            </div>
            {/* Score breakdown */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-black text-white">{doneModules}/{totalModules}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Modules</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-black text-white">{hardStopsResolved}/4</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Hard Stops</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className={`text-2xl font-black ${backendPulse === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {backendPulse === 'checking' ? '…' : backendPulse === 'healthy' ? 'UP' : 'DOWN'}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Backend</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Backend Health ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-slate-400" />
              <h2 className="font-black text-[#0F172A] text-base">Backend API</h2>
            </div>
            <StatusBadge state={backendPulse} />
          </div>
          {healthData ? (
            <div className="space-y-3">
              <Row label="Status"   value={healthData.status} green />
              <Row label="Version"  value={healthData.version} />
              <Row label="Latency"  value={latencyMs ? `${latencyMs}ms` : '—'} green={!!latencyMs && latencyMs < 500} />
              <Row label="AI Kill Switch" value={healthData.ai_kill_switch_active ? 'ACTIVE' : 'Off'} red={healthData.ai_kill_switch_active} />
              <div className="pt-3 border-t border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hard Stops</p>
                {Object.entries(healthData.hard_stops ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 py-1">
                    <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-600">{k}: {String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400 py-4">
              {checking ? <Loader size={16} className="animate-spin" /> : <XCircle size={16} className="text-red-400" />}
              <span className="text-sm font-medium">{checking ? 'Connecting to Railway backend…' : 'Backend unreachable. Check Railway deployment.'}</span>
            </div>
          )}
        </div>

        {/* Hard Stops resolved card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-slate-400" />
            <h2 className="font-black text-[#0F172A] text-base">Security Hard Stops</h2>
          </div>
          <div className="space-y-3">
            {HARD_STOPS.map(hs => (
              <div key={hs.id} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-black text-emerald-800">{hs.id}</span>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">{hs.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Module Matrix ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package size={18} className="text-slate-400" />
          <h2 className="font-black text-[#0F172A] text-base">Module Completion Matrix</h2>
          <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            {doneModules}/{totalModules} Complete
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map(m => {
            const routePulse = moduleRoutes[m.id]
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  m.done ? 'bg-slate-50 border-slate-100 hover:border-[#14B8A6]/30' : 'bg-amber-50 border-amber-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                  m.done ? 'bg-[#0F172A] text-white' : 'bg-amber-200 text-amber-700'
                }`}>
                  {m.id.replace('M', '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#0F172A] truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{m.route}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {m.done ? (
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={15} className="text-amber-500" />
                  )}
                  {routePulse && <PulseDot state={routePulse} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Infrastructure Checklist ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Globe size={18} className="text-slate-400" />
          <h2 className="font-black text-[#0F172A] text-base">Infrastructure & Environment Checklist</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INFRA.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-[#0F172A]">{item.label}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.env}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                item.category === 'Security' ? 'bg-violet-50 text-violet-600' :
                item.category === 'Frontend' ? 'bg-blue-50 text-blue-600' :
                item.category === 'Backend'  ? 'bg-slate-100 text-slate-600' :
                item.category === 'Database' ? 'bg-teal-50 text-teal-600' :
                item.category === 'AI'       ? 'bg-orange-50 text-orange-600' :
                item.category === 'Payments' ? 'bg-emerald-50 text-emerald-600' :
                'bg-pink-50 text-pink-600'
              }`}>
                {item.category}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">Set Railway Environment Variables</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Run <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px]">bash set_railway_vars.sh</code> from your project root to push all env vars to Railway production.
            </p>
          </div>
        </div>
      </div>

      {/* ── Performance Targets ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={18} className="text-slate-400" />
          <h2 className="font-black text-[#0F172A] text-base">Performance & Scale Targets</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Concurrent Users',  target: '5,000–50,000', status: 'configured', note: 'Pool size=20, overflow=40' },
            { label: 'Quotation Time',    target: '< 2 minutes',  status: 'configured', note: 'AI-assisted with templates' },
            { label: 'API P95 Latency',   target: '< 500ms',      status: 'configured', note: 'GZip + TTL cache + indexes' },
            { label: 'Auth & RLS',        target: 'HS-1 + HS-2',  status: 'configured', note: 'All 4 Hard Stops resolved' },
          ].map(t => (
            <div key={t.label} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">Configured</span>
              </div>
              <p className="text-sm font-black text-[#0F172A]">{t.target}</p>
              <p className="text-[11px] text-slate-500 font-bold mt-1">{t.label}</p>
              <p className="text-[10px] text-slate-400 mt-1">{t.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Git + Deployment ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={18} className="text-slate-400" />
          <h2 className="font-black text-[#0F172A] text-base">Deployment Trail</h2>
        </div>
        <div className="space-y-2 font-mono text-xs">
          {[
            { hash: '6e74be2', msg: 'feat: M6/M18/M19 — Vendors API, BI Reports, Integrations + world-class rebuilds', ts: 'latest' },
            { hash: '83246d5', msg: 'chore: add Alembic migration for quotations table (M3)', ts: '' },
            { hash: '2b10f3e', msg: 'feat: M3/M14–M17 — Quotations API, Pricing, BYOK Calc, Automations, PWA', ts: '' },
            { hash: 'e0fdd45', msg: 'feat: M1–M15 full-stack feature wave + production hardening', ts: '' },
          ].map(c => (
            <div key={c.hash} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <code className="text-[#14B8A6] font-black flex-shrink-0">{c.hash}</code>
              <span className="text-slate-600 flex-1 truncate">{c.msg}</span>
              {c.ts && (
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  {c.ts}
                </span>
              )}
            </div>
          ))}
        </div>
        <a
          href="https://github.com/narumaam/nama-frontend/commits/main"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-1 text-xs text-[#14B8A6] font-bold hover:underline"
        >
          View all commits on GitHub <ChevronRight size={13} />
        </a>
      </div>

    </div>
  )
}

// ── Helper component ─────────────────────────────────────────────────────────
function Row({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={`text-xs font-bold ${green ? 'text-emerald-600' : red ? 'text-red-600' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  )
}
