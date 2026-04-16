'use client'

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Key,
  CheckCircle,
  Zap,
  Building2,
  Users,
  BarChart3,
  Star,
  AlertCircle,
  Loader,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  ExternalLink,
  Shield,
  TrendingDown,
} from 'lucide-react'
import { api } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  period: string
  seats: number | 'unlimited'
  leads: number | 'unlimited'
  itineraries: number | 'unlimited'
  modules: string
  byok: 'none' | 'optional' | 'recommended' | 'required'
  featured?: boolean
  features: string[]
}

interface ApiKey {
  id: number
  provider: string
  label: string
  key_masked: string
  is_active: boolean
  created_at: string
  last_used_at?: string
}

// ─── Plan data ────────────────────────────────────────────────────────────────

const PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 4999,
    period: 'month',
    seats: 1,
    leads: 50,
    itineraries: 20,
    modules: 'M1–M9',
    byok: 'none',
    features: ['1 seat', '50 AI leads/mo', '20 itineraries/mo', 'M1–M9 modules', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 14999,
    period: 'month',
    seats: 5,
    leads: 200,
    itineraries: 80,
    modules: 'M1–M13',
    byok: 'optional',
    features: ['5 seats', '200 AI leads/mo', '80 itineraries/mo', 'M1–M13 modules', 'Vendor registry', 'Priority support', 'BYOK (optional)'],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 39999,
    period: 'month',
    seats: 15,
    leads: 'unlimited',
    itineraries: 'unlimited',
    modules: 'M1–M19',
    byok: 'recommended',
    featured: true,
    features: ['15 seats', 'Unlimited leads', 'Unlimited itineraries', 'All M1–M19 modules', 'White-label portal', 'BYOK (recommended)', 'Dedicated CSM'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    period: 'custom',
    seats: 'unlimited',
    leads: 'unlimited',
    itineraries: 'unlimited',
    modules: 'M1–M19 + custom',
    byok: 'required',
    features: ['Unlimited seats', 'Unlimited everything', 'Custom integrations', 'Dedicated infra', 'SLA guarantees', 'On-prem option', 'BYOK (required)'],
  },
]

const BYOK_BADGE: Record<string, { label: string; color: string }> = {
  none:        { label: 'NAMA-hosted AI', color: 'bg-slate-100 text-slate-500' },
  optional:    { label: 'BYOK optional', color: 'bg-teal-50 text-teal-700' },
  recommended: { label: 'BYOK recommended', color: 'bg-green-50 text-green-700' },
  required:    { label: 'BYOK required', color: 'bg-blue-50 text-blue-700' },
}

const PROVIDERS = [
  { id: 'openai',    name: 'OpenAI',          icon: '⚡', hint: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic',        icon: '🔷', hint: 'sk-ant-...' },
  { id: 'google',    name: 'Google Gemini',    icon: '🌐', hint: 'AIza...' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'subscription' | 'api-keys'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('subscription')
  const [currentPlan] = useState('growth') // TODO: fetch from API
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add key form
  const [showAddKey, setShowAddKey] = useState(false)
  const [addProvider, setAddProvider] = useState('openai')
  const [addLabel, setAddLabel] = useState('')
  const [addKeyValue, setAddKeyValue] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  useEffect(() => {
    if (tab === 'api-keys') fetchApiKeys()
  }, [tab])

  const fetchApiKeys = async () => {
    setKeysLoading(true)
    try {
      const data = await api.get<ApiKey[]>('/api/v1/settings/api-keys')
      setApiKeys(data)
    } catch {
      // endpoint may not exist yet — show empty state gracefully
      setApiKeys([])
    } finally {
      setKeysLoading(false)
    }
  }

  const handleAddKey = async () => {
    if (!addKeyValue.trim()) return
    setAddLoading(true)
    try {
      const created = await api.post<ApiKey>('/api/v1/settings/api-keys', {
        provider: addProvider,
        label: addLabel || addProvider,
        api_key: addKeyValue,
      })
      setApiKeys((prev) => [...prev, created])
      setShowAddKey(false)
      setAddKeyValue('')
      setAddLabel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key')
    } finally {
      setAddLoading(false)
    }
  }

  const handleDeleteKey = async (id: number) => {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return }
    setDeleteConfirmId(null)
    try {
      await api.delete(`/api/v1/settings/api-keys/${id}`)
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Settings</h1>
        <p className="text-slate-500 mt-2 font-medium">Manage your subscription plan and AI provider keys.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={18} />
          <span className="font-medium text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { id: 'subscription', label: 'Subscription', icon: CreditCard },
          { id: 'api-keys',     label: 'API Keys (BYOK)', icon: Key },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === id
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ── SUBSCRIPTION TAB ── */}
      {tab === 'subscription' && (
        <div className="space-y-8">
          {/* Current plan banner */}
          <div className="bg-[#00236f] rounded-[24px] p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Star size={22} className="text-[#14B8A6]" fill="currentColor" />
              </div>
              <div>
                <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Current Plan</div>
                <div className="text-2xl font-extrabold">Growth</div>
                <div className="text-sm text-white/60">5 seats · 200 leads/mo · renews May 16, 2026</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-[#14B8A6]">₹14,999</div>
              <div className="text-xs text-white/40">/month</div>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan
              const badge = BYOK_BADGE[plan.byok]
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[20px] p-6 border-2 transition-all ${
                    plan.featured
                      ? 'border-[#00236f] bg-[#00236f] text-white'
                      : isCurrent
                        ? 'border-[#14B8A6] bg-teal-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#14B8A6] text-[#00236f] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 bg-[#14B8A6] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      Current
                    </div>
                  )}
                  <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${plan.featured ? 'text-white/50' : 'text-slate-400'}`}>
                    {plan.name}
                  </div>
                  <div className={`text-3xl font-black mb-1 ${plan.featured ? 'text-white' : 'text-[#0F172A]'}`}>
                    {plan.price === 0 ? 'Custom' : `₹${plan.price.toLocaleString('en-IN')}`}
                  </div>
                  <div className={`text-xs mb-4 ${plan.featured ? 'text-white/40' : 'text-slate-400'}`}>
                    {plan.price === 0 ? 'annual contract' : '/ month'}
                  </div>
                  <div className={`text-xs font-bold px-2.5 py-1.5 rounded-lg mb-4 text-center ${plan.featured ? 'bg-white/10 text-[#14B8A6]' : badge.color}`}>
                    {badge.label}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className={`text-xs flex gap-2 ${plan.featured ? 'text-white/70' : 'text-slate-600'}`}>
                        <CheckCircle size={12} className={`mt-0.5 flex-shrink-0 ${plan.featured ? 'text-[#14B8A6]' : 'text-[#14B8A6]'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCurrent}
                    className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      plan.featured
                        ? 'bg-[#14B8A6] text-[#00236f] hover:opacity-90'
                        : isCurrent
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : plan.price === 0
                            ? 'border-2 border-[#00236f] text-[#00236f] hover:bg-[#00236f] hover:text-white'
                            : 'border-2 border-[#00236f] text-[#00236f] hover:bg-[#00236f] hover:text-white'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Contact Sales' : 'Upgrade'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* BYOK savings callout */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-[20px] p-6 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <TrendingDown size={22} className="text-teal-600" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-900 mb-1">Save up to 80% on AI costs with BYOK</div>
              <p className="text-sm text-slate-600 mb-3">
                On Growth and above plans, you can connect your own OpenAI, Anthropic, or Google API keys.
                NAMA routes all AI calls through your key — you pay provider rates directly, not NAMA's markup.
              </p>
              <a
                href="/byok-calculator"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-900 transition-colors"
              >
                Open BYOK Savings Calculator <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── API KEYS TAB ── */}
      {tab === 'api-keys' && (
        <div className="space-y-6">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-5 flex gap-3">
            <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-blue-900 text-sm mb-1">Your keys are encrypted at rest</div>
              <p className="text-xs text-blue-700 leading-relaxed">
                NAMA stores API keys using AES-256 encryption. Keys are decrypted only in-memory at call time and never logged.
                Each key is scoped to your tenant — no cross-tenant access is possible.
              </p>
            </div>
          </div>

          {/* Keys list */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-lg">AI Provider Keys</h3>
                <p className="text-xs text-slate-400 mt-0.5">NAMA uses these keys for all AI operations on your account</p>
              </div>
              <button
                onClick={() => setShowAddKey(true)}
                className="flex items-center gap-2 bg-[#00236f] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
              >
                <Plus size={16} /> Add Key
              </button>
            </div>

            {keysLoading ? (
              <div className="flex justify-center py-10">
                <Loader size={28} className="animate-spin text-slate-300" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key size={24} className="text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-700 mb-1">No API keys added yet</h4>
                <p className="text-sm text-slate-400 mb-4 max-w-xs mx-auto">
                  Add your OpenAI, Anthropic, or Google API key to activate BYOK and start saving.
                </p>
                <button
                  onClick={() => setShowAddKey(true)}
                  className="inline-flex items-center gap-2 bg-[#14B8A6] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-all"
                >
                  <Plus size={16} /> Add Your First Key
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => {
                  const provider = PROVIDERS.find((p) => p.id === key.provider)
                  return (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl">
                          {provider?.icon || '🔑'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{key.label || provider?.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{key.key_masked}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${key.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {key.last_used_at && (
                          <span className="text-xs text-slate-400 hidden md:block">
                            Used {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                        {deleteConfirmId === key.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600 font-bold">Delete?</span>
                            <button onClick={() => handleDeleteKey(key.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700">Yes</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteKey(key.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Provider cost guide */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h3 className="font-extrabold text-[#0F172A] mb-4">Provider Cost Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: '⚡', name: 'OpenAI GPT-4o', inp: '$5/1M', out: '$15/1M', rec: 'Best quality for itineraries', badge: 'Popular' },
                { icon: '🔷', name: 'Claude Haiku', inp: '$0.25/1M', out: '$1.25/1M', rec: 'Lowest cost — great for triage', badge: 'Cheapest' },
                { icon: '🌐', name: 'Google Gemini 1.5', inp: '$1.25/1M', out: '$5/1M', rec: 'Good balance of cost + quality', badge: '' },
              ].map((p) => (
                <div key={p.name} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{p.name}</div>
                      {p.badge && <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div>Input: <span className="font-bold text-slate-700">{p.inp}</span></div>
                    <div>Output: <span className="font-bold text-slate-700">{p.out}</span></div>
                    <div className="text-slate-400 mt-2">{p.rec}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Key Modal */}
      {showAddKey && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Add API Key</h2>
              <button onClick={() => setShowAddKey(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAddProvider(p.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        addProvider === p.id ? 'border-[#14B8A6] bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xl mb-1">{p.icon}</div>
                      <div className="text-xs font-bold text-slate-700">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder="e.g. Production key"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={addKeyValue}
                    onChange={(e) => setAddKeyValue(e.target.value)}
                    placeholder={PROVIDERS.find(p => p.id === addProvider)?.hint || 'Your API key'}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Stored with AES-256 encryption. Never logged or exposed.</p>
              </div>

              <button
                onClick={handleAddKey}
                disabled={addLoading || !addKeyValue.trim()}
                className="w-full bg-[#0F172A] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50 mt-2"
              >
                {addLoading ? <><Loader size={16} className="animate-spin" /> Saving...</> : <><Shield size={16} /> Save Encrypted Key</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
