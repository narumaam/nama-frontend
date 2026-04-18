'use client'

import React, { useState, useEffect } from 'react'
import {
  Users, UserPlus, Mail, Shield, Activity, TrendingUp,
  BarChart3, Briefcase, Star, AlertCircle, CheckCircle,
  Loader, X, Search, MoreVertical, Clock, Award,
  ChevronDown, Filter, RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  email: string
  name: string
  role: string
  status: 'active' | 'invited' | 'disabled'
  joined_at?: string
  invited_at?: string
  avatar?: string
  // Performance metrics
  leads_assigned?: number
  bookings_closed?: number
  revenue_generated?: number
  avg_response_min?: number
  conversion_rate?: number
  last_active?: string
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_TEAM: TeamMember[] = [
  {
    id: '1', email: 'owner@nama.travel', name: 'Narayan M.', role: 'R1_SUPER_ADMIN',
    status: 'active', joined_at: '2026-01-01',
    leads_assigned: 0, bookings_closed: 48, revenue_generated: 2340000,
    avg_response_min: 8, conversion_rate: 74, last_active: '2026-04-18T09:12:00Z',
  },
  {
    id: '2', email: 'priya@nama.travel', name: 'Priya Sharma', role: 'R2_ORG_ADMIN',
    status: 'active', joined_at: '2026-02-15',
    leads_assigned: 42, bookings_closed: 31, revenue_generated: 1820000,
    avg_response_min: 14, conversion_rate: 67, last_active: '2026-04-18T09:05:00Z',
  },
  {
    id: '3', email: 'rahul@nama.travel', name: 'Rahul Verma', role: 'R3_SALES_MANAGER',
    status: 'active', joined_at: '2026-03-01',
    leads_assigned: 38, bookings_closed: 22, revenue_generated: 1140000,
    avg_response_min: 22, conversion_rate: 58, last_active: '2026-04-18T08:58:00Z',
  },
  {
    id: '4', email: 'divya@nama.travel', name: 'Divya K.', role: 'R4_OPS_EXECUTIVE',
    status: 'active', joined_at: '2026-03-20',
    leads_assigned: 19, bookings_closed: 14, revenue_generated: 680000,
    avg_response_min: 31, conversion_rate: 52, last_active: '2026-04-17T17:40:00Z',
  },
  {
    id: '5', email: 'anil@nama.travel', name: 'Anil Gupta', role: 'R3_SALES_MANAGER',
    status: 'active', joined_at: '2026-04-01',
    leads_assigned: 11, bookings_closed: 6, revenue_generated: 310000,
    avg_response_min: 45, conversion_rate: 43, last_active: '2026-04-17T14:20:00Z',
  },
  {
    id: '6', email: 'new@partner.com', name: '', role: 'R6_SUB_AGENT',
    status: 'invited', invited_at: '2026-04-12',
    leads_assigned: 0, bookings_closed: 0, revenue_generated: 0,
    avg_response_min: 0, conversion_rate: 0,
  },
]

const ROLES: Record<string, { label: string; color: string; bg: string }> = {
  R1_SUPER_ADMIN:   { label: 'Super Admin',    color: 'text-amber-700',  bg: 'bg-amber-50' },
  R2_ORG_ADMIN:     { label: 'Org Admin',      color: 'text-purple-700', bg: 'bg-purple-50' },
  R3_SALES_MANAGER: { label: 'Sales Manager',  color: 'text-blue-700',   bg: 'bg-blue-50' },
  R4_OPS_EXECUTIVE: { label: 'Ops Executive',  color: 'text-teal-700',   bg: 'bg-teal-50' },
  R5_FINANCE_ADMIN: { label: 'Finance Admin',  color: 'text-green-700',  bg: 'bg-green-50' },
  R6_SUB_AGENT:     { label: 'Sub-Agent',      color: 'text-slate-600',  bg: 'bg-slate-100' },
}

const INVITE_ROLES = [
  { id: 'R3_SALES_MANAGER', label: 'Sales Manager',  desc: 'Manages leads and bookings assigned to them' },
  { id: 'R4_OPS_EXECUTIVE', label: 'Ops Executive',  desc: 'Full ops access — bookings, vendors, documents' },
  { id: 'R2_ORG_ADMIN',     label: 'Org Admin',      desc: 'Full access — can manage team and settings' },
  { id: 'R6_SUB_AGENT',     label: 'Sub-Agent',      desc: 'External affiliate with limited portal access' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function timeAgo(iso?: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function avatarColor(name: string) {
  const colors = ['from-teal-400 to-cyan-500', 'from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500',
    'from-amber-400 to-orange-500', 'from-green-400 to-emerald-500', 'from-rose-400 to-pink-500']
  const i = name.charCodeAt(0) % colors.length
  return colors[i]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(SEED_TEAM)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('R3_SALES_MANAGER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'revenue' | 'bookings' | 'conversion' | 'response'>('revenue')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }
  }

  const filtered = members
    .filter(m => {
      const q = search.toLowerCase()
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      const matchRole = filterRole === 'all' || m.role === filterRole
      const matchStatus = filterStatus === 'all' || m.status === filterStatus
      return matchSearch && matchRole && matchStatus
    })
    .sort((a, b) => {
      if (sortBy === 'revenue')    return (b.revenue_generated ?? 0) - (a.revenue_generated ?? 0)
      if (sortBy === 'bookings')   return (b.bookings_closed ?? 0) - (a.bookings_closed ?? 0)
      if (sortBy === 'conversion') return (b.conversion_rate ?? 0) - (a.conversion_rate ?? 0)
      if (sortBy === 'response')   return (a.avg_response_min ?? 999) - (b.avg_response_min ?? 999)
      return 0
    })

  const activeMembers = members.filter(m => m.status === 'active')
  const totalRevenue = activeMembers.reduce((s, m) => s + (m.revenue_generated ?? 0), 0)
  const avgConversion = activeMembers.length
    ? Math.round(activeMembers.reduce((s, m) => s + (m.conversion_rate ?? 0), 0) / activeMembers.length)
    : 0
  const avgResponse = activeMembers.filter(m => (m.avg_response_min ?? 0) > 0).length
    ? Math.round(activeMembers.filter(m => (m.avg_response_min ?? 0) > 0).reduce((s, m) => s + (m.avg_response_min ?? 0), 0) /
        activeMembers.filter(m => (m.avg_response_min ?? 0) > 0).length)
    : 0

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    try {
      await api.post('/api/v1/settings/team/invite', { email: inviteEmail, role: inviteRole })
    } catch {
      // optimistic — backend may not be connected
    }
    const newMember: TeamMember = {
      id: Date.now().toString(), email: inviteEmail, name: '', role: inviteRole,
      status: 'invited', invited_at: new Date().toISOString(),
      leads_assigned: 0, bookings_closed: 0, revenue_generated: 0, avg_response_min: 0, conversion_rate: 0,
    }
    setMembers(prev => [...prev, newMember])
    setShowInvite(false); setInviteEmail('')
    flash(`Invite sent to ${inviteEmail}`)
    setInviteLoading(false)
  }

  const handleResendInvite = (member: TeamMember) => {
    flash(`Invite resent to ${member.email}`)
    setOpenMenuId(null)
  }

  const handleDisable = (member: TeamMember) => {
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: 'disabled' as const } : m))
    flash(`${member.name || member.email} disabled`)
    setOpenMenuId(null)
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Team</h1>
          <p className="text-slate-500 mt-1 font-medium">
            {activeMembers.length} active members · {members.filter(m => m.status === 'invited').length} pending invite
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-[#0F172A] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
        >
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      {/* Toast */}
      {(error || success) && (
        <div className={`flex items-center gap-3 border rounded-xl p-4 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {error ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span className="font-medium text-sm">{error || success}</span>
          <button onClick={() => { setError(null); setSuccess(null) }} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Team Members', value: activeMembers.length.toString(), sub: `+${members.filter(m => m.status === 'invited').length} invited`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Revenue', value: fmtCurrency(totalRevenue), sub: 'All active agents', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Avg Conversion', value: `${avgConversion}%`, sub: 'Lead → booking', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Avg Response', value: `${avgResponse}m`, sub: 'To new leads', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
              <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#0F172A]">{kpi.value}</div>
            <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search members..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none"
          />
        </div>

        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:border-[#14B8A6] outline-none bg-white">
          <option value="all">All Roles</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:border-[#14B8A6] outline-none bg-white">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="disabled">Disabled</option>
        </select>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-slate-400 font-medium">Sort:</span>
          {[
            { id: 'revenue', label: 'Revenue' },
            { id: 'bookings', label: 'Bookings' },
            { id: 'conversion', label: 'Conversion' },
            { id: 'response', label: 'Response' },
          ].map((s) => (
            <button key={s.id} onClick={() => setSortBy(s.id as typeof sortBy)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === s.id ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member Cards */}
      <div className="space-y-3">
        {filtered.map((member) => {
          const role = ROLES[member.role] ?? { label: member.role, color: 'text-slate-600', bg: 'bg-slate-100' }
          const initials = member.name ? member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : member.email[0].toUpperCase()
          const isTopPerformer = (member.revenue_generated ?? 0) === Math.max(...activeMembers.map(m => m.revenue_generated ?? 0))

          return (
            <div key={member.id} className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5 hover:border-slate-200 transition-all">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(member.name || member.email)} flex items-center justify-center font-black text-white text-sm`}>
                    {initials}
                  </div>
                  {member.status === 'active' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
                  )}
                  {isTopPerformer && member.status === 'active' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
                      <Star size={10} className="text-white" fill="currentColor" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#0F172A] text-sm">
                      {member.name || <span className="italic text-slate-400">Pending</span>}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${role.bg} ${role.color}`}>
                      {role.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      member.status === 'active' ? 'bg-emerald-50 text-emerald-700'
                        : member.status === 'invited' ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {member.status === 'active' ? '● Active' : member.status === 'invited' ? '◌ Invited' : '✕ Disabled'}
                    </span>
                    {isTopPerformer && member.status === 'active' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        ⭐ Top Performer
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{member.email}</div>
                  {member.last_active && (
                    <div className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1">
                      <Activity size={10} /> Last active {timeAgo(member.last_active)}
                    </div>
                  )}
                </div>

                {/* Actions menu */}
                <div className="relative flex-shrink-0">
                  <button onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                    className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === member.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-0 top-8 z-50 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden">
                        {member.status === 'invited' && (
                          <button onClick={() => handleResendInvite(member)}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <RefreshCw size={12} /> Resend Invite
                          </button>
                        )}
                        {member.status === 'active' && (
                          <button onClick={() => handleDisable(member)}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <X size={12} /> Disable Account
                          </button>
                        )}
                        {member.status === 'disabled' && (
                          <button onClick={() => { setMembers(prev => prev.map(m => m.id === member.id ? {...m, status: 'active'} : m)); flash('Account re-enabled'); setOpenMenuId(null) }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                            <CheckCircle size={12} /> Re-enable
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Performance metrics */}
              {member.status === 'active' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-50">
                  <div className="text-center">
                    <div className="text-base font-extrabold text-[#0F172A]">{member.leads_assigned ?? '—'}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Leads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-extrabold text-[#0F172A]">{member.bookings_closed ?? '—'}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Bookings Closed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-extrabold text-[#0F172A]">{fmtCurrency(member.revenue_generated ?? 0)}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className={`text-base font-extrabold ${
                        (member.conversion_rate ?? 0) >= 65 ? 'text-emerald-600'
                          : (member.conversion_rate ?? 0) >= 50 ? 'text-amber-600'
                          : 'text-red-500'
                      }`}>{member.conversion_rate ?? '—'}%</div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Conversion</div>
                  </div>
                </div>
              )}

              {/* Conversion bar */}
              {member.status === 'active' && (member.conversion_rate ?? 0) > 0 && (
                <div className="mt-3 px-1">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (member.conversion_rate ?? 0) >= 65 ? 'bg-emerald-400'
                          : (member.conversion_rate ?? 0) >= 50 ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${member.conversion_rate}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Invited state */}
              {member.status === 'invited' && (
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-3">
                  <Mail size={14} className="text-slate-300" />
                  <span className="text-xs text-slate-400">
                    Invite sent {member.invited_at ? new Date(member.invited_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''} · Awaiting acceptance
                  </span>
                  <button onClick={() => handleResendInvite(member)} className="ml-auto text-xs font-bold text-[#14B8A6] hover:underline">
                    Resend
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Users size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="font-bold">No members match your filters</p>
            <p className="text-sm mt-1">Try clearing the search or changing the role filter</p>
          </div>
        )}
      </div>

      {/* Roles reference */}
      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-6">
        <h3 className="font-extrabold text-[#0F172A] mb-4 flex items-center gap-2">
          <Shield size={18} className="text-slate-400" /> Role Permissions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            { role: 'R1_SUPER_ADMIN',   perms: 'Full access · billing · team · settings' },
            { role: 'R2_ORG_ADMIN',     perms: 'All leads, bookings, reports · invite agents' },
            { role: 'R3_SALES_MANAGER', perms: 'Assigned leads & bookings · create quotes' },
            { role: 'R4_OPS_EXECUTIVE', perms: 'Ops access · vendors, documents, bookings' },
            { role: 'R5_FINANCE_ADMIN', perms: 'Finance, payments, reports only' },
            { role: 'R6_SUB_AGENT',     perms: 'External affiliate · limited portal access' },
          ].map(({ role, perms }) => {
            const r = ROLES[role]
            return (
              <div key={role} className={`flex items-start gap-3 p-3 rounded-xl ${r.bg}`}>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${r.bg} ${r.color} border border-current/10 whitespace-nowrap flex-shrink-0`}>
                  {r.label}
                </span>
                <span className="text-xs text-slate-500">{perms}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@agency.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                <div className="space-y-2">
                  {INVITE_ROLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setInviteRole(r.id)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${inviteRole === r.id ? 'border-[#14B8A6] bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLES[r.id]?.bg ?? 'bg-slate-100'} ${ROLES[r.id]?.color ?? 'text-slate-600'}`}>
                          {r.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleInvite}
                disabled={inviteLoading || !inviteEmail.trim()}
                className="w-full bg-[#0F172A] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                {inviteLoading ? <><Loader size={16} className="animate-spin" /> Sending...</> : <><Mail size={16} /> Send Invite</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
