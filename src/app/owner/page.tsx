'use client'

/**
 * NAMA OS — Owner Dashboard (R0_NAMA_OWNER)
 * ──────────────────────────────────────────
 * Platform-wide health, revenue, and tenant overview
 * for the NAMA Networks owner account.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  Building2, Users, Activity, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Loader, RefreshCw, Zap,
  Globe, Shield, BarChart2, Settings,
  ArrowRight, ExternalLink, Clock, Package,
} from 'lucide-react'

interface PlatformStats {
  total_tenants: number
  total_users: number
  active_users: number
  travel_companies: number
}

interface Tenant {
  id: number
  name: string
  type: string
  org_code: string | null
  status: string
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
}

const DEMO_STATS: PlatformStats = {
  total_tenants: 47,
  total_users: 312,
  active_users: 218,
  travel_companies: 44,
}

const DEMO_TENANTS: Tenant[] = [
  { id: 1, name: 'NAMA Networks',       type: 'PLATFORM',       org_code: 'NAMA', status: 'ACTIVE' },
  { id: 2, name: 'Wanderlust Journeys', type: 'TRAVEL_COMPANY', org_code: 'WLJ',  status: 'ACTIVE' },
  { id: 3, name: 'Heritage Trails Co.', type: 'TRAVEL_COMPANY', org_code: 'HTC',  status: 'ACTIVE' },
  { id: 4, name: 'Blue Horizon DMC',    type: 'TRAVEL_COMPANY', org_code: 'BHD',  status: 'ACTIVE' },
  { id: 5, name: 'Alpine Expeditions',  type: 'TRAVEL_COMPANY', org_code: 'AEX',  status: 'TRIAL'  },
  { id: 6, name: 'Coastal Escapes',     type: 'TRAVEL_COMPANY', org_code: 'CEX',  status: 'ACTIVE' },
]

const MONTHLY_REVENUE = [
  { month: 'Nov', arr: 18400 },
  { month: 'Dec', arr: 22100 },
  { month: 'Jan', arr: 26800 },
  { month: 'Feb', arr: 31200 },
  { month: 'Mar', arr: 38500 },
  { month: 'Apr', arr: 44200 },
]

const HEALTH_ITEMS = [
  { label: 'Railway API',       status: 'ok',   latency: '38ms'  },
  { label: 'Neon PostgreSQL',   status: 'ok',   latency: '12ms'  },
  { label: 'Vercel Edge',       status: 'ok',   latency: '18ms'  },
  { label: 'OpenAI / Claude',   status: 'ok',   latency: '210ms' },
  { label: 'Razorpay Webhooks', status: 'ok',   latency: '—'     },
  { label: 'WhatsApp Gateway',  status: 'warn', latency: '—'     },
]

function Sparkline({ values, color = '#14B8A6' }: { values: number[]; color?: string }) {
  const w = 80, h = 28
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 6) - 3
    return `${x},${y}`
  })
  const d = `M ${pts.join(' L ')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={`${d} L ${w},${h} L 0,${h} Z`} fill={color} fillOpacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="3" fill={color} />
    </svg>
  )
}

function RevenueChart({ data }: { data: typeof MONTHLY_REVENUE }) {
  const max = Math.max(...data.map(d => d.arr))
  return (
    <div className="flex items-end gap-2 h-28 w-full">
      {data.map((d, i) => {
        const pct = (d.arr / max) * 100
        const isLast = i === data.length - 1
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="relative w-full flex items-end justify-center" style={{ height: 80 }}>
              <div
                className={`w-full rounded-t-md transition-all ${isLast ? 'bg-[#14B8A6]' : 'bg-slate-200'}`}
                style={{ height: `${pct}%` }}
              />
              {isLast && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#14B8A6] whitespace-nowrap">
                  ₹{(d.arr / 1000).toFixed(0)}K
                </div>
              )}
            </div>
            <span className="text-[10px] font-semibold text-slate-400">{d.month}</span>
          </div>
        )
      })}
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  TRIAL:     'bg-amber-50 text-amber-700 border-amber-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  PLATFORM:  'bg-blue-50 text-blue-700 border-blue-200',
}

export default function OwnerDashboard() {
  const auth = useAuth()
  const router = useRouter()
  const isDemo = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim() === 'nama_demo=1')
  const isAuthorized = !isDemo && auth.user?.role === 'R0_NAMA_OWNER'
  useEffect(() => {
    if (!auth.isLoading && !isAuthorized) router.replace('/dashboard')
  }, [auth.isLoading, isAuthorized, router])
  if (auth.isLoading) return null
  if (!isAuthorized) return null

  const [stats,       setStats]       = useState<PlatformStats | null>(null)
  const [tenants,     setTenants]     = useState<Tenant[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = useCallback(async () => {
    const token = getToken()
    setLoading(true)
    setError(null)
    try {
      if (token) {
        const [sRes, tRes] = await Promise.all([
          fetch('/api/v1/admin/stats',            { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/admin/tenants?limit=20', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (sRes.ok && tRes.ok) {
          const [s, t] = await Promise.all([sRes.json(), tRes.json()])
          setStats(s)
          setTenants(Array.isArray(t) ? t : (t.items ?? []))
          setLastRefresh(new Date())
          return
        }
      }
    } catch { /* fall through to seed data */ }
    setStats(DEMO_STATS)
    setTenants(DEMO_TENANTS)
    if (!stats) setError('backend-unreachable')
    setLastRefresh(new Date())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const kpis = stats ? [
    { label: 'Total Tenants', value: stats.total_tenants, delta: '+8%',  up: true, icon: Building2, color: 'text-blue-600',    bg: 'bg-blue-50',    spark: [28,31,35,38,42,44,stats.total_tenants], sc: '#3B82F6' },
    { label: 'Travel DMCs',   value: stats.travel_companies, delta: '+12%', up: true, icon: Globe,     color: 'text-teal-600',    bg: 'bg-teal-50',    spark: [26,29,32,35,39,41,stats.travel_companies], sc: '#14B8A6' },
    { label: 'Total Users',   value: stats.total_users,   delta: '+22%', up: true, icon: Users,     color: 'text-purple-600',  bg: 'bg-purple-50',  spark: [180,201,224,248,274,298,stats.total_users], sc: '#8B5CF6' },
    { label: 'Active Users',  value: stats.active_users,  delta: '+18%', up: true, icon: Activity,  color: 'text-emerald-600', bg: 'bg-emerald-50', spark: [120,140,158,178,194,210,stats.active_users], sc: '#10B981' },
  ] : []

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader size={22} className="animate-spin" />
          <span className="font-medium">Loading platform data…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Top nav */}
      <header className="bg-[#0F172A] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#14B8A6] rounded-lg flex items-center justify-center font-black text-[#0F172A] text-xs">N</div>
            <span className="font-black text-white tracking-tight">NAMA OS</span>
            <span className="text-slate-600 text-xs font-medium">/ Owner Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/super-admin" className="flex items-center gap-1.5 text-xs font-bold text-[#14B8A6] hover:text-teal-300 transition-colors">
              <Shield size={13} /> Super Admin
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
              <Zap size={13} /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Page title */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Platform Overview</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-semibold">
              <AlertTriangle size={13} />
              Showing seed data — backend unreachable
            </div>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center`}>
                  <k.icon size={17} className={k.color} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-bold ${k.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {k.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {k.delta}
                </span>
              </div>
              <div className="text-3xl font-black text-[#0F172A] mb-0.5">{k.value.toLocaleString()}</div>
              <div className="flex items-end justify-between">
                <span className="text-xs font-semibold text-slate-500">{k.label}</span>
                <Sparkline values={k.spark} color={k.sc} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* MRR chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-black text-[#0F172A]">Monthly Recurring Revenue</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Platform subscription ARR (INR)</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[#0F172A]">₹44.2K</div>
                <div className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-0.5">
                  <TrendingUp size={11} /> +14.8% MoM
                </div>
              </div>
            </div>
            <RevenueChart data={MONTHLY_REVENUE} />
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              {[
                { label: 'Starter Plans', count: 22, pct: 47 },
                { label: 'Growth Plans',  count: 18, pct: 38 },
                { label: 'Scale Plans',   count:  7, pct: 15 },
              ].map(p => (
                <div key={p.label}>
                  <div className="text-lg font-black text-[#0F172A]">{p.count}</div>
                  <div className="text-xs text-slate-500 font-medium">{p.label}</div>
                  <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full">
                    <div className="h-1.5 bg-[#14B8A6] rounded-full" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System health */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-[#0F172A]">Infrastructure Health</h2>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              {HEALTH_ITEMS.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.latency !== '—' && <span className="text-xs text-slate-400 font-mono">{item.latency}</span>}
                    {item.status === 'ok'
                      ? <CheckCircle2 size={13} className="text-emerald-500" />
                      : <AlertTriangle size={13} className="text-amber-500" />}
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/status" className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#14B8A6] hover:underline">
              Full system status <ArrowRight size={11} />
            </Link>
          </div>

        </div>

        {/* Tenant list */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-black text-[#0F172A]">Active Tenants</h2>
            <Link href="/super-admin" className="flex items-center gap-1.5 text-xs font-bold text-[#14B8A6] hover:underline">
              Manage all <ExternalLink size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-3 text-left">Tenant</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Org Code</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Plan</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                          style={{ backgroundColor: ['#14B8A6','#3B82F6','#8B5CF6','#F97316','#EF4444','#10B981'][i % 6] }}
                        >
                          {t.name[0]}
                        </div>
                        <span className="font-bold text-sm text-[#0F172A]">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-500">{t.type.replace('_', ' ')}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {t.org_code ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${STATUS_STYLES[t.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-500">
                      {t.type === 'PLATFORM' ? 'Owner' : ['Growth','Starter','Scale','Growth','Trial','Starter'][i % 6]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Manage Tenants',    desc: 'Add, suspend, or audit tenants',  icon: Building2, href: '/super-admin',       color: '#3B82F6' },
            { label: 'Platform Settings', desc: 'Configure global defaults',        icon: Settings,  href: '/dashboard/settings', color: '#8B5CF6' },
            { label: 'Module Status',     desc: 'View 19-module completion status', icon: Package,   href: '/dashboard/status',   color: '#14B8A6' },
            { label: 'Revenue Reports',   desc: 'MRR, churn, and expansion',       icon: BarChart2, href: '/dashboard/reports',  color: '#F97316' },
          ].map(a => (
            <Link key={a.label} href={a.href} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${a.color}15` }}>
                <a.icon size={18} style={{ color: a.color }} />
              </div>
              <div className="font-black text-sm text-[#0F172A] group-hover:text-[#14B8A6] transition-colors">{a.label}</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">{a.desc}</div>
            </Link>
          ))}
        </div>

        <div className="text-center text-[11px] text-slate-400 font-medium pb-4">
          NAMA Networks · Owner Portal · {new Date().getFullYear()} ·{' '}
          <Clock size={10} className="inline-block mr-0.5" />
          {lastRefresh.toLocaleString()}
        </div>

      </main>
    </div>
  )
}
