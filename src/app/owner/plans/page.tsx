'use client'

/**
 * NAMA OS — Plan Editor (R0_NAMA_OWNER)
 * ──────────────────────────────────────
 * Inline-editable plan cards, new plan modal, and deactivation with confirmation.
 * Price changes affect new subscriptions only — existing subscribers keep their rate.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  Tag, RefreshCw, Loader, ChevronLeft, X, Check, AlertTriangle,
  Plus, Save, Trash2, ToggleLeft, ToggleRight, Users, ArrowRight,
} from 'lucide-react'
import {
  billingApi,
  type SubscriptionPlan,
  type PlanCreateData,
  type PlanUpdateData,
} from '@/lib/api'

// ─── Seed / fallback data ─────────────────────────────────────────────────────

const SEED_PLANS: SubscriptionPlan[] = [
  { id: 1, name: 'Starter', slug: 'starter', price_monthly: 4999, price_yearly: 49990, price_monthly_usd: 59, price_yearly_usd: 590, max_users: 1, max_leads: 50, features: { 'AI Triage': true, 'Itinerary Builder': true, 'Quotations': true }, is_active: true, sort_order: 1 },
  { id: 2, name: 'Growth',  slug: 'growth',  price_monthly: 14999, price_yearly: 149990, price_monthly_usd: 179, price_yearly_usd: 1790, max_users: 5, max_leads: 200, features: { 'AI Triage': true, 'Itinerary Builder': true, 'Quotations': true, 'SMTP/IMAP': true, 'Webhooks': true }, is_active: true, sort_order: 2 },
  { id: 3, name: 'Scale',   slug: 'scale',   price_monthly: 39999, price_yearly: 399990, price_monthly_usd: 479, price_yearly_usd: 4790, max_users: 15, max_leads: null, features: { 'AI Triage': true, 'Itinerary Builder': true, 'Quotations': true, 'SMTP/IMAP': true, 'Webhooks': true, 'DMC Marketplace': true, 'Sentinel': true }, is_active: true, sort_order: 3 },
]

// Seed subscriber counts per plan (fallback when backend unavailable)
const SEED_SUB_COUNTS: Record<number, number> = { 1: 22, 2: 18, 3: 7 }

// ─── Feature chips input ──────────────────────────────────────────────────────

function FeatureChips({
  value,
  onChange,
}: {
  value: Record<string, boolean> | null
  onChange: (v: Record<string, boolean>) => void
}) {
  const features = value ? Object.keys(value) : []
  const [inputVal, setInputVal] = useState('')

  function addFeature() {
    const trimmed = inputVal.trim()
    if (!trimmed) return
    onChange({ ...(value ?? {}), [trimmed]: true })
    setInputVal('')
  }

  function removeFeature(key: string) {
    const next = { ...(value ?? {}) }
    delete next[key]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {features.map(f => (
          <span
            key={f}
            className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
          >
            {f}
            <button
              type="button"
              onClick={() => removeFeature(f)}
              className="ml-0.5 text-teal-400 hover:text-teal-700 transition-colors"
              aria-label={`Remove ${f}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {features.length === 0 && (
          <span className="text-[11px] text-slate-400 italic">No features yet</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }}
          placeholder="Add feature tag, press Enter"
          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] bg-white"
        />
        <button
          type="button"
          onClick={addFeature}
          className="text-xs font-bold text-[#14B8A6] hover:bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition-all"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Inline label ─────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  )
}

// ─── Plan card (inline editable) ──────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlan
  subscriberCount: number
  onSaved: () => void
  onDeactivate: (plan: SubscriptionPlan) => void
}

function PlanCard({ plan, subscriberCount, onSaved, onDeactivate }: PlanCardProps) {
  const [draft, setDraft] = useState<PlanUpdateData>({
    name:              plan.name,
    price_monthly:     plan.price_monthly,
    price_yearly:      plan.price_yearly,
    price_monthly_usd: plan.price_monthly_usd,
    price_yearly_usd:  plan.price_yearly_usd,
    max_users:         plan.max_users,
    max_leads:         plan.max_leads,
    features:          plan.features ? { ...plan.features } : null,
    is_active:         plan.is_active,
    sort_order:        plan.sort_order,
  })
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(false)
  const [error,  setError]    = useState<string | null>(null)

  function update<K extends keyof PlanUpdateData>(key: K, val: PlanUpdateData[K]) {
    setDraft(d => ({ ...d, [key]: val }))
    setSaved(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await billingApi.updatePlan(plan.id, draft)
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = (
    draft.name              !== plan.name              ||
    draft.price_monthly     !== plan.price_monthly     ||
    draft.price_yearly      !== plan.price_yearly      ||
    draft.price_monthly_usd !== plan.price_monthly_usd ||
    draft.price_yearly_usd  !== plan.price_yearly_usd  ||
    draft.max_users         !== plan.max_users         ||
    draft.max_leads         !== plan.max_leads         ||
    draft.is_active         !== plan.is_active         ||
    draft.sort_order        !== plan.sort_order        ||
    JSON.stringify(draft.features) !== JSON.stringify(plan.features)
  )

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all ${
      !draft.is_active ? 'border-slate-200 opacity-60' : 'border-slate-100 hover:shadow-md'
    }`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
            draft.is_active ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'
          }`}>
            {(draft.name ?? plan.name)?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-black text-[#0F172A] text-sm">{plan.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">slug: {plan.slug}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Users size={12} />
            {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => update('is_active', !draft.is_active)}
            className="flex items-center gap-1.5 text-xs font-bold transition-colors"
            title={draft.is_active ? 'Click to mark as inactive' : 'Click to mark as active'}
          >
            {draft.is_active
              ? <><ToggleRight size={18} className="text-[#14B8A6]" /><span className="text-emerald-600">Active</span></>
              : <><ToggleLeft  size={18} className="text-slate-400"  /><span className="text-slate-400">Inactive</span></>
            }
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-6 space-y-5">
        {/* Name */}
        <div>
          <FieldLabel>Plan Name</FieldLabel>
          <input
            type="text"
            value={draft.name ?? ''}
            onChange={e => update('name', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
          />
        </div>

        {/* INR Pricing row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Monthly Price (₹ INR)</FieldLabel>
            <input
              type="number"
              min={0}
              value={draft.price_monthly ?? 0}
              onChange={e => update('price_monthly', parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
            />
          </div>
          <div>
            <FieldLabel>Yearly Price (₹ INR)</FieldLabel>
            <input
              type="number"
              min={0}
              value={draft.price_yearly ?? 0}
              onChange={e => update('price_yearly', parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
            />
          </div>
        </div>

        {/* USD Pricing row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Monthly Price ($ USD)</FieldLabel>
            <input
              type="number"
              min={0}
              value={draft.price_monthly_usd ?? ''}
              onChange={e => update('price_monthly_usd', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g. 59"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
            />
          </div>
          <div>
            <FieldLabel>Yearly Price ($ USD)</FieldLabel>
            <input
              type="number"
              min={0}
              value={draft.price_yearly_usd ?? ''}
              onChange={e => update('price_yearly_usd', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g. 590"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
            />
          </div>
        </div>

        {/* Limits row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Max Users (-1 = unlimited)</FieldLabel>
            <input
              type="number"
              min={-1}
              value={draft.max_users ?? -1}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                update('max_users', isNaN(v) || v === -1 ? null : v)
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">{draft.max_users == null ? 'Unlimited' : `${draft.max_users} seat${draft.max_users !== 1 ? 's' : ''}`}</p>
          </div>
          <div>
            <FieldLabel>Max Leads (-1 = unlimited)</FieldLabel>
            <input
              type="number"
              min={-1}
              value={draft.max_leads ?? -1}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                update('max_leads', isNaN(v) || v === -1 ? null : v)
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">{draft.max_leads == null ? 'Unlimited' : `${draft.max_leads} leads/mo`}</p>
          </div>
        </div>

        {/* Sort order */}
        <div className="w-1/3">
          <FieldLabel>Sort Order</FieldLabel>
          <input
            type="number"
            min={1}
            value={draft.sort_order ?? 99}
            onChange={e => update('sort_order', parseInt(e.target.value, 10) || 99)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
          />
        </div>

        {/* Features */}
        <div>
          <FieldLabel>Features</FieldLabel>
          <FeatureChips
            value={draft.features ?? null}
            onChange={v => update('features', v)}
          />
        </div>

        {/* Error / success */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
            <Check size={14} /> Changes saved!
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-6 pb-5 gap-3">
        <button
          onClick={() => onDeactivate(plan)}
          disabled={!draft.is_active}
          className="flex items-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl border border-red-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 size={12} /> Deactivate
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex items-center gap-2 text-sm font-black bg-[#14B8A6] text-[#0F172A] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl transition-all"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── New Plan Modal ───────────────────────────────────────────────────────────

interface NewPlanModalProps {
  onClose:  () => void
  onSaved:  () => void
}

const EMPTY_NEW_PLAN: PlanCreateData = {
  name:              '',
  slug:              '',
  price_monthly:     0,
  price_yearly:      0,
  price_monthly_usd: null,
  price_yearly_usd:  null,
  max_users:         1,
  max_leads:         50,
  features:          {},
  is_active:         true,
  sort_order:        99,
}

function NewPlanModal({ onClose, onSaved }: NewPlanModalProps) {
  const [form, setForm]   = useState<PlanCreateData>({ ...EMPTY_NEW_PLAN })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function update<K extends keyof PlanCreateData>(key: K, val: PlanCreateData[K]) {
    setForm(f => ({ ...f, [key]: val }))
    setError(null)
  }

  // Auto-generate slug from name
  function handleNameChange(name: string) {
    update('name', name)
    update('slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Name and slug are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await billingApi.createPlan(form)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-black text-[#0F172A]">Add New Plan</h2>
            <p className="text-xs text-slate-400 mt-0.5">New plans are available immediately to new subscribers</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Name + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Plan Name *</FieldLabel>
              <input
                type="text"
                placeholder="e.g. Enterprise"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
              />
            </div>
            <div>
              <FieldLabel>Slug *</FieldLabel>
              <input
                type="text"
                placeholder="e.g. enterprise"
                value={form.slug}
                onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
              />
            </div>
          </div>

          {/* INR Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Monthly Price (₹ INR)</FieldLabel>
              <input
                type="number"
                min={0}
                value={form.price_monthly}
                onChange={e => update('price_monthly', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
              />
            </div>
            <div>
              <FieldLabel>Yearly Price (₹ INR)</FieldLabel>
              <input
                type="number"
                min={0}
                value={form.price_yearly}
                onChange={e => update('price_yearly', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
              />
            </div>
          </div>

          {/* USD Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Monthly Price ($ USD)</FieldLabel>
              <input
                type="number"
                min={0}
                value={form.price_monthly_usd ?? ''}
                onChange={e => update('price_monthly_usd', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 59"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
              />
            </div>
            <div>
              <FieldLabel>Yearly Price ($ USD)</FieldLabel>
              <input
                type="number"
                min={0}
                value={form.price_yearly_usd ?? ''}
                onChange={e => update('price_yearly_usd', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 590"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
              />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Max Users (-1 = unlimited)</FieldLabel>
              <input
                type="number"
                min={-1}
                value={form.max_users ?? -1}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  update('max_users', isNaN(v) || v === -1 ? null : v)
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
              />
            </div>
            <div>
              <FieldLabel>Max Leads (-1 = unlimited)</FieldLabel>
              <input
                type="number"
                min={-1}
                value={form.max_leads ?? -1}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  update('max_leads', isNaN(v) || v === -1 ? null : v)
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
              />
            </div>
          </div>

          {/* Sort order */}
          <div className="w-1/3">
            <FieldLabel>Sort Order</FieldLabel>
            <input
              type="number"
              min={1}
              value={form.sort_order ?? 99}
              onChange={e => update('sort_order', parseInt(e.target.value, 10) || 99)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-all"
            />
          </div>

          {/* Features */}
          <div>
            <FieldLabel>Features</FieldLabel>
            <FeatureChips
              value={form.features ?? null}
              onChange={v => update('features', v)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 pb-6 sticky bottom-0 bg-white border-t border-slate-50 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-black border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-black bg-[#14B8A6] text-[#0F172A] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <><Loader size={14} className="animate-spin" /> Creating…</> : <><Plus size={14} /> Create Plan</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Deactivate Confirmation Modal ────────────────────────────────────────────

interface DeactivateModalProps {
  plan:           SubscriptionPlan
  subscriberCount: number
  onClose:        () => void
  onConfirmed:    () => void
}

function DeactivateModal({ plan, subscriberCount, onClose, onConfirmed }: DeactivateModalProps) {
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await billingApi.deactivatePlan(plan.id)
      onConfirmed()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate plan')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-[#0F172A]">Deactivate Plan</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              <AlertTriangle size={14} /> {error}
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Deactivate <span className="text-amber-900">{plan.name}</span>?</p>
                <p className="mt-1 text-xs text-amber-700">
                  This plan will no longer appear in the pricing list.
                  {subscriberCount > 0 && (
                    <> <strong>{subscriberCount} existing subscriber{subscriberCount !== 1 ? 's' : ''}</strong> will keep their current rate until renewal.</>
                  )}
                </p>
                {subscriberCount > 0 && (
                  <p className="mt-1 text-xs font-bold text-red-600">
                    Warning: active subscribers detected. The backend will reject deactivation if any active/trial subscribers remain.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-black border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-sm font-black bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {busy ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {busy ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerPlansPage() {
  const auth   = useAuth()
  const router = useRouter()

  const isDemo = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim() === 'nama_demo=1')
  const ALLOWED_ROLES = ['R0_NAMA_OWNER', 'R1_SUPER_ADMIN']
  const isAuthorized = !isDemo && !!auth.user && ALLOWED_ROLES.includes(auth.user.role)

  useEffect(() => {
    if (!auth.isLoading && !isAuthorized) router.replace('/dashboard')
  }, [auth.isLoading, isAuthorized, router])

  const [plans,         setPlans]         = useState<SubscriptionPlan[]>([])
  const [subCounts,     setSubCounts]     = useState<Record<number, number>>(SEED_SUB_COUNTS)
  const [loading,       setLoading]       = useState(true)
  const [useSeed,       setUseSeed]       = useState(false)
  const [lastRefresh,   setLastRefresh]   = useState(new Date())
  const [showNewModal,  setShowNewModal]  = useState(false)
  const [deactivating,  setDeactivating] = useState<SubscriptionPlan | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      // Fetch plans + all subscriptions in parallel (to compute subscriber counts)
      const [plansData, adminRes] = await Promise.all([
        billingApi.getPlans(),
        fetch('/api/v1/billing/admin/all?per_page=500', { headers }),
      ])

      // Sort by sort_order
      const sorted = [...plansData.plans].sort((a, b) => a.sort_order - b.sort_order)
      setPlans(sorted.length ? sorted : SEED_PLANS)

      // Compute subscriber counts per plan
      if (adminRes.ok) {
        const subs = await adminRes.json() as Array<{ plan?: { id?: number }; status: string }>
        const counts: Record<number, number> = {}
        subs.forEach(s => {
          if (s.plan?.id && ['active', 'trial'].includes(s.status)) {
            counts[s.plan.id] = (counts[s.plan.id] ?? 0) + 1
          }
        })
        setSubCounts(counts)
      } else {
        setSubCounts(SEED_SUB_COUNTS)
      }

      setUseSeed(!plansData.plans.length)
    } catch {
      setPlans(SEED_PLANS)
      setSubCounts(SEED_SUB_COUNTS)
      setUseSeed(true)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => { if (isAuthorized) load() }, [load, isAuthorized])

  if (auth.isLoading) return null
  if (!isAuthorized) return null

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top nav */}
      <header className="bg-[#0F172A] border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#14B8A6] rounded-lg flex items-center justify-center font-black text-[#0F172A] text-xs">N</div>
            <span className="font-black text-white tracking-tight">NAMA OS</span>
            <span className="text-slate-600 text-xs font-medium">/ Owner Portal</span>
            <span className="text-slate-600 text-xs font-medium">/ Plans</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/owner" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={13} /> Owner Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Title + CTA */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Plan Editor</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Manage subscription plans · Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {useSeed && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
                <AlertTriangle size={12} /> Seed data
              </div>
            )}
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-[#14B8A6] text-[#0F172A] font-black text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-all"
            >
              <Plus size={15} /> Add New Plan
            </button>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-2xl text-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="font-black">Changing prices affects NEW subscriptions only.</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Existing subscribers keep their locked-in rate until their billing cycle renews or they manually upgrade / downgrade.
            </p>
          </div>
        </div>

        {/* Plan cards */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader size={22} className="animate-spin mr-3" /> Loading plans…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                subscriberCount={subCounts[plan.id] ?? 0}
                onSaved={load}
                onDeactivate={setDeactivating}
              />
            ))}
            {plans.length === 0 && (
              <div className="text-center py-20 text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-100">
                No plans found.{' '}
                <button onClick={() => setShowNewModal(true)} className="text-[#14B8A6] font-bold hover:underline">
                  Create your first plan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick links */}
        <div className="flex items-center gap-6 pt-2">
          <Link href="/owner" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#14B8A6] transition-colors">
            <ChevronLeft size={13} /> Back to Owner Portal
          </Link>
          <Link href="/owner/subscriptions" className="flex items-center gap-1.5 text-xs font-bold text-[#14B8A6] hover:underline transition-colors">
            Subscription Admin <ArrowRight size={11} />
          </Link>
        </div>

      </main>

      {/* Modals */}
      {showNewModal && (
        <NewPlanModal
          onClose={() => setShowNewModal(false)}
          onSaved={load}
        />
      )}
      {deactivating && (
        <DeactivateModal
          plan={deactivating}
          subscriberCount={subCounts[deactivating.id] ?? 0}
          onClose={() => setDeactivating(null)}
          onConfirmed={load}
        />
      )}
    </div>
  )
}
