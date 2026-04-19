'use client'

/**
 * NAMA OS — Infrastructure Sentinel
 * ──────────────────────────────────
 * Real-time usage monitoring across Vercel, Railway, and Neon Postgres.
 * Watches metrics against configurable warn/alert thresholds and displays
 * animated usage bars with color shifts (green → amber → red).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Server, Database, Cloud, RefreshCw, AlertTriangle,
  CheckCircle, Settings, Key, Clock, Lock, ChevronDown,
  ChevronUp, Bell, Loader2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceConfig { enabled: boolean }

interface SentinelConfig {
  warn_pct: number
  alert_pct: number
  alert_email: string
  vercel: ServiceConfig
  railway: ServiceConfig
  neon: ServiceConfig
}

interface ApiKeys {
  vercel_api_token: string
  vercel_team_id: string
  railway_api_token: string
  neon_api_key: string
  neon_project_id: string
}

interface VercelUsage {
  bandwidth_used_gb?: number
  bandwidth_limit_gb?: number
  edge_requests_used?: number
  serverless_gb_hours_used?: number
  serverless_gb_hours_limit?: number
  pct_bandwidth?: number | null
  pct_compute?: number | null
  error?: string
}

interface RailwayUsage {
  cost_dollars?: number
  limit_dollars?: number
  pct_cost?: number | null
  error?: string
}

interface NeonUsage {
  storage_bytes_used?: number
  storage_limit_bytes?: number
  compute_time_seconds?: number
  compute_limit_seconds?: number
  pct_storage?: number | null
  pct_compute?: number | null
  error?: string
}

interface UsageSnapshot {
  checked_at: string
  services: {
    vercel?: VercelUsage
    railway?: RailwayUsage
    neon?: NeonUsage
  }
  alerts_triggered: number
}

interface AlertRecord {
  ts: string
  service: string
  metric: string
  value: number
  threshold: number
  level: 'warn' | 'alert'
}

// ── Seed data — shown when API is unavailable ─────────────────────────────────

const SEED_SNAPSHOT: UsageSnapshot = {
  checked_at: new Date().toISOString(),
  alerts_triggered: 1,
  services: {
    vercel: {
      bandwidth_used_gb: 34.2,
      bandwidth_limit_gb: 1024,
      edge_requests_used: 281000,
      serverless_gb_hours_used: 18.4,
      serverless_gb_hours_limit: 1000,
      pct_bandwidth: 34,
      pct_compute: 18,
    },
    railway: {
      cost_dollars: 8.4,
      limit_dollars: 20,
      pct_cost: 42,
    },
    neon: {
      storage_bytes_used: 343932928,
      storage_limit_bytes: 536870912,
      compute_time_seconds: 20059,
      compute_limit_seconds: 690840,
      pct_storage: 64,
      pct_compute: 29,
    },
  },
}

const SEED_HISTORY: AlertRecord[] = [
  { ts: new Date(Date.now() - 1000 * 60 * 30).toISOString(), service: 'neon', metric: 'storage', value: 64, threshold: 50, level: 'warn' },
  { ts: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), service: 'railway', metric: 'cost', value: 42, threshold: 50, level: 'warn' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(bytes?: number): string {
  if (bytes == null) return '—'
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 ** 3)).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 ** 2)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function fmtSeconds(s?: number): string {
  if (s == null) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

// ── UsageBar ──────────────────────────────────────────────────────────────────

function UsageBar({ pct, warnPct, alertPct, label, sub }: {
  pct: number | null | undefined
  warnPct: number
  alertPct: number
  label: string
  sub?: string
}) {
  const isNull = pct == null
  const safeP = isNull ? 0 : Math.min(pct, 100)
  const color = isNull
    ? 'bg-slate-200'
    : safeP >= alertPct
      ? 'bg-red-500'
      : safeP >= warnPct
        ? 'bg-amber-400'
        : 'bg-emerald-500'

  const textColor = isNull
    ? 'text-slate-400'
    : safeP >= alertPct
      ? 'text-red-600'
      : safeP >= warnPct
        ? 'text-amber-600'
        : 'text-emerald-600'

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className={`text-xs font-black ${textColor}`}>
          {isNull ? 'No data' : `${safeP}%`}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${safeP}%` }}
        />
      </div>
      {sub && <p className="text-[10px] text-slate-400 mt-1 font-medium">{sub}</p>}
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ pct, warnPct, alertPct, error }: {
  pct: number | null | undefined
  warnPct: number
  alertPct: number
  error?: string
}) {
  if (error) {
    return (
      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
        No Key
      </span>
    )
  }
  if (pct == null) {
    return (
      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
        Unknown
      </span>
    )
  }
  if (pct >= alertPct) {
    return (
      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-50 text-red-700">
        Alert
      </span>
    )
  }
  if (pct >= warnPct) {
    return (
      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
        Warn
      </span>
    )
  }
  return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
      OK
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SentinelPage() {
  const auth = useAuth()
  const router = useRouter()

  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null)
  const [history, setHistory] = useState<AlertRecord[]>([])
  const [config, setConfig] = useState<SentinelConfig>({
    warn_pct: 50, alert_pct: 70, alert_email: '',
    vercel: { enabled: true }, railway: { enabled: true }, neon: { enabled: true },
  })
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    vercel_api_token: '', vercel_team_id: '',
    railway_api_token: '', neon_api_key: '', neon_project_id: '',
  })
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [useSeed, setUseSeed] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Role guard — R0 + R1 only
  const isDemo = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim() === 'nama_demo=1')
  const ALLOWED = ['R0_NAMA_OWNER', 'R1_SUPER_ADMIN']
  const isAuthorized = !isDemo && !!auth.user && ALLOWED.includes(auth.user.role)

  useEffect(() => {
    if (!auth.isLoading && !isAuthorized) router.replace('/dashboard')
  }, [auth.isLoading, isAuthorized, router])

  // Load config on mount
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/sentinel/config', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nama_token') ?? ''}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.config) setConfig(data.config)
        if (data.api_keys_configured) setConfiguredKeys(data.api_keys_configured)
      }
    } catch {
      // no-op — use defaults
    }
  }, [])

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/sentinel/history?limit=10', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nama_token') ?? ''}` },
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data.alerts ?? [])
      }
    } catch {
      setHistory(SEED_HISTORY)
    }
  }, [])

  // Run a check
  const runCheck = useCallback(async (silent = false) => {
    if (!silent) setChecking(true)
    try {
      const res = await fetch('/api/v1/sentinel/check', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nama_token') ?? ''}` },
      })
      if (res.ok) {
        const data: UsageSnapshot = await res.json()
        setSnapshot(data)
        setUseSeed(false)
        setLastChecked(new Date())
        // Reload history in case new alerts were appended
        loadHistory()
      } else {
        if (!silent && !snapshot) {
          setSnapshot(SEED_SNAPSHOT)
          setUseSeed(true)
        }
      }
    } catch {
      if (!silent && !snapshot) {
        setSnapshot(SEED_SNAPSHOT)
        setUseSeed(true)
        setHistory(SEED_HISTORY)
      }
    } finally {
      if (!silent) setChecking(false)
    }
  }, [snapshot, loadHistory])

  // Initial load
  useEffect(() => {
    if (!isAuthorized) return
    setLoading(true)
    Promise.all([loadConfig(), loadHistory(), runCheck()])
      .finally(() => setLoading(false))

    // Auto-refresh every 5 minutes
    intervalRef.current = setInterval(() => runCheck(true), 5 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized])

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/sentinel/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nama_token') ?? ''}`,
        },
        body: JSON.stringify({ config, api_keys: apiKeys }),
      })
      if (res.ok) {
        // Re-load config to get masked key status
        await loadConfig()
        // Reset plaintext key fields after save
        setApiKeys({ vercel_api_token: '', vercel_team_id: '', railway_api_token: '', neon_api_key: '', neon_project_id: '' })
      }
    } catch {
      // no-op
    } finally {
      setSaving(false)
    }
  }

  if (auth.isLoading || loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-slate-300" />
    </div>
  )

  if (!isAuthorized) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
      <Lock size={40} className="text-slate-300" />
      <p className="text-lg font-semibold">Access Restricted</p>
      <p className="text-sm">Infrastructure Sentinel is only available to Super Admins and NAMA Owners.</p>
    </div>
  )

  const services = snapshot?.services ?? {}
  const vercel = services.vercel as VercelUsage | undefined
  const railway = services.railway as RailwayUsage | undefined
  const neon = services.neon as NeonUsage | undefined

  const { warn_pct: warnPct, alert_pct: alertPct } = config

  // Aggregate worst status for overall indicator
  const allPcts = [
    vercel?.pct_bandwidth, vercel?.pct_compute,
    railway?.pct_cost,
    neon?.pct_storage, neon?.pct_compute,
  ].filter(p => p != null) as number[]

  const maxPct = allPcts.length > 0 ? Math.max(...allPcts) : null
  const overallStatus = maxPct == null ? 'unknown'
    : maxPct >= alertPct ? 'alert'
    : maxPct >= warnPct ? 'warn'
    : 'ok'

  const overallColors = {
    unknown: 'bg-slate-100 text-slate-500',
    ok:      'bg-emerald-50 text-emerald-700',
    warn:    'bg-amber-50 text-amber-700',
    alert:   'bg-red-50 text-red-700',
  }

  return (
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-[#14B8A6]" />
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Infrastructure Sentinel</h1>
            <span className={`ml-2 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${overallColors[overallStatus]}`}>
              {overallStatus === 'unknown' ? 'Unknown' : overallStatus === 'ok' ? 'All Clear' : overallStatus === 'warn' ? 'Warning' : 'Alert'}
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Real-time usage monitoring across Vercel, Railway, and Neon — auto-refresh every 5 min
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {useSeed && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
              Seed data — connect API keys to see live usage
            </span>
          )}
          {lastChecked && (
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Clock size={12} />
              {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => runCheck()}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking…' : 'Check Now'}
          </button>
        </div>
      </div>

      {/* ── Service cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Vercel */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Cloud size={16} className="text-blue-500" />
              </div>
              <div>
                <h2 className="font-black text-[#0F172A] text-sm leading-tight">Vercel</h2>
                <p className="text-[10px] text-slate-400 font-medium">Edge + Serverless</p>
              </div>
            </div>
            <StatusBadge pct={maxOf(vercel?.pct_bandwidth, vercel?.pct_compute)} warnPct={warnPct} alertPct={alertPct} error={vercel?.error} />
          </div>

          {vercel?.error === 'missing_credentials' ? (
            <NoKeyPlaceholder service="Vercel" />
          ) : (
            <>
              <UsageBar
                pct={vercel?.pct_bandwidth}
                warnPct={warnPct}
                alertPct={alertPct}
                label="Bandwidth"
                sub={vercel?.bandwidth_used_gb != null
                  ? `${vercel.bandwidth_used_gb.toFixed(1)} GB / ${vercel.bandwidth_limit_gb?.toFixed(0)} GB`
                  : undefined}
              />
              <UsageBar
                pct={vercel?.pct_compute}
                warnPct={warnPct}
                alertPct={alertPct}
                label="Serverless Compute"
                sub={vercel?.serverless_gb_hours_used != null
                  ? `${vercel.serverless_gb_hours_used.toFixed(1)} / ${vercel.serverless_gb_hours_limit?.toFixed(0)} GB-hrs`
                  : undefined}
              />
              {vercel?.edge_requests_used != null && (
                <p className="text-[10px] text-slate-400 mt-3 font-medium">
                  Edge requests: {vercel.edge_requests_used.toLocaleString()}
                </p>
              )}
              {vercel?.error && !['missing_credentials'].includes(vercel.error) && (
                <ErrorNote msg={vercel.error} />
              )}
            </>
          )}
        </div>

        {/* Railway */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                <Server size={16} className="text-purple-500" />
              </div>
              <div>
                <h2 className="font-black text-[#0F172A] text-sm leading-tight">Railway</h2>
                <p className="text-[10px] text-slate-400 font-medium">Backend hosting</p>
              </div>
            </div>
            <StatusBadge pct={railway?.pct_cost} warnPct={warnPct} alertPct={alertPct} error={railway?.error} />
          </div>

          {railway?.error === 'missing_credentials' ? (
            <NoKeyPlaceholder service="Railway" />
          ) : (
            <>
              <UsageBar
                pct={railway?.pct_cost}
                warnPct={warnPct}
                alertPct={alertPct}
                label="Monthly Cost"
                sub={railway?.cost_dollars != null
                  ? `$${railway.cost_dollars.toFixed(2)} / $${railway.limit_dollars?.toFixed(2)} limit`
                  : undefined}
              />
              {railway?.error && !['missing_credentials'].includes(railway.error) && (
                <ErrorNote msg={railway.error} />
              )}
            </>
          )}
        </div>

        {/* Neon */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                <Database size={16} className="text-teal-500" />
              </div>
              <div>
                <h2 className="font-black text-[#0F172A] text-sm leading-tight">Neon Postgres</h2>
                <p className="text-[10px] text-slate-400 font-medium">Serverless DB</p>
              </div>
            </div>
            <StatusBadge pct={maxOf(neon?.pct_storage, neon?.pct_compute)} warnPct={warnPct} alertPct={alertPct} error={neon?.error} />
          </div>

          {neon?.error === 'missing_credentials' ? (
            <NoKeyPlaceholder service="Neon" />
          ) : (
            <>
              <UsageBar
                pct={neon?.pct_storage}
                warnPct={warnPct}
                alertPct={alertPct}
                label="Storage"
                sub={neon?.storage_bytes_used != null
                  ? `${fmtBytes(neon.storage_bytes_used)} / ${fmtBytes(neon.storage_limit_bytes)}`
                  : undefined}
              />
              <UsageBar
                pct={neon?.pct_compute}
                warnPct={warnPct}
                alertPct={alertPct}
                label="Compute Time"
                sub={neon?.compute_time_seconds != null
                  ? `${fmtSeconds(neon.compute_time_seconds)} / ${fmtSeconds(neon.compute_limit_seconds)}`
                  : undefined}
              />
              {neon?.error && !['missing_credentials'].includes(neon.error) && (
                <ErrorNote msg={neon.error} />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Configuration panel ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <button
          onClick={() => setConfigOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-slate-400" />
            <span className="font-black text-[#0F172A] text-sm">Configuration</span>
            <span className="text-[10px] text-slate-400 font-medium ml-1">Thresholds + API keys</span>
          </div>
          {configOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {configOpen && (
          <div className="px-6 pb-6 border-t border-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">

              {/* Thresholds + email */}
              <div>
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">Thresholds</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Warn threshold (%) — current: {config.warn_pct}%
                    </label>
                    <input
                      type="range" min={10} max={90} step={5}
                      value={config.warn_pct}
                      onChange={e => setConfig(c => ({ ...c, warn_pct: +e.target.value }))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>10%</span><span>90%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Alert threshold (%) — current: {config.alert_pct}%
                    </label>
                    <input
                      type="range" min={20} max={99} step={5}
                      value={config.alert_pct}
                      onChange={e => setConfig(c => ({ ...c, alert_pct: +e.target.value }))}
                      className="w-full accent-red-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>20%</span><span>99%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Alert email</label>
                    <input
                      type="email"
                      placeholder="alerts@yourcompany.com"
                      value={config.alert_email}
                      onChange={e => setConfig(c => ({ ...c, alert_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6]"
                    />
                  </div>
                  <div className="flex gap-4">
                    {(['vercel', 'railway', 'neon'] as const).map(svc => (
                      <label key={svc} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config[svc].enabled}
                          onChange={e => setConfig(c => ({ ...c, [svc]: { enabled: e.target.checked } }))}
                          className="rounded accent-[#14B8A6]"
                        />
                        <span className="text-xs font-semibold text-slate-600 capitalize">{svc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* API Keys */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Key size={14} className="text-slate-400" />
                  <p className="text-xs font-black text-slate-700 uppercase tracking-widest">API Keys</p>
                  <span className="text-[10px] text-slate-400 font-medium">Stored in tenant settings. Leave blank to keep existing.</span>
                </div>
                <div className="space-y-3">
                  <KeyInput
                    label="Vercel API Token"
                    value={apiKeys.vercel_api_token}
                    onChange={v => setApiKeys(k => ({ ...k, vercel_api_token: v }))}
                    configured={!!configuredKeys.vercel_api_token}
                    placeholder="xxxxxxxx"
                  />
                  <KeyInput
                    label="Vercel Team ID"
                    value={apiKeys.vercel_team_id}
                    onChange={v => setApiKeys(k => ({ ...k, vercel_team_id: v }))}
                    configured={!!configuredKeys.vercel_team_id}
                    placeholder="team_xxxxxx"
                  />
                  <KeyInput
                    label="Railway API Token"
                    value={apiKeys.railway_api_token}
                    onChange={v => setApiKeys(k => ({ ...k, railway_api_token: v }))}
                    configured={!!configuredKeys.railway_api_token}
                    placeholder="xxxxxxxx"
                  />
                  <KeyInput
                    label="Neon API Key"
                    value={apiKeys.neon_api_key}
                    onChange={v => setApiKeys(k => ({ ...k, neon_api_key: v }))}
                    configured={!!configuredKeys.neon_api_key}
                    placeholder="xxxxxxxx"
                  />
                  <KeyInput
                    label="Neon Project ID"
                    value={apiKeys.neon_project_id}
                    onChange={v => setApiKeys(k => ({ ...k, neon_project_id: v }))}
                    configured={!!configuredKeys.neon_project_id}
                    placeholder="wispy-cloud-xxxxxx"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-50">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#14B8A6] text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {saving ? 'Saving…' : 'Save Config'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Alert history ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={16} className="text-slate-400" />
          <h2 className="font-black text-[#0F172A] text-sm">Alert History</h2>
          <span className="ml-auto text-[10px] font-bold text-slate-400">Last 10 alerts</span>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <CheckCircle size={32} className="text-emerald-300" />
            <p className="text-sm font-semibold">No alerts triggered</p>
            <p className="text-xs">All services are within healthy thresholds.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                  <th className="text-left py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                  <th className="text-left py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Metric</th>
                  <th className="text-right py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</th>
                  <th className="text-right py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Level</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((a, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">{fmtTs(a.ts)}</td>
                    <td className="py-2.5 px-3">
                      <span className="capitalize font-bold text-[#0F172A]">{a.service}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 capitalize">{a.metric}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">{a.value}%</td>
                    <td className="py-2.5 px-3 text-right">
                      {a.level === 'alert' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={9} /> Alert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={9} /> Warn
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function NoKeyPlaceholder({ service }: { service: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
      <Key size={24} className="text-slate-200" />
      <p className="text-xs font-semibold text-center">No API key for {service}</p>
      <p className="text-[10px] text-center">Open Configuration below to add credentials.</p>
    </div>
  )
}

function ErrorNote({ msg }: { msg: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
      <AlertTriangle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-[10px] text-red-600 font-medium">{msg}</p>
    </div>
  )
}

function KeyInput({ label, value, onChange, configured, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  configured: boolean
  placeholder: string
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1">
        {label}
        {configured && (
          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">SET</span>
        )}
      </label>
      <input
        type="password"
        placeholder={configured ? '•••••••••• (leave blank to keep)' : placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6] bg-slate-50"
      />
    </div>
  )
}

function maxOf(...vals: (number | null | undefined)[]): number | undefined {
  const filtered = vals.filter(v => v != null) as number[]
  return filtered.length > 0 ? Math.max(...filtered) : undefined
}
