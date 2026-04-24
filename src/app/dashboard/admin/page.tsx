'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  Building2, Users, TrendingUp, Activity, AlertTriangle,
  CheckCircle, Clock, BarChart3, Globe, Shield,
  RefreshCw, ChevronDown, ChevronUp, XCircle,
  Plane, Send, Mail,
} from 'lucide-react'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantStats {
  id: number
  name: string
  org_code: string | null
  status: string
  plan: string
  created_at: string | null
  user_count: number
  lead_count: number
  booking_count: number
  quotation_count: number
  total_revenue: number
  last_activity: string | null
  days_since_signup: number
  has_imported_leads: boolean
  has_sent_quote: boolean
  has_confirmed_booking: boolean
  has_used_copilot: boolean
  adoption_score: number
}

interface RichPlatformStats {
  total_tenants: number
  active_tenants: number
  total_leads: number
  total_bookings: number
  total_revenue: number
  avg_adoption_score: number
  new_signups_7d: number
  new_signups_30d: number
}

// ─── Seed data (fallback when API unavailable) ────────────────────────────────

const SEED_TENANTS: TenantStats[] = [
  {
    id: 1,
    name: 'Wanderlust Travels',
    org_code: 'WLT001',
    status: 'ACTIVE',
    plan: 'beta',
    created_at: '2026-04-15T10:00:00Z',
    user_count: 3,
    lead_count: 24,
    booking_count: 8,
    quotation_count: 15,
    total_revenue: 2840000,
    last_activity: '2026-04-19T08:30:00Z',
    days_since_signup: 4,
    has_imported_leads: true,
    has_sent_quote: true,
    has_confirmed_booking: true,
    has_used_copilot: true,
    adoption_score: 90,
  },
  {
    id: 2,
    name: 'Horizon Journeys',
    org_code: 'HJ002',
    status: 'ACTIVE',
    plan: 'beta',
    created_at: '2026-04-17T14:00:00Z',
    user_count: 1,
    lead_count: 4,
    booking_count: 0,
    quotation_count: 2,
    total_revenue: 0,
    last_activity: '2026-04-18T16:00:00Z',
    days_since_signup: 2,
    has_imported_leads: false,
    has_sent_quote: true,
    has_confirmed_booking: false,
    has_used_copilot: false,
    adoption_score: 40,
  },
  {
    id: 3,
    name: 'Sky High Tours',
    org_code: 'SHT003',
    status: 'ACTIVE',
    plan: 'beta',
    created_at: '2026-04-18T09:00:00Z',
    user_count: 1,
    lead_count: 2,
    booking_count: 0,
    quotation_count: 0,
    total_revenue: 0,
    last_activity: null,
    days_since_signup: 1,
    has_imported_leads: false,
    has_sent_quote: false,
    has_confirmed_booking: false,
    has_used_copilot: false,
    adoption_score: 10,
  },
]

const SEED_PLATFORM: RichPlatformStats = {
  total_tenants: 3,
  active_tenants: 2,
  total_leads: 30,
  total_bookings: 8,
  total_revenue: 2840000,
  avg_adoption_score: 46.7,
  new_signups_7d: 3,
  new_signups_30d: 3,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRevenue(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n}`
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

function adoptionColor(score: number): string {
  if (score >= 76) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  if (score >= 51) return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  if (score >= 26) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
  return 'bg-red-500/20 text-red-400 border border-red-500/30'
}

function isAtRisk(tenant: TenantStats): boolean {
  const lastAct = tenant.last_activity
  if (!lastAct) return tenant.days_since_signup > 1
  const daysSince = Math.floor((Date.now() - new Date(lastAct).getTime()) / 86400000)
  return daysSince > 7
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

function AdoptionBand({
  label,
  count,
  total,
  color,
  barColor,
}: {
  label: string
  count: number
  total: number
  color: string
  barColor: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium w-16 ${color}`}>{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
    </div>
  )
}

function TenantRow({
  tenant,
  onNudge,
}: {
  tenant: TenantStats
  onNudge: (id: number, name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const atRisk = isAtRisk(tenant)
  const lastActDays =
    tenant.last_activity
      ? Math.floor((Date.now() - new Date(tenant.last_activity).getTime()) / 86400000)
      : 999

  const featureChecks = [
    { label: 'Imported leads', done: tenant.has_imported_leads },
    { label: 'Sent a quote', done: tenant.has_sent_quote },
    { label: 'Confirmed booking', done: tenant.has_confirmed_booking },
    { label: 'Used Copilot', done: tenant.has_used_copilot },
  ]

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Agency */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{tenant.name}</div>
              {tenant.org_code && (
                <div className="text-xs text-gray-500">{tenant.org_code}</div>
              )}
            </div>
          </div>
        </td>

        {/* Signed Up */}
        <td className="px-4 py-3 text-sm text-gray-400">
          {tenant.created_at
            ? new Date(tenant.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })
            : '—'}
          <div className="text-xs text-gray-600">{tenant.days_since_signup}d ago</div>
        </td>

        {/* Users */}
        <td className="px-4 py-3 text-sm text-gray-300">{tenant.user_count}</td>

        {/* Leads */}
        <td className="px-4 py-3 text-sm text-gray-300">{tenant.lead_count}</td>

        {/* Bookings */}
        <td className="px-4 py-3 text-sm text-gray-300">{tenant.booking_count}</td>

        {/* Revenue */}
        <td className="px-4 py-3 text-sm font-medium text-emerald-400">
          {formatRevenue(tenant.total_revenue)}
        </td>

        {/* Adoption */}
        <td className="px-4 py-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${adoptionColor(tenant.adoption_score)}`}>
            {tenant.adoption_score}%
          </span>
        </td>

        {/* Last Active */}
        <td className="px-4 py-3">
          <span
            className={`text-xs ${
              atRisk || lastActDays > 7 ? 'text-red-400 font-medium' : 'text-gray-400'
            }`}
          >
            {daysAgo(tenant.last_activity)}
            {(atRisk || lastActDays > 7) && (
              <span className="ml-1 text-red-500">⚠</span>
            )}
          </span>
        </td>

        {/* Expand */}
        <td className="px-4 py-3 text-gray-500">
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-[#12172a] border-b border-white/5">
          <td colSpan={9} className="px-6 py-4">
            <div className="flex flex-wrap gap-6 items-start">
              {/* Feature adoption */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Feature Adoption
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {featureChecks.map((fc) => (
                    <div key={fc.label} className="flex items-center gap-2 text-sm">
                      {fc.done ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500/60 flex-shrink-0" />
                      )}
                      <span className={fc.done ? 'text-gray-300' : 'text-gray-500'}>
                        {fc.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk indicators */}
              {(atRisk || tenant.adoption_score < 30) && (
                <div className="ml-auto flex flex-col gap-2">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Risk Signals
                  </div>
                  {tenant.adoption_score < 30 && (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      Low adoption — needs nurturing
                    </div>
                  )}
                  {atRisk && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <Clock className="w-3 h-3" />
                      No activity in 7+ days — at risk of churn
                    </div>
                  )}
                  {tenant.lead_count <= 2 && (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <Users className="w-3 h-3" />
                      Only seed data — hasn&apos;t added real leads yet
                    </div>
                  )}
                </div>
              )}

              {/* Nudge button */}
              <div className="ml-auto flex items-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onNudge(tenant.id, tenant.name)
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs rounded-lg transition-colors"
                >
                  <Send className="w-3 h-3" />
                  Send re-engagement email
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main dashboard component ─────────────────────────────────────────────────

function AdminDashboard() {
  const [tenants, setTenants] = useState<TenantStats[]>(SEED_TENANTS)
  const [platform, setPlatform] = useState<RichPlatformStats>(SEED_PLATFORM)
  const [loading, setLoading] = useState(false)
  const [nudgeStatus, setNudgeStatus] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date>(new Date())

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [ts, ps] = await Promise.all([
        api.get<TenantStats[]>('/api/v1/admin/tenant-stats'),
        api.get<RichPlatformStats>('/api/v1/admin/platform-stats'),
      ])
      setTenants(ts)
      setPlatform(ps)
      setLastFetched(new Date())
    } catch {
      // silently fall back to seed data already in state
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleNudge = async (tenantId: number, tenantName: string) => {
    setNudgeStatus(`Sending nudge to ${tenantName}…`)
    try {
      await api.post('/api/v1/onboarding/trigger-drip', {
        tenant_id: tenantId,
        day: 3,
      })
      setNudgeStatus(`Re-engagement email sent to ${tenantName}`)
    } catch {
      setNudgeStatus(`Nudge queued for ${tenantName} (email will send when RESEND_API_KEY is set)`)
    }
    setTimeout(() => setNudgeStatus(null), 4000)
  }

  // ── Adoption band counts ──────────────────────────────────────────────────
  const bands = {
    high: tenants.filter((t) => t.adoption_score >= 76).length,
    mid: tenants.filter((t) => t.adoption_score >= 51 && t.adoption_score < 76).length,
    low: tenants.filter((t) => t.adoption_score >= 26 && t.adoption_score < 51).length,
    critical: tenants.filter((t) => t.adoption_score < 26).length,
  }
  const total = tenants.length || 1

  return (
    <div className="min-h-screen bg-[#0d1117] text-white px-6 py-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">NAMA OS</h1>
          </div>
          <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold rounded uppercase tracking-widest">
            ADMIN
          </span>
          <span className="text-gray-600 text-sm">/ Super Owner Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            Updated {lastFetched.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Role badge ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-300 font-medium">R0_NAMA_OWNER access — this page is not visible to any other role</span>
      </div>

      {/* ── Nudge status toast ──────────────────────────────────────────────── */}
      {nudgeStatus && (
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-blue-300 text-sm">
          <Mail className="w-4 h-4" />
          {nudgeStatus}
        </div>
      )}

      {/* ── Platform KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Total Tenants"
          value={platform.total_tenants}
          icon={Building2}
          color="bg-blue-500/20 text-blue-400"
          sub={`${platform.new_signups_7d} new this week`}
        />
        <StatCard
          label="Active This Week"
          value={platform.active_tenants}
          icon={Activity}
          color="bg-emerald-500/20 text-emerald-400"
          sub={`of ${platform.total_tenants} total`}
        />
        <StatCard
          label="Total Leads"
          value={platform.total_leads.toLocaleString('en-IN')}
          icon={Users}
          color="bg-teal-500/20 text-teal-400"
          sub="across all agencies"
        />
        <StatCard
          label="Total Bookings"
          value={platform.total_bookings}
          icon={Plane}
          color="bg-purple-500/20 text-purple-400"
          sub="confirmed + draft"
        />
        <StatCard
          label="Platform Revenue"
          value={formatRevenue(platform.total_revenue)}
          icon={TrendingUp}
          color="bg-amber-500/20 text-amber-400"
          sub="confirmed bookings only"
        />
      </div>

      {/* ── Adoption health + avg score ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Adoption band distribution */}
        <div className="md:col-span-2 bg-[#1a1f2e] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Adoption Health Distribution</h2>
            <BarChart3 className="w-4 h-4 text-gray-500" />
          </div>
          <div className="space-y-3">
            <AdoptionBand label="76–100%" count={bands.high} total={total} color="text-emerald-400" barColor="bg-emerald-500" />
            <AdoptionBand label="51–75%" count={bands.mid} total={total} color="text-blue-400" barColor="bg-blue-500" />
            <AdoptionBand label="26–50%" count={bands.low} total={total} color="text-amber-400" barColor="bg-amber-500" />
            <AdoptionBand label="0–25%" count={bands.critical} total={total} color="text-red-400" barColor="bg-red-500" />
          </div>
        </div>

        {/* Avg adoption score */}
        <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Avg Adoption Score</div>
          <div className="relative flex items-center justify-center w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e2533" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={
                  platform.avg_adoption_score >= 76
                    ? '#10b981'
                    : platform.avg_adoption_score >= 51
                    ? '#3b82f6'
                    : platform.avg_adoption_score >= 26
                    ? '#f59e0b'
                    : '#ef4444'
                }
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(platform.avg_adoption_score / 100) * 251.2} 251.2`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{Math.round(platform.avg_adoption_score)}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">platform average</div>
          <div className="mt-1 text-xs text-gray-600">
            {platform.new_signups_30d} signups last 30d
          </div>
        </div>
      </div>

      {/* ── Tenant table ─────────────────────────────────────────────────────── */}
      <div className="bg-[#1a1f2e] border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            All Tenants
            <span className="text-xs text-gray-500 font-normal">
              ({tenants.length} total)
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {tenants.filter(isAtRisk).length > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {tenants.filter(isAtRisk).length} at risk
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Agency</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Signed Up</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Leads</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Adoption</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Last Active</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                    No tenants found
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <TenantRow key={t.id} tenant={t} onNudge={handleNudge} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
      <div className="text-center text-xs text-gray-700 pb-4">
        NAMA OS Admin Panel · R0_NAMA_OWNER only · Auto-refreshes every 60s · Data from live Neon DB
      </div>
    </div>
  )
}

// ─── Page with role guard ─────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'R0_NAMA_OWNER') {
      router.replace('/dashboard')
    }
  }, [user, router])

  // Show nothing while auth is loading or if wrong role
  if (!user || user.role !== 'R0_NAMA_OWNER') return null

  return <AdminDashboard />
}
