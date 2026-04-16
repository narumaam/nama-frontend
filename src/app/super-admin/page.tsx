'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Users, Activity, Loader, AlertTriangle, Plus, RefreshCw } from 'lucide-react'

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

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        fetch('/api/v1/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/admin/tenants?limit=20', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (tenantsRes.ok) setTenants(await tenantsRes.json())
    } catch {
      setError('Failed to load data. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const statCards = stats
    ? [
        { label: 'Travel Companies', value: stats.travel_companies, icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' },
        { label: 'Total Tenants', value: stats.total_tenants, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Active Users', value: stats.active_users, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
      ]
    : []

  const tenantTypeLabel: Record<string, string> = {
    L1_OWNER: 'Platform',
    L2_SUPER_ADMIN: 'Super Admin',
    L3_TRAVEL_CO: 'Travel Co.',
    L4_SUB_USER: 'Sub User',
    L5_SUB_AGENT: 'Sub Agent',
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Super Admin Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage all tenants and users across the NAMA platform.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-[#14B8A6] text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader size={28} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
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

      {/* Tenant list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-bold text-[#0F172A]">All Tenants</h2>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14B8A6] text-[#0F172A] rounded-lg text-xs font-bold hover:bg-[#0fa39f] transition-all">
            <Plus size={13} />
            Invite Tenant
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Org Code</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {loading ? 'Loading…' : 'No tenants yet. Run bootstrap to seed the platform.'}
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{t.id}</td>
                    <td className="px-6 py-4 font-semibold text-[#0F172A]">{t.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        {tenantTypeLabel[t.type] || t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{t.org_code || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Useful links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/api/docs" target="_blank" rel="noopener noreferrer"
          className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-[#14B8A6] transition-colors group">
          <div className="font-bold text-[#0F172A] text-sm group-hover:text-[#14B8A6]">API Docs →</div>
          <div className="text-slate-400 text-xs mt-1">Swagger UI for all backend endpoints</div>
        </a>
        <a href="/dashboard" className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-[#14B8A6] transition-colors group">
          <div className="font-bold text-[#0F172A] text-sm group-hover:text-[#14B8A6]">Customer Dashboard →</div>
          <div className="text-slate-400 text-xs mt-1">View the standard travel-company workspace</div>
        </a>
        <a href="/owner" className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-red-400 transition-colors group">
          <div className="font-bold text-[#0F172A] text-sm group-hover:text-red-500">Owner Console →</div>
          <div className="text-slate-400 text-xs mt-1">Bootstrap, kill-switch, platform config</div>
        </a>
      </div>
    </div>
  )
}
