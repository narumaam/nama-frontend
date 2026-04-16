'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Users, Activity, AlertTriangle, CheckCircle2, Loader } from 'lucide-react'

interface PlatformStats {
  total_tenants: number
  total_users: number
  active_users: number
  travel_companies: number
}

async function fetchStats(token: string): Promise<PlatformStats> {
  const res = await fetch('/api/v1/admin/stats', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
    if (!token) { setLoading(false); return }
    fetchStats(token)
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const cards = stats
    ? [
        { label: 'Total Tenants', value: stats.total_tenants, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Travel Companies', value: stats.travel_companies, icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' },
        { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Active Users', value: stats.active_users, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
      ]
    : []

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Platform Overview</h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time health and activity across all NAMA tenants.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Owner Access
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">{error} — Stats require a running backend with PostgreSQL.</span>
        </div>
      )}

      {/* Stats grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader size={28} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={20} className={color} />
              </div>
              <div className="text-3xl font-extrabold text-[#0F172A]">{value.toLocaleString()}</div>
              <div className="text-slate-500 text-sm font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bootstrap panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-bold text-[#0F172A] mb-1">Platform Setup</h2>
        <p className="text-slate-500 text-sm mb-4">
          If your Railway DB just reset (SQLite is ephemeral), re-run the bootstrap to recreate your owner and super admin accounts.
        </p>
        <BootstrapPanel />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:border-[#14B8A6] transition-colors group"
        >
          <div className="font-bold text-[#0F172A] group-hover:text-[#14B8A6]">API Docs →</div>
          <div className="text-slate-500 text-sm mt-1">Explore all NAMA backend endpoints via Swagger UI.</div>
        </a>
        <a
          href="/super-admin"
          className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:border-[#14B8A6] transition-colors group"
        >
          <div className="font-bold text-[#0F172A] group-hover:text-[#14B8A6]">Super Admin Portal →</div>
          <div className="text-slate-500 text-sm mt-1">Manage tenants, users, and platform configuration.</div>
        </a>
      </div>
    </div>
  )
}

function BootstrapPanel() {
  const [ownerPw, setOwnerPw] = useState('')
  const [adminPw, setAdminPw] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBootstrap = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_password: ownerPw || undefined,
          super_admin_password: adminPw || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Bootstrap failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bootstrap failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const r = result as { owner?: { email?: string; password?: string }; super_admin?: { email?: string; password?: string } }
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700 font-bold">
          <CheckCircle2 size={18} /> Bootstrap successful — save these credentials!
        </div>
        <div className="text-sm font-mono text-green-800 space-y-1">
          <div>Owner: {r.owner?.email} / {r.owner?.password}</div>
          <div>Super Admin: {r.super_admin?.email} / {r.super_admin?.password}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="password"
          placeholder="Owner password (or leave blank to auto-generate)"
          value={ownerPw}
          onChange={(e) => setOwnerPw(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] outline-none"
        />
        <input
          type="password"
          placeholder="Super Admin password (or leave blank)"
          value={adminPw}
          onChange={(e) => setAdminPw(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] outline-none"
        />
      </div>
      <button
        onClick={handleBootstrap}
        disabled={loading}
        className="px-6 py-2.5 bg-[#0F172A] text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50"
      >
        {loading ? 'Bootstrapping…' : 'Run Bootstrap'}
      </button>
    </div>
  )
}
