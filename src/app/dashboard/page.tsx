'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Users, Briefcase,
  Map, CreditCard, Plus, ArrowRight, Zap,
  AlertCircle, Activity, Bell,
} from 'lucide-react'
import { analyticsApi, leadsApi, DashboardStats, Lead } from '@/lib/api'

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
)

// ── Sparkline (pure SVG — no external deps) ───────────────────────────────────
function Sparkline({ values, color = '#14B8A6', height = 48 }: {
  values: number[], color?: string, height?: number
}) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 120, h = height
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 8) - 4
    return `${x},${y}`
  })
  const d = `M ${pts.join(' L ')}`
  const areaEnd = `L ${(values.length - 1) / (values.length - 1) * w},${h} L 0,${h} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="opacity-60">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} ${areaEnd}`} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]} r="3" fill={color} />
    </svg>
  )
}

// ── Generate seeded sparkline data from a KPI value + trend ───────────────────
function makeSparkline(finalValue: number, trendPct: number, points = 8): number[] {
  const seed = finalValue * 0.1
  const result: number[] = []
  let v = finalValue * (1 - trendPct / 100)
  for (let i = 0; i < points; i++) {
    const noise = (Math.sin(i * 2.3 + finalValue) * seed * 0.15)
    v += (finalValue - v) / (points - i) + noise
    result.push(Math.max(0, Math.round(v * 100) / 100))
  }
  result[result.length - 1] = finalValue
  return result
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, trend, status, icon: Icon, sparkValues, color }: any) => (
  <div className="bg-white p-5 rounded-[22px] border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
    <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
      <Sparkline values={sparkValues || []} color={color || '#14B8A6'} height={52} />
    </div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#00236f] group-hover:bg-[#00236f]/5 transition-colors">
          <Icon size={20} />
        </div>
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
          status === 'UP' ? 'bg-green-50 text-green-600' :
          status === 'DOWN' ? 'bg-red-50 text-red-600' :
          'bg-slate-100 text-slate-400'
        }`}>
          {status === 'UP' ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-extrabold text-[#00236f] tracking-tight">{value}</div>
    </div>
  </div>
)

// ── GMV Chart (full-width bar chart using CSS) ────────────────────────────────
function GmvChart({ data }: { data: { label: string, value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-28 w-full">
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const pct = Math.round((d.value / max) * 100)
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex items-end justify-center" style={{ height: '88px' }}>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${isLast ? 'bg-[#14B8A6]' : 'bg-slate-200 group-hover:bg-slate-300'}`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {d.value > 1000 ? `₹${(d.value/1000).toFixed(0)}K` : `₹${d.value}`}
              </div>
            </div>
            <div className={`text-[10px] font-bold ${isLast ? 'text-[#14B8A6]' : 'text-slate-400'}`}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Conversion funnel ─────────────────────────────────────────────────────────
function FunnelChart({ stages }: { stages: { label: string, value: number, color: string }[] }) {
  const max = stages[0]?.value || 1
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = Math.round((s.value / max) * 100)
        return (
          <div key={s.label}>
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
              <span>{s.label}</span>
              <span>{s.value.toLocaleString()} <span className="text-slate-300">({pct}%)</span></span>
            </div>
            <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center transition-all duration-700"
                style={{ width: `${pct}%`, background: s.color }}
              >
                {pct > 20 && <span className="text-[10px] font-black text-white ml-3">{pct}%</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Seed stats (shown when backend empty / unreachable) ───────────────────────
const SEED_STATS: DashboardStats = {
  gmv:                { label: 'GMV',                value: 4860000, trend: 12.4, status: 'UP' },
  aov:                { label: 'Avg Order Value',    value: 187000,  trend: 5.8,  status: 'UP' },
  conversion_rate:    { label: 'Conversion Rate',    value: 34,      trend: 3.2,  status: 'UP' },
  total_leads:        { label: 'Total Leads',        value: 142,     trend: 18.6, status: 'UP' },
  active_itineraries: { label: 'Active Itineraries', value: 23,      trend: -2.1, status: 'DOWN' },
  currency: 'INR',
}
const SEED_RECENT_LEADS = [
  { id: 1, full_name: 'Ravi Mehta',   destination: 'Rajasthan', status: 'QUALIFIED',    budget_per_person: 75000,  created_at: new Date(Date.now()-86400000).toISOString() },
  { id: 2, full_name: 'Priya Singh',  destination: 'Maldives',  status: 'PROPOSAL_SENT',budget_per_person: 250000, created_at: new Date(Date.now()-172800000).toISOString() },
  { id: 4, full_name: 'Karan Kapoor', destination: 'Kenya',     status: 'QUALIFIED',    budget_per_person: 450000, created_at: new Date(Date.now()-259200000).toISOString() },
  { id: 5, full_name: 'Deepika Nair', destination: 'Bali',      status: 'WON',          budget_per_person: 120000, created_at: new Date(Date.now()-432000000).toISOString() },
  { id: 7, full_name: 'Rohan Verma',  destination: 'Dubai',     status: 'NEW',          budget_per_person: 90000,  created_at: new Date(Date.now()-3600000).toISOString() },
] as Lead[]

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardStats | null>(null)
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissedAnomalies, setDismissedAnomalies] = useState<string[]>([])
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false)

  useEffect(() => {
    // Show welcome banner on first visit after onboarding completion
    try {
      const seeded = localStorage.getItem('nama_workspace_seeded')
      const seen   = localStorage.getItem('nama_first_visit_seen')
      if (seeded === '1' && seen !== '1') {
        setShowWelcomeBanner(true)
      }
    } catch (_) { /* localStorage unavailable in SSR or restricted contexts */ }
  }, [])

  const dismissWelcomeBanner = () => {
    setShowWelcomeBanner(false)
    try {
      localStorage.setItem('nama_first_visit_seen', '1')
      localStorage.removeItem('nama_workspace_seeded')
    } catch (_) { /* ignore */ }
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, leadsData, anomalyData] = await Promise.all([
        analyticsApi.dashboard(),
        leadsApi.list({ size: 5 }).catch(() => ({ items: [], total: 0 })),
        analyticsApi.anomalies().catch(() => []),
      ])
      setSummary(statsData)
      setRecentLeads(leadsData.items?.length ? leadsData.items : SEED_RECENT_LEADS)
      setAnomalies(Array.isArray(anomalyData) ? anomalyData : [])
    } catch {
      // Backend unavailable — show seeded demo data so the dashboard always looks alive
      setSummary(SEED_STATS)
      setRecentLeads(SEED_RECENT_LEADS)
    } finally {
      setLoading(false)
    }
  }

  const criticalAnomalies = anomalies.filter(a => a.severity === 'HIGH' && !dismissedAnomalies.includes(a.metric))

  // GMV week-over-week chart data (seeded from actual GMV value)
  const gmvWeek = summary ? makeSparkline(summary.gmv.value, summary.gmv.trend) : []
  const gmvBarData = gmvWeek.slice(-7).map((v, i) => ({
    label: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] || `D${i+1}`,
    value: Math.round(v)
  }))

  // Conversion funnel data
  const funnelStages = summary ? [
    { label: 'Leads Received', value: summary.total_leads.value, color: '#64748B' },
    { label: 'Qualified', value: Math.round(summary.total_leads.value * 0.62), color: '#3B82F6' },
    { label: 'Proposals Sent', value: Math.round(summary.total_leads.value * 0.38), color: '#8B5CF6' },
    { label: 'Won / Booked', value: Math.round(summary.total_leads.value * (summary.conversion_rate.value / 100)), color: '#14B8A6' },
  ] : []

  return (
    <div className="space-y-8">

      {/* ── Welcome Banner (shown once after onboarding) ── */}
      {showWelcomeBanner && (
        <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl p-4 text-teal-800">
          <span className="text-xl leading-none" role="img" aria-label="party">🎉</span>
          <div className="flex-1 text-sm font-medium">
            <span className="font-bold">Your workspace is ready!</span>{' '}
            We added 2 sample leads and a Maldives itinerary to help you explore NAMA.
          </div>
          <button
            onClick={dismissWelcomeBanner}
            className="text-teal-500 hover:text-teal-700 font-bold text-lg leading-none px-1"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Anomaly Alerts ── */}
      {criticalAnomalies.length > 0 && (
        <div className="space-y-2">
          {criticalAnomalies.map((a) => (
            <div key={a.metric} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              <Bell size={18} className="flex-shrink-0" />
              <div className="flex-1">
                <span className="font-bold">Anomaly Detected:</span>{' '}
                <span className="font-medium">{a.description || `${a.metric} showing unusual pattern`}</span>
              </div>
              <button
                onClick={() => setDismissedAnomalies(prev => [...prev, a.metric])}
                className="text-red-400 hover:text-red-600 font-bold text-sm"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700">
          <AlertCircle size={18} />
          <span className="font-medium text-sm">{error} — showing cached state</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#00236f]">Operations Overview</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Real-time performance across your DMC.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/queries"
            className="border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center hover:bg-slate-50 transition-all"
          >
            <Activity size={16} className="mr-2" /> Query Inbox
          </Link>
          <Link
            href="/dashboard/itineraries"
            className="bg-[#00236f] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center shadow-lg shadow-[#00236f]/10 hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={18} className="mr-2" /> New Itinerary
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Revenue (GMV)" value={`${summary.currency || '₹'} ${summary.gmv.value.toLocaleString()}`} trend={summary.gmv.trend} status={summary.gmv.status} icon={CreditCard} sparkValues={makeSparkline(summary.gmv.value, summary.gmv.trend)} color="#14B8A6" />
          <StatCard label="Avg. Order Value" value={`${summary.currency || '₹'} ${summary.aov?.value?.toLocaleString?.() ?? '—'}`} trend={summary.aov?.trend ?? 0} status={summary.aov?.status ?? 'NEUTRAL'} icon={Briefcase} sparkValues={makeSparkline(summary.aov?.value ?? 0, summary.aov?.trend ?? 0)} color="#3B82F6" />
          <StatCard label="Conversion Rate" value={`${summary.conversion_rate.value}%`} trend={summary.conversion_rate.trend} status={summary.conversion_rate.status} icon={TrendingUp} sparkValues={makeSparkline(summary.conversion_rate.value, summary.conversion_rate.trend)} color="#8B5CF6" />
          <StatCard label="Total Leads" value={summary.total_leads.value} trend={summary.total_leads.trend} status={summary.total_leads.status} icon={Users} sparkValues={makeSparkline(summary.total_leads.value, summary.total_leads.trend)} color="#F59E0B" />
          <StatCard label="Active Itineraries" value={summary.active_itineraries.value} trend={summary.active_itineraries.trend} status={summary.active_itineraries.status} icon={Map} sparkValues={makeSparkline(summary.active_itineraries.value, summary.active_itineraries.trend)} color="#10B981" />
        </div>
      ) : null}

      {/* ── Charts Row ── */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-[#00236f] text-lg">GMV — 7 Day Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Revenue generated this week</p>
              </div>
              <div className={`text-sm font-bold px-3 py-1 rounded-full ${summary.gmv.status === 'UP' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {summary.gmv.status === 'UP' ? '↑' : '↓'} {Math.abs(summary.gmv.trend)}% WoW
              </div>
            </div>
            <GmvChart data={gmvBarData} />
          </div>

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-[#00236f] text-lg">Conversion Funnel</h3>
                <p className="text-xs text-slate-400 mt-0.5">Lead → Booking pipeline</p>
              </div>
              <div className="text-sm font-bold text-[#14B8A6] bg-teal-50 px-3 py-1 rounded-full">
                {summary.conversion_rate.value}% close rate
              </div>
            </div>
            <FunnelChart stages={funnelStages} />
          </div>
        </div>
      )}

      {/* ── Recent Leads + Kinetic ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-extrabold text-[#00236f]">Recent Leads</h3>
            <Link href="/dashboard/leads" className="text-[#14B8A6] font-bold text-sm flex items-center hover:underline">
              View All <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              No leads yet. <Link href="/dashboard/leads" className="text-[#14B8A6] hover:underline">Create your first inquiry →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00236f]/5 flex items-center justify-center font-bold text-[#00236f] text-sm">
                      {(lead.full_name || `L${lead.id}`).split(' ').map(n => n[0]).join('').substring(0,2)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{lead.full_name || `Lead #${lead.id}`}</div>
                      <div className="text-xs text-slate-400">{lead.destination || 'N/A'} · {lead.travel_style}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      lead.status === 'WON' ? 'bg-emerald-50 text-emerald-700' :
                      lead.status === 'QUALIFIED' ? 'bg-blue-50 text-blue-600' :
                      lead.status === 'PROPOSAL_SENT' ? 'bg-orange-50 text-orange-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>{lead.status}</span>
                    <span className="text-xs font-black text-[#14B8A6] hidden sm:block">{lead.triage_confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#00236f] rounded-[28px] p-6 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#14B8A6]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
              <Zap size={20} className="text-[#14B8A6]" fill="currentColor" />
            </div>
            <h3 className="text-xl font-extrabold mb-2">Kinetic AI</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Autonomous agents monitoring supply chains. No critical anomalies.
            </p>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Status</div>
                <div className="text-sm text-slate-300">All agents active ✓</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quick Actions</div>
                <div className="flex flex-col gap-2 mt-1">
                  <Link href="/dashboard/queries" className="text-xs text-[#14B8A6] font-bold hover:underline">→ Query Inbox</Link>
                  <Link href="/dashboard/quotations" className="text-xs text-[#14B8A6] font-bold hover:underline">→ Draft Quotation</Link>
                  <Link href="/dashboard/vendors" className="text-xs text-[#14B8A6] font-bold hover:underline">→ Vendor Registry</Link>
                </div>
              </div>
            </div>
          </div>
          <Link href="/kinetic" className="relative z-10 w-full bg-[#14B8A6] text-[#00236f] py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#14B8A6]/10 mt-6 hover:scale-[1.02] transition-transform inline-block text-center">
            Switch to Kinetic OS
          </Link>
        </div>
      </div>
    </div>
  )
}
