'use client'

/**
 * NAMA OS — Owner Subscription Admin Page (R0_NAMA_OWNER)
 * ─────────────────────────────────────────────────────────
 * Platform-wide subscription management: MRR/ARR summary, tenant table,
 * plan change modal, and trial grant per tenant.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  DollarSign, TrendingUp, Users, AlertTriangle, RefreshCw,
  Loader, ChevronLeft, X, Check, Gift, ArrowRight, CreditCard,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { billingApi, type AdminSubscriptionRow, type SubscriptionPlan } from '@/lib/api'

// ─── Seed / fallback data ─────────────────────────────────────────────────────

const SEED_SUMMARY = {
  total_subscriptions: 47,
  active_count: 38,
  trial_count: 6,
  cancelled_count: 3,
  paused_count: 0,
  mrr_inr: 412000,
  arr_inr: 4944000,
  plan_breakdown: { starter: 22, growth: 18, scale: 7 },
  monthly_count: 32,
  yearly_count: 15,
}

const SEED_ROWS: AdminSubscriptionRow[] = [
  { id: 1, tenant_id: 2, plan: { id: 2, name: 'Growth',  slug: 'growth',  price_monthly: 14999, price_yearly: 149990, price_monthly_usd: 179, price_yearly_usd: 1790, max_users: 5,  max_leads: 200, features: null, is_active: true, sort_order: 2 }, status: 'active',    billing_cycle: 'monthly', cancel_at_period_end: false, current_period_end: '2026-05-16', created_at: '2026-01-15' },
  { id: 2, tenant_id: 3, plan: { id: 1, name: 'Starter', slug: 'starter', price_monthly: 4999,  price_yearly: 49990,  price_monthly_usd: 59,  price_yearly_usd: 590,  max_users: 1,  max_leads: 50,  features: null, is_active: true, sort_order: 1 }, status: 'active',    billing_cycle: 'monthly', cancel_at_period_end: false, current_period_end: '2026-05-12', created_at: '2026-02-01' },
  { id: 3, tenant_id: 4, plan: { id: 3, name: 'Scale',   slug: 'scale',   price_monthly: 39999, price_yearly: 399990, price_monthly_usd: 479, price_yearly_usd: 4790, max_users: 15, max_leads: null, features: null, is_active: true, sort_order: 3 }, status: 'active',    billing_cycle: 'yearly',  cancel_at_period_end: false, current_period_end: '2027-01-10', created_at: '2026-01-10' },
  { id: 4, tenant_id: 5, plan: { id: 1, name: 'Starter', slug: 'starter', price_monthly: 4999,  price_yearly: 49990,  price_monthly_usd: 59,  price_yearly_usd: 590,  max_users: 1,  max_leads: 50,  features: null, is_active: true, sort_order: 1 }, status: 'trial',     billing_cycle: 'monthly', cancel_at_period_end: false, current_period_end: '2026-04-30', created_at: '2026-04-01' },
  { id: 5, tenant_id: 6, plan: { id: 2, name: 'Growth',  slug: 'growth',  price_monthly: 14999, price_yearly: 149990, price_monthly_usd: 179, price_yearly_usd: 1790, max_users: 5,  max_leads: 200, features: null, is_active: true, sort_order: 2 }, status: 'active',    billing_cycle: 'monthly', cancel_at_period_end: true,  current_period_end: '2026-05-08', created_at: '2026-03-08' },
  { id: 6, tenant_id: 7, plan: { id: 2, name: 'Growth',  slug: 'growth',  price_monthly: 14999, price_yearly: 149990, price_monthly_usd: 179, price_yearly_usd: 1790, max_users: 5,  max_leads: 200, features: null, is_active: true, sort_order: 2 }, status: 'cancelled', billing_cycle: 'monthly', cancel_at_period_end: false, current_period_end: '2026-04-20', created_at: '2025-12-01' },
]

const SEED_PLANS: SubscriptionPlan[] = [
  { id: 1, name: 'Starter', slug: 'starter', price_monthly: 4999, price_yearly: 49990, price_monthly_usd: 59, price_yearly_usd: 590, max_users: 1, max_leads: 50, features: null, is_active: true, sort_order: 1 },
  { id: 2, name: 'Growth',  slug: 'growth',  price_monthly: 14999, price_yearly: 149990, price_monthly_usd: 179, price_yearly_usd: 1790, max_users: 5, max_leads: 200, features: null, is_active: true, sort_order: 2 },
  { id: 3, name: 'Scale',   slug: 'scale',   price_monthly: 39999, price_yearly: 399990, price_monthly_usd: 479, price_yearly_usd: 4790, max_users: 15, max_leads: null, features: null, is_active: true, sort_order: 3 },
]

const TENANT_NAMES: Record<number, string> = {
  2: 'Wanderlust Journeys',
  3: 'Heritage Trails Co.',
  4: 'Blue Horizon DMC',
  5: 'Alpine Expeditions',
  6: 'Coastal Escapes',
  7: 'Nomad Routes Ltd',
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  trial:     'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  paused:    'bg-slate-50 text-slate-600 border-slate-200',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  )
}

// ─── Plan Change Modal ────────────────────────────────────────────────────────

interface PlanChangeModalProps {
  row: AdminSubscriptionRow
  plans: SubscriptionPlan[]
  onClose: () => void
  onSaved: () => void
}

function PlanChangeModal({ row, plans, onClose, onSaved }: PlanChangeModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number>(row.plan?.id ?? 1)
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(row.billing_cycle as 'monthly' | 'yearly')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await billingApi.adminChangePlan(row.tenant_id, selectedPlanId, cycle)
      setSuccess(true)
      setTimeout(() => { onSaved(); onClose() }, 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to change plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-black text-[#0F172A]">Change Plan</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tenant #{row.tenant_id} · {TENANT_NAMES[row.tenant_id] ?? `Tenant ${row.tenant_id}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
              <Check size={14} /> Plan updated successfully!
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Plan selector */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Select Plan</label>
            <div className="space-y-2">
              {plans.map(plan => {
                const isSelected = plan.id === selectedPlanId
                const isCurrent  = plan.id === row.plan?.id
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      isSelected ? 'border-[#14B8A6] bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-black text-sm text-[#0F172A]">{plan.name}</span>
                      {isCurrent && (
                        <span className="ml-2 text-[9px] font-black uppercase bg-[#14B8A6] text-white px-1.5 py-0.5 rounded-full">Current</span>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{`${plan.max_users ?? '∞'} seats · ${plan.max_leads ?? '∞'} leads/mo`}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="font-black text-[#0F172A]">₹{plan.price_monthly.toLocaleString('en-IN')}/mo</div>
                      <div className="text-[10px] text-slate-400">₹{plan.price_yearly.toLocaleString('en-IN')}/yr</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Billing cycle */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Billing Cycle</label>
            <div className="flex gap-2">
              {(['monthly', 'yearly'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all capitalize ${
                    cycle === c ? 'border-[#14B8A6] bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {c}
                  {c === 'yearly' && <span className="ml-1 text-[9px] text-emerald-600 font-black">-17%</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-black border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="flex-1 py-2.5 rounded-xl text-sm font-black bg-[#14B8A6] text-[#0F172A] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Grant Trial Modal ────────────────────────────────────────────────────────

interface GrantTrialModalProps {
  row: AdminSubscriptionRow
  onClose: () => void
  onSaved: () => void
}

function GrantTrialModal({ row, onClose, onSaved }: GrantTrialModalProps) {
  const [days, setDays] = useState(14)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGrant() {
    setSaving(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
      const res = await fetch(`/api/v1/admin/subscriptions/${row.tenant_id}/grant-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ trial_days: days }),
      })
      if (!res.ok) throw new Error('Failed to grant trial')
      setSuccess(true)
      setTimeout(() => { onSaved(); onClose() }, 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-[#0F172A]">Grant Free Trial</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
              <Check size={14} /> Trial granted!
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          <p className="text-sm text-slate-500">
            Granting a free trial to <span className="font-bold text-slate-700">{TENANT_NAMES[row.tenant_id] ?? `Tenant #${row.tenant_id}`}</span>
          </p>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Trial Duration</label>
            <div className="flex gap-2">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                    days === d ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-black border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button
              onClick={handleGrant}
              disabled={saving || success}
              className="flex-1 py-2.5 rounded-xl text-sm font-black bg-amber-400 text-amber-900 hover:bg-amber-300 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader size={14} className="animate-spin" /> : <Gift size={14} />}
              {saving ? 'Granting…' : 'Grant Trial'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerSubscriptionsPage() {
  const auth = useAuth()
  const router = useRouter()

  const isDemo = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim() === 'nama_demo=1')
  const ALLOWED_ROLES = ['R0_NAMA_OWNER', 'R1_SUPER_ADMIN']
  const isAuthorized = !isDemo && !!auth.user && ALLOWED_ROLES.includes(auth.user.role)

  useEffect(() => {
    if (!auth.isLoading && !isAuthorized) router.replace('/dashboard')
  }, [auth.isLoading, isAuthorized, router])

  const [summary, setSummary] = useState<typeof SEED_SUMMARY | null>(null)
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SEED_PLANS)
  const [loading, setLoading] = useState(true)
  const [useSeed, setUseSeed] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const [changingRow, setChangingRow] = useState<AdminSubscriptionRow | null>(null)
  const [grantingRow, setGrantingRow] = useState<AdminSubscriptionRow | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      const [summRes, rowsRes, plansData] = await Promise.all([
        fetch('/api/v1/admin/subscriptions/summary', { headers }),
        billingApi.adminGetAll(statusFilter === 'ALL' ? undefined : statusFilter.toLowerCase()),
        billingApi.getPlans().catch(() => SEED_PLANS),
      ])

      if (summRes.ok) {
        const [s] = await Promise.all([summRes.json()])
        setSummary(s)
        setRows(rowsRes)
        const plans = Array.isArray(plansData) ? plansData : plansData.plans
        setPlans(plans.length ? plans : SEED_PLANS)
        setUseSeed(false)
      } else {
        throw new Error('backend-unreachable')
      }
    } catch {
      setSummary(SEED_SUMMARY)
      setRows(SEED_ROWS)
      setUseSeed(true)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [statusFilter])

  useEffect(() => { if (isAuthorized) load() }, [load, isAuthorized])

  if (auth.isLoading) return null
  if (!isAuthorized) return null

  const displayRows = rows.filter(r =>
    statusFilter === 'ALL' || r.status === statusFilter.toLowerCase()
  )

  const fmt = (n: number) =>
    '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

  const churnRate = summary
    ? ((summary.cancelled_count / Math.max(1, summary.total_subscriptions)) * 100).toFixed(1)
    : '0.0'

  const kpis = summary ? [
    { label: 'MRR', value: fmt(summary.mrr_inr), delta: '+14.8%', up: true, icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'ARR', value: fmt(summary.arr_inr), delta: '+14.8%', up: true, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Tenants', value: summary.active_count.toString(), delta: `+${summary.trial_count} trial`, up: true, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Churn Rate', value: `${churnRate}%`, delta: '-0.2%', up: false, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  ] : []

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top nav */}
      <header className="bg-[#0F172A] border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#14B8A6] rounded-lg flex items-center justify-center font-black text-[#0F172A] text-xs">N</div>
            <span className="font-black text-white tracking-tight">NAMA OS</span>
            <span className="text-slate-600 text-xs font-medium">/ Owner Portal</span>
            <span className="text-slate-600 text-xs font-medium">/ Subscriptions</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/owner" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={13} /> Owner Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Title */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Subscription Admin</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Manage all tenant plans · Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {useSeed && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-semibold">
              <AlertTriangle size={13} /> Showing seed data — backend unreachable
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center`}>
                  <k.icon size={17} className={k.color} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-bold ${k.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {k.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {k.delta}
                </span>
              </div>
              <div className="text-2xl font-black text-[#0F172A] mb-0.5">{k.value}</div>
              <div className="text-xs font-semibold text-slate-500">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Plan breakdown */}
        {summary && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-black text-[#0F172A] mb-4">Plan Breakdown</h2>
            <div className="grid grid-cols-3 gap-6">
              {Object.entries(summary.plan_breakdown).map(([slug, count]) => {
                const plan = plans.find(p => p.slug === slug)
                const pct = Math.round((count / Math.max(1, summary.total_subscriptions)) * 100)
                return (
                  <div key={slug}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-black text-[#0F172A] capitalize">{plan?.name ?? slug}</span>
                      <span className="text-sm font-black text-slate-600">{count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#14B8A6] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{pct}% of tenants</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tenant table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-black text-[#0F172A]">All Tenant Subscriptions</h2>
            <div className="flex items-center gap-2">
              {(['ALL', 'active', 'trial', 'cancelled', 'paused'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === s
                      ? 'bg-[#14B8A6] text-[#0F172A]'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader size={20} className="animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-3 text-left">Tenant</th>
                    <th className="px-6 py-3 text-left">Plan</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Cycle</th>
                    <th className="px-6 py-3 text-left">Next Billing</th>
                    <th className="px-6 py-3 text-right">MRR</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => {
                    const mrr = row.billing_cycle === 'yearly'
                      ? Math.round((row.plan?.price_yearly ?? 0) / 12)
                      : (row.plan?.price_monthly ?? 0)
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setChangingRow(row)}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                              style={{ backgroundColor: ['#14B8A6','#3B82F6','#8B5CF6','#F97316','#EF4444','#10B981'][i % 6] }}
                            >
                              {(TENANT_NAMES[row.tenant_id] ?? 'T')[0]}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[#0F172A]">{TENANT_NAMES[row.tenant_id] ?? `Tenant #${row.tenant_id}`}</div>
                              <div className="text-[10px] text-slate-400">ID #{row.tenant_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-sm font-bold text-slate-700">{row.plan?.name ?? '—'}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={row.status} />
                            {row.cancel_at_period_end && (
                              <span className="text-[9px] font-bold text-red-400">Cancels at period end</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-xs font-semibold text-slate-500 capitalize">{row.billing_cycle}</td>
                        <td className="px-6 py-3.5 text-xs font-semibold text-slate-500">
                          {row.current_period_end
                            ? new Date(row.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-sm text-[#14B8A6]">
                          {fmt(mrr)}
                        </td>
                        <td className="px-6 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setChangingRow(row)}
                              className="flex items-center gap-1.5 text-xs font-bold text-[#14B8A6] hover:bg-[#14B8A6]/10 px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              <CreditCard size={11} /> Change Plan
                            </button>
                            <button
                              onClick={() => setGrantingRow(row)}
                              className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              <Gift size={11} /> Trial
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {displayRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400 text-sm font-medium">
                        No subscriptions found for this filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick navigation */}
        <div className="flex items-center gap-4">
          <Link href="/owner" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#14B8A6] transition-colors">
            <ChevronLeft size={13} /> Back to Owner Portal
          </Link>
          <Link href="/dashboard/reports" className="flex items-center gap-1.5 text-xs font-bold text-[#14B8A6] hover:underline transition-colors">
            Revenue Reports <ArrowRight size={11} />
          </Link>
        </div>

      </main>

      {/* Modals */}
      {changingRow && (
        <PlanChangeModal
          row={changingRow}
          plans={plans}
          onClose={() => setChangingRow(null)}
          onSaved={load}
        />
      )}
      {grantingRow && (
        <GrantTrialModal
          row={grantingRow}
          onClose={() => setGrantingRow(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
