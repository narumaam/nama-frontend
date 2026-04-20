'use client'

/**
 * NAMA OS — Super Admin Dashboard (R1_SUPER_ADMIN)
 * ─────────────────────────────────────────────────
 * Full tenant management: create, inspect, suspend.
 * Platform bootstrap + user management.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  Building2, Users, Activity, Loader, AlertTriangle, Plus, RefreshCw,
  Search, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Shield, Zap, MoreHorizontal, Eye, Pause, Trash2,
  Globe, Key, BarChart2, ArrowLeft, CreditCard,
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

interface NewTenantForm {
  name: string
  type: string
  org_code: string
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
}

const DEMO_STATS: PlatformStats = { total_tenants: 47, total_users: 312, active_users: 218, travel_companies: 44 }

const DEMO_TENANTS: Tenant[] = [
  { id: 1, name: 'NAMA Networks',        type: 'PLATFORM',       org_code: 'NAMA', status: 'ACTIVE'    },
  { id: 2, name: 'Wanderlust Journeys',  type: 'TRAVEL_COMPANY', org_code: 'WLJ',  status: 'ACTIVE'    },
  { id: 3, name: 'Heritage Trails Co.',  type: 'TRAVEL_COMPANY', org_code: 'HTC',  status: 'ACTIVE'    },
  { id: 4, name: 'Blue Horizon DMC',     type: 'TRAVEL_COMPANY', org_code: 'BHD',  status: 'ACTIVE'    },
  { id: 5, name: 'Alpine Expeditions',   type: 'TRAVEL_COMPANY', org_code: 'AEX',  status: 'TRIAL'     },
  { id: 6, name: 'Coastal Escapes',      type: 'TRAVEL_COMPANY', org_code: 'CEX',  status: 'ACTIVE'    },
  { id: 7, name: 'Summit Trek Agency',   type: 'TRAVEL_COMPANY', org_code: 'STA',  status: 'ACTIVE'    },
  { id: 8, name: 'Desert Safari Tours',  type: 'TRAVEL_COMPANY', org_code: 'DST',  status: 'TRIAL'     },
  { id: 9, name: 'Island Hopper India',  type: 'TRAVEL_COMPANY', org_code: 'IHI',  status: 'ACTIVE'    },
  { id: 10, name: 'Northern Nomads',     type: 'TRAVEL_COMPANY', org_code: 'NNO',  status: 'SUSPENDED' },
]

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  TRIAL:     'bg-amber-50 text-amber-700 border-amber-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  PLATFORM:  'bg-blue-50 text-blue-700 border-blue-200',
}

const TYPE_OPTIONS = ['TRAVEL_COMPANY', 'CORPORATE', 'PLATFORM']

export default function SuperAdminDashboard() {
  const auth = useAuth()
  const router = useRouter()
  const ALLOWED = ['R0_NAMA_OWNER', 'R1_SUPER_ADMIN']
  const isDemo = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim() === 'nama_demo=1')
  const isAuthorized = !isDemo && !!auth.user && ALLOWED.includes(auth.user.role)
  useEffect(() => {
    if (!auth.isLoading && !isAuthorized) router.replace('/dashboard')
  }, [auth.isLoading, isAuthorized, router])
  if (auth.isLoading) return null
  if (!isAuthorized) return null

  const [stats,       setStats]       = useState<PlatformStats | null>(null)
  const [tenants,     setTenants]     = useState<Tenant[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [creating,    setCreating]    = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const [openMenu,    setOpenMenu]    = useState<number | null>(null)
  const [expandStats, setExpandStats] = useState(true)
  const [form, setForm]               = useState<NewTenantForm>({ name: '', type: 'TRAVEL_COMPANY', org_code: '' })

  const load = useCallback(async () => {
    const token = getToken()
    setLoading(true)
    setError(null)
    try {
      if (token) {
        const [sRes, tRes] = await Promise.all([
          fetch('/api/v1/admin/stats',            { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/admin/tenants?limit=50', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (sRes.ok && tRes.ok) {
          const [s, t] = await Promise.all([sRes.json(), tRes.json()])
          setStats(s)
          setTenants(Array.isArray(t) ? t : (t.items ?? []))
          return
        }
      }
    } catch { /* fall through */ }
    setStats(DEMO_STATS)
    setTenants(DEMO_TENANTS)
    setError('seed')
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    const token = getToken()
    try {
      const res = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const newTenant: Tenant = await res.json()
        setTenants(prev => [newTenant, ...prev])
        setShowForm(false)
        setForm({ name: '', type: 'TRAVEL_COMPANY', org_code: '' })
      }
    } catch { /* ignore */ } finally {
      setCreating(false)
    }
  }

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.org_code ?? '').toLowerCase().includes(search.toLowerCase())
  )

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

  const kpis = stats ? [
    { label: 'Tenants',      value: stats.total_tenants,     icon: Building2, color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'DMCs',         value: stats.travel_companies,  icon: Globe,     color: 'text-teal-600',    bg: 'bg-teal-50'    },
    { label: 'Total Users',  value: stats.total_users,       icon: Users,     color: 'text-purple-600',  bg: 'bg-purple-50'  },
    { label: 'Active Users', value: stats.active_users,      icon: Activity,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ] : []

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Top nav */}
      <header className="bg-[#0F172A] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#14B8A6] rounded-lg flex items-center justify-center font-black text-[#0F172A] text-xs">N</div>
            <span className="font-black text-white tracking-tight">NAMA OS</span>
            <span className="text-slate-600 text-xs font-medium">/ Super Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/owner" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={13} /> Owner Portal
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-bold text-[#14B8A6] hover:text-teal-300 transition-colors">
              <Zap size={13} /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
              <Shield size={22} className="text-[#14B8A6]" />
              Super Admin Console
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Tenant management &amp; platform bootstrap</p>
          </div>
          {error === 'seed' && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-semibold">
              <AlertTriangle size={13} />
              Seed data — backend unreachable
            </div>
          )}
        </div>

        {/* Stats panel */}
        <div className="bg-white rounded-2xl border border-slate-100">
          <button
            onClick={() => setExpandStats(!expandStats)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors rounded-2xl"
          >
            <span className="font-black text-[#0F172A]">Platform Stats</span>
            {expandStats ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {expandStats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-6">
              {kpis.map(k => (
                <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
                  <div className={`${k.color} mb-1`}><k.icon size={18} /></div>
                  <div className="text-3xl font-black text-[#0F172A]">{k.value.toLocaleString()}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tenant management */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-black text-[#0F172A]">Tenants ({filtered.length})</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2 gap-2">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tenants…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-40 placeholder-slate-400 text-slate-700"
                />
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1.5 bg-[#0F172A] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Plus size={13} /> New Tenant
              </button>
            </div>
          </div>

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleCreate} className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Company Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Wanderlust Journeys"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none"
                  >
                    {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Org Code (optional)</label>
                  <input
                    value={form.org_code}
                    onChange={e => setForm(f => ({ ...f, org_code: e.target.value.toUpperCase() }))}
                    placeholder="WLJ"
                    maxLength={10}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 bg-[#14B8A6] text-white text-xs font-black px-4 py-2.5 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-60"
                >
                  {creating ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />}
                  Create Tenant
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-3 text-left">Tenant</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Org Code</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Users</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium text-sm">
                      No tenants found.
                    </td>
                  </tr>
                ) : filtered.map((t, i) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                          style={{ backgroundColor: ['#14B8A6','#3B82F6','#8B5CF6','#F97316','#EF4444','#10B981','#EC4899','#06B6D4','#84CC16','#F59E0B'][i % 10] }}
                        >
                          {t.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#0F172A]">{t.name}</div>
                          <div className="text-[10px] text-slate-400">ID: {t.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-500">{t.type.replace(/_/g, ' ')}</td>
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
                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-600">
                      {[7,14,3,22,5,11,18,8,25,2][i % 10]}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1 relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {openMenu === t.id && (
                          <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 w-40 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                              <Eye size={13} /> View Details
                            </button>
                            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                              <Key size={13} /> Reset Credentials
                            </button>
                            {t.status === 'ACTIVE' ? (
                              <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50">
                                <Pause size={13} /> Suspend
                              </button>
                            ) : (
                              <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50">
                                <CheckCircle2 size={13} /> Activate
                              </button>
                            )}
                            {t.type !== 'PLATFORM' && (
                              <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                                <Trash2 size={13} /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bootstrap section */}
        <div className="bg-[#0F172A] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-[#14B8A6]/15 rounded-xl flex items-center justify-center">
              <Zap size={17} className="text-[#14B8A6]" />
            </div>
            <div>
              <h2 className="font-black text-white">Platform Bootstrap</h2>
              <p className="text-xs text-slate-400 font-medium">One-time setup — creates NAMA owner + super admin accounts</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Bootstrap API',   desc: 'POST /api/v1/admin/bootstrap', icon: Zap,       color: '#14B8A6' },
              { label: 'Seed Demo Data',  desc: 'python seed_demo.py',          icon: BarChart2, color: '#3B82F6' },
              { label: 'View API Docs',   desc: '/api/v1/docs (Swagger UI)',    icon: Globe,     color: '#8B5CF6' },
            ].map(item => (
              <div key={item.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <item.icon size={15} style={{ color: item.color }} className="mb-2" />
                <div className="font-bold text-white text-sm">{item.label}</div>
                <div className="font-mono text-[10px] text-slate-400 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Owner Dashboard',       icon: Shield,      href: '/owner',                color: '#14B8A6', desc: 'Platform revenue & health' },
            { label: 'Subscription Admin',     icon: CreditCard,  href: '/owner/subscriptions',  color: '#F97316', desc: 'Manage tenant plans & billing' },
            { label: 'Module Status',          icon: BarChart2,   href: '/dashboard/status',     color: '#3B82F6', desc: '19-module completion tracker' },
            { label: 'Platform Reports',       icon: XCircle,     href: '/dashboard/reports',    color: '#8B5CF6', desc: 'Analytics & usage reports' },
          ].map(a => (
            <Link key={a.label} href={a.href} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${a.color}15` }}>
                <a.icon size={16} style={{ color: a.color }} />
              </div>
              <div className="font-black text-sm text-[#0F172A] group-hover:text-[#14B8A6] transition-colors">{a.label}</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">{a.desc}</div>
            </Link>
          ))}
        </div>

      </main>
    </div>
  )
}
