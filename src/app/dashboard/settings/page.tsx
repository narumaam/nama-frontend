'use client'

import React, { useState, useEffect } from 'react'
<<<<<<< HEAD
import {
  CreditCard, Key, CheckCircle, Zap, Building2, Users,
  BarChart3, Star, AlertCircle, Loader, Eye, EyeOff,
  Trash2, Plus, ExternalLink, Shield, TrendingDown,
  User, Bell, Palette, DollarSign, Lock, ClipboardList,
  Mail, Phone, Edit3, Save, X, RefreshCw, Copy, Check,
  UserPlus, RotateCcw, ChevronDown, Globe, Upload,
=======
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
  Palette,
  Bell,
  History,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
  Layout,
  Save,
  MapPin,
  Clock,
  Briefcase,
  ChevronRight,
  Info,
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
} from 'lucide-react'
import { api } from '@/lib/api'

// ─── Constants ───────────────────────────────────────────────────────────────

<<<<<<< HEAD
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

interface TeamMember {
  id: string
  email: string
  name: string
  role: string
  status: 'active' | 'invited' | 'disabled'
  joined_at?: string
  invited_at?: string
  avatar?: string
}

interface AuditEntry {
  id: string
  user_email: string
  action: string
  resource: string
  resource_id?: string
  details?: string
  ip?: string
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANS: SubscriptionPlan[] = [
  {
    id: 'starter', name: 'Starter', price: 4999, period: 'month',
    seats: 1, leads: 50, itineraries: 20, modules: 'M1–M9', byok: 'none',
    features: ['1 seat', '50 AI leads/mo', '20 itineraries/mo', 'M1–M9 modules', 'Email support'],
  },
  {
    id: 'growth', name: 'Growth', price: 14999, period: 'month',
    seats: 5, leads: 200, itineraries: 80, modules: 'M1–M13', byok: 'optional',
    features: ['5 seats', '200 AI leads/mo', '80 itineraries/mo', 'M1–M13 modules', 'Vendor registry', 'Priority support', 'BYOK (optional)'],
  },
  {
    id: 'scale', name: 'Scale', price: 39999, period: 'month',
    seats: 15, leads: 'unlimited', itineraries: 'unlimited', modules: 'M1–M19', byok: 'recommended',
    featured: true,
    features: ['15 seats', 'Unlimited leads', 'Unlimited itineraries', 'All M1–M19 modules', 'White-label portal', 'BYOK (recommended)', 'Dedicated CSM'],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 0, period: 'custom',
    seats: 'unlimited', leads: 'unlimited', itineraries: 'unlimited', modules: 'M1–M19 + custom', byok: 'required',
    features: ['Unlimited seats', 'Unlimited everything', 'Custom integrations', 'Dedicated infra', 'SLA guarantees', 'On-prem option', 'BYOK (required)'],
  },
=======
const PLANS = [
  { 
    id: 'starter', 
    name: 'Starter', 
    price: 4999, 
    period: 'mo',
    features: ['Up to 5 Users', 'Basic Triage AI', 'Leads CRM', '10 Quotes / mo'],
    byok: 'N',
    featured: false
  },
  { 
    id: 'growth', 
    name: 'Growth', 
    price: 12999, 
    period: 'mo',
    features: ['Unlimited Users', 'Advanced Haiku AI', 'Full Quotes & Bookings', 'BYOK Support'],
    byok: 'Y',
    featured: true
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    price: 24999, 
    period: 'mo',
    features: ['Priority AI Processing', 'White-labeling', 'API Access', 'Dedicated Support'],
    byok: 'Y',
    featured: false
  },
  { 
    id: 'enterprise', 
    name: 'Enterprise', 
    price: 0, 
    period: 'custom',
    features: ['Custom AI Models', 'On-premise deployment', 'SLA Guarantee', 'Dedicated Account Manager'],
    byok: 'Y',
    featured: false
  }
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
]

const BYOK_BADGE: Record<string, { label: string, color: string }> = {
  'Y': { label: 'BYOK Enabled', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  'N': { label: 'Managed AI Only', color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: '⚡', hint: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', icon: '🔷', hint: 'sk-ant-...' },
  { id: 'google', name: 'Google Gemini', icon: '🌐', hint: 'AIza...' },
]

const ROLES = [
  { id: 'R3_AGENT', label: 'Agent', description: 'Can manage leads, quotations, bookings assigned to them', color: 'bg-blue-50 text-blue-700' },
  { id: 'R2_MANAGER', label: 'Manager', description: 'Full access to all leads, bookings, reports; can invite agents', color: 'bg-purple-50 text-purple-700' },
  { id: 'R1_SUPER_ADMIN', label: 'Super Admin', description: 'All permissions including billing, settings, team management', color: 'bg-amber-50 text-amber-700' },
]

const SEED_TEAM: TeamMember[] = [
  { id: '1', email: 'owner@nama.travel', name: 'Agency Owner', role: 'R1_SUPER_ADMIN', status: 'active', joined_at: '2026-01-01' },
  { id: '2', email: 'priya@nama.travel', name: 'Priya Sharma', role: 'R2_MANAGER', status: 'active', joined_at: '2026-02-15' },
  { id: '3', email: 'rahul@nama.travel', name: 'Rahul Verma', role: 'R3_AGENT', status: 'active', joined_at: '2026-03-01' },
  { id: '4', email: 'new@example.com', name: '', role: 'R3_AGENT', status: 'invited', invited_at: '2026-04-10' },
]

const SEED_AUDIT: AuditEntry[] = [
  { id: '1', user_email: 'owner@nama.travel', action: 'LOGIN', resource: 'auth', created_at: '2026-04-18T09:12:00Z', ip: '122.176.x.x' },
  { id: '2', user_email: 'priya@nama.travel', action: 'CREATE', resource: 'quotation', resource_id: 'Q-2026-045', created_at: '2026-04-18T09:05:00Z' },
  { id: '3', user_email: 'rahul@nama.travel', action: 'UPDATE', resource: 'lead', resource_id: 'L-2026-112', details: 'Stage: New → Qualified', created_at: '2026-04-18T08:58:00Z' },
  { id: '4', user_email: 'owner@nama.travel', action: 'INVITE', resource: 'team', resource_id: 'new@example.com', created_at: '2026-04-10T14:30:00Z' },
  { id: '5', user_email: 'priya@nama.travel', action: 'CREATE', resource: 'booking', resource_id: 'BK-2026-018', created_at: '2026-04-09T11:20:00Z' },
  { id: '6', user_email: 'owner@nama.travel', action: 'DELETE', resource: 'api_key', resource_id: 'key-xxx', created_at: '2026-04-08T16:45:00Z' },
]

// ─── Tab definitions ──────────────────────────────────────────────────────────

type Tab = 'subscription' | 'api-keys' | 'team' | 'roles' | 'markups' | 'profile' | 'branding' | 'notifications' | 'audit'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'subscription',  label: 'Subscription',   icon: CreditCard },
  { id: 'api-keys',      label: 'API Keys',        icon: Key },
  { id: 'team',          label: 'Team',            icon: Users },
  { id: 'roles',         label: 'Roles',           icon: Lock },
  { id: 'markups',       label: 'Markups',         icon: DollarSign },
  { id: 'profile',       label: 'Profile',         icon: User },
  { id: 'branding',      label: 'Branding',        icon: Palette },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'audit',         label: 'Audit Log',       icon: ClipboardList },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 
  | 'profile' 
  | 'branding' 
  | 'team' 
  | 'roles' 
  | 'markups' 
  | 'notifications' 
  | 'audit-log' 
  | 'subscription' 
  | 'api-keys'

interface ApiKey {
  id: string
  provider: string
  label: string
  key_masked: string
  is_active: boolean
  last_used_at?: string
}

interface TeamMember {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

interface Invite {
  id: number
  email: string
  role: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
<<<<<<< HEAD
  const [tab, setTab] = useState<Tab>('subscription')
  const [currentPlan] = useState('growth')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
=======
  const [tab, setTab] = useState<Tab>('profile')
  const [currentPlan] = useState('growth')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Settings Data
  const [profile, setProfile] = useState<any>(null)
  const [branding, setBranding] = useState<any>(null)
  const [markups, setMarkups] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  // Add Key Modal State
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
  const [showAddKey, setShowAddKey] = useState(false)
  // ...
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('R3_SALES_MANAGER')
  const [inviteLoading, setInviteLoading] = useState(false)

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(SEED_TEAM)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('R3_AGENT')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  // Profile state
  const [profileName, setProfileName] = useState('Agency Owner')
  const [profilePhone, setProfilePhone] = useState('+91 98765 43210')
  const [profileEmail] = useState('owner@nama.travel')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)

  // Branding state
  const [brandName, setBrandName] = useState('NAMA Travel')
  const [brandTagline, setBrandTagline] = useState('Your World, Our Expertise')
  const [brandColor, setBrandColor] = useState('#14B8A6')
  const [brandSaving, setBrandSaving] = useState(false)

  // Markups state
  const [markupDefault, setMarkupDefault] = useState('15')
  const [markupIntl, setMarkupIntl] = useState('18')
  const [markupDomestic, setMarkupDomestic] = useState('12')
  const [markupHoneymoon, setMarkupHoneymoon] = useState('20')
  const [markupSaving, setMarkupSaving] = useState(false)

  // Notifications state
  const [notifLeads, setNotifLeads] = useState(true)
  const [notifBookings, setNotifBookings] = useState(true)
  const [notifPayments, setNotifPayments] = useState(true)
  const [notifQuotes, setNotifQuotes] = useState(false)
  const [notifReports, setNotifReports] = useState(false)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifWhatsapp, setNotifWhatsapp] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)

  // Audit state
  const [auditEntries] = useState<AuditEntry[]>(SEED_AUDIT)
  const [auditSearch, setAuditSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [tab])

<<<<<<< HEAD
  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }
=======
  const fetchData = async () => {
    setLoading(true)
    try {
      if (tab === 'profile') setProfile(await api.get('/api/v1/settings/profile'))
      if (tab === 'branding') setBranding(await api.get('/api/v1/settings/branding'))
      if (tab === 'markups') setMarkups(await api.get('/api/v1/settings/markups'))
      if (tab === 'audit-log') setAuditLogs(await api.get('/api/v1/settings/audit-logs'))
      if (tab === 'notifications') setNotifications(await api.get('/api/v1/settings/notifications'))
      if (tab === 'team') fetchTeamData()
      if (tab === 'api-keys') fetchApiKeys()
    } catch (err) {
      console.error(`Failed to fetch ${tab}:`, err)
      setError(`Failed to load ${tab} settings.`)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamData = async () => {
    try {
      const [members, pendingInvites] = await Promise.all([
        api.get<TeamMember[]>('/api/v1/settings/team'),
        api.get<Invite[]>('/api/v1/settings/invites')
      ])
      setTeam(members)
      setInvites(pendingInvites)
    } catch (err) {
      setError('Failed to load team data')
    }
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
  }

  const fetchApiKeys = async () => {
    setKeysLoading(true)
    try {
      const data = await api.get<ApiKey[]>('/api/v1/settings/api-keys')
      setApiKeys(data)
<<<<<<< HEAD
    } catch { setApiKeys([]) }
    finally { setKeysLoading(false) }
=======
    } catch (err) {
      setError('Failed to load API keys')
    } finally {
      setKeysLoading(false)
    }
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
  }

  const handleAddKey = async () => {
    setAddLoading(true)
    try {
<<<<<<< HEAD
      const created = await api.post<ApiKey>('/api/v1/settings/api-keys', {
        provider: addProvider, label: addLabel || addProvider, api_key: addKeyValue,
      })
      setApiKeys((prev) => [...prev, created])
      setShowAddKey(false); setAddKeyValue(''); setAddLabel('')
      flash('API key saved securely')
    } catch (err) { flash(err instanceof Error ? err.message : 'Failed to save key', true) }
    finally { setAddLoading(false) }
=======
      const newKey = await api.post<ApiKey>('/api/v1/settings/api-keys', {
        provider: addProvider,
        label: addLabel,
        key_value: addKeyValue,
      })
      setApiKeys([...apiKeys, newKey])
      setShowAddKey(false)
      setAddLabel('')
      setAddKeyValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key')
    } finally {
      setAddLoading(false)
    }
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
  }

  const handleDeleteKey = async (id: string) => {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return }
    setDeleteConfirmId(null)
    try {
      await api.delete(`/api/v1/settings/api-keys/${id}`)
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
      flash('Key deleted')
    } catch (err) { flash(err instanceof Error ? err.message : 'Failed to delete', true) }
  }

<<<<<<< HEAD
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    try {
      await api.post('/api/v1/settings/team/invite', { email: inviteEmail, role: inviteRole })
      const newMember: TeamMember = {
        id: Date.now().toString(), email: inviteEmail, name: '', role: inviteRole,
        status: 'invited', invited_at: new Date().toISOString(),
      }
      setTeamMembers((prev) => [...prev, newMember])
      setShowInvite(false); setInviteEmail('')
      flash(`Invite sent to ${inviteEmail}`)
    } catch {
      // API not connected yet — still show optimistic UI
      const newMember: TeamMember = {
        id: Date.now().toString(), email: inviteEmail, name: '', role: inviteRole,
        status: 'invited', invited_at: new Date().toISOString(),
      }
      setTeamMembers((prev) => [...prev, newMember])
      setShowInvite(false); setInviteEmail('')
      flash(`Invite queued for ${inviteEmail}`)
    }
    setInviteLoading(false)
  }

  const saveProfile = async () => {
    setProfileSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setProfileSaving(false); setProfileEditing(false)
    flash('Profile updated')
  }

  const saveBranding = async () => {
    setBrandSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setBrandSaving(false)
    flash('Branding saved')
  }

  const saveMarkups = async () => {
    setMarkupSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setMarkupSaving(false)
    flash('Markup rules saved')
  }

  const saveNotifications = async () => {
    setNotifSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setNotifSaving(false)
    flash('Notification preferences saved')
  }

  const filteredAudit = auditEntries.filter(e => {
    const q = auditSearch.toLowerCase()
    return !q || e.user_email.includes(q) || e.action.toLowerCase().includes(q) || e.resource.includes(q)
  })

  const roleForId = (id: string) => ROLES.find(r => r.id === id)

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-teal-500' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  )

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Settings</h1>
        <p className="text-slate-500 mt-2 font-medium">Manage your agency, team, billing, and preferences.</p>
      </div>

      {/* Toast */}
      {(error || success) && (
        <div className={`flex items-center gap-3 border rounded-xl p-4 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {error ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span className="font-medium text-sm">{error || success}</span>
          <button onClick={() => { setError(null); setSuccess(null) }} className="ml-auto opacity-60 hover:opacity-100">✕</button>
=======
  // ─── Renderers ─────────────────────────────────────────────────────────────

  const renderProfile = () => (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <Building2 size={24} />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-[#0F172A]">Agency Profile</h3>
          <p className="text-sm text-slate-400 font-medium">Basic information for your travel agency.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Legal Entity Name</label>
            <input 
              type="text" value={profile?.legal_name || ''} 
              onChange={(e) => setProfile({...profile, legal_name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:border-[#14B8A6] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">GSTIN / Tax ID</label>
            <input 
              type="text" value={profile?.gstin || ''} 
              onChange={(e) => setProfile({...profile, gstin: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:border-[#14B8A6] outline-none transition-all"
            />
          </div>
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
        </div>

<<<<<<< HEAD
      {/* Tabs — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-max min-w-full md:w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                tab === id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SUBSCRIPTION ── */}
      {tab === 'subscription' && (
        <div className="space-y-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan
              const badge = BYOK_BADGE[plan.byok]
              return (
                <div key={plan.id} className={`relative rounded-[20px] p-6 border-2 transition-all ${
                  plan.featured ? 'border-[#00236f] bg-[#00236f] text-white'
                    : isCurrent ? 'border-[#14B8A6] bg-teal-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
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
                  <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${plan.featured ? 'text-white/50' : 'text-slate-400'}`}>{plan.name}</div>
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
                        <CheckCircle size={12} className="mt-0.5 flex-shrink-0 text-[#14B8A6]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button disabled={isCurrent} className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    plan.featured ? 'bg-[#14B8A6] text-[#00236f] hover:opacity-90'
                      : isCurrent ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-2 border-[#00236f] text-[#00236f] hover:bg-[#00236f] hover:text-white'
                  }`}>
                    {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Contact Sales' : 'Upgrade'}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-[20px] p-6 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <TrendingDown size={22} className="text-teal-600" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-900 mb-1">Save up to 80% on AI costs with BYOK</div>
              <p className="text-sm text-slate-600 mb-3">
                Connect your own OpenAI, Anthropic, or Google API keys. NAMA routes all AI calls through your key — you pay provider rates directly.
              </p>
              <button onClick={() => setTab('api-keys')} className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-900 transition-colors">
                Manage API Keys <ExternalLink size={13} />
              </button>
=======
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Registered Address</label>
          <div className="space-y-4">
            <input 
              type="text" value={profile?.address_line1 || ''} 
              onChange={(e) => setProfile({...profile, address_line1: e.target.value})}
              placeholder="Building, Street, Area"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:border-[#14B8A6] outline-none transition-all"
            />
            <div className="grid grid-cols-3 gap-4">
              <input 
                type="text" value={profile?.city || ''} 
                onChange={(e) => setProfile({...profile, city: e.target.value})}
                placeholder="City"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:border-[#14B8A6] outline-none transition-all"
              />
              <input 
                type="text" value={profile?.state || ''} 
                onChange={(e) => setProfile({...profile, state: e.target.value})}
                placeholder="State"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:border-[#14B8A6] outline-none transition-all"
              />
              <input 
                type="text" value={profile?.pincode || ''} 
                onChange={(e) => setProfile({...profile, pincode: e.target.value})}
                placeholder="Pincode"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:border-[#14B8A6] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={async () => {
              await api.put('/api/v1/settings/profile', profile)
              alert('Profile updated successfully!')
            }}
            className="flex items-center gap-2 bg-[#00236f] text-white px-8 py-3.5 rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
          >
            <Save size={18} /> Save Profile Changes
          </button>
        </div>
      </div>
    </div>
  )

  const renderBranding = () => (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600">
          <Palette size={24} />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-[#0F172A]">Branding & Visuals</h3>
          <p className="text-sm text-slate-400 font-medium">Customize how NAMA looks for your agency.</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-start gap-8">
          <div className="w-32 h-32 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain p-4" />
            ) : (
              <Plus className="text-slate-300" size={32} />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button className="text-white text-xs font-black uppercase tracking-widest">Replace</button>
            </div>
          </div>
          <div className="flex-1 pt-2">
            <h4 className="font-extrabold text-[#0F172A] mb-1">Agency Logo</h4>
            <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">
              Upload a high-resolution logo (SVG or PNG). This logo will appear on your dashboard, invoices, and vouchers.
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">Upload New</button>
              <button className="px-4 py-2 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all">Remove</button>
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
            </div>
          </div>
        </div>

<<<<<<< HEAD
      {/* ── API KEYS ── */}
      {tab === 'api-keys' && (
        <div className="space-y-6">
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

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-lg">AI Provider Keys</h3>
                <p className="text-xs text-slate-400 mt-0.5">NAMA uses these keys for all AI operations on your account</p>
              </div>
              <button onClick={() => setShowAddKey(true)} className="flex items-center gap-2 bg-[#00236f] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
                <Plus size={16} /> Add Key
=======
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Primary Theme Color</label>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <input 
                type="color" value={branding?.primary_color || '#00236f'} 
                onChange={(e) => setBranding({...branding, primary_color: e.target.value})} 
                className="w-12 h-12 rounded-xl overflow-hidden border-0 cursor-pointer shadow-sm" 
              />
              <div className="flex-1">
                <input 
                  type="text" value={branding?.primary_color || '#00236f'} 
                  onChange={(e) => setBranding({...branding, primary_color: e.target.value})} 
                  className="w-full bg-transparent font-mono text-sm font-bold text-slate-700 outline-none" 
                />
                <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">HEX CODE</div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Accent Color</label>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <input 
                type="color" value={branding?.secondary_color || '#14B8A6'} 
                onChange={(e) => setBranding({...branding, secondary_color: e.target.value})} 
                className="w-12 h-12 rounded-xl overflow-hidden border-0 cursor-pointer shadow-sm" 
              />
              <div className="flex-1">
                <input 
                  type="text" value={branding?.secondary_color || '#14B8A6'} 
                  onChange={(e) => setBranding({...branding, secondary_color: e.target.value})} 
                  className="w-full bg-transparent font-mono text-sm font-bold text-slate-700 outline-none" 
                />
                <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">HEX CODE</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={async () => {
              await api.put('/api/v1/settings/branding', branding)
              alert('Branding saved!')
            }}
            className="flex items-center gap-2 bg-[#00236f] text-white px-8 py-3.5 rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
          >
            <Save size={18} /> Apply Visual Changes
          </button>
        </div>
      </div>
    </div>
  )

  const renderMarkups = () => (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingDown size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#0F172A]">Service Markups</h3>
            <p className="text-sm text-slate-400 font-medium">Automatic profit rules for different segments.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const label = prompt('Markup Label (e.g. Domestic Flights)?');
            const service_type = prompt('Service Type (FLIGHT, HOTEL, PACKAGE, VISA)?');
            const value = prompt('Markup Value (%)?');
            if (label && service_type && value) {
              api.post('/api/v1/settings/markups', { 
                label, 
                service_type: service_type.toUpperCase(), 
                value: parseFloat(value), 
                markup_type: 'PERCENT', 
                is_active: true 
              }).then(m => setMarkups([...markups, m]));
            }
          }}
          className="flex items-center gap-2 bg-[#14B8A6] text-white px-5 py-3 rounded-2xl text-sm font-black hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/10 active:scale-95"
        >
          <Plus size={20} /> Add New Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {markups.map((m) => (
          <div key={m.id} className="group flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-white transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#14B8A6] transition-colors">
                <BarChart3 size={24} />
              </div>
              <div>
                <div className="font-extrabold text-slate-900">{m.label}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md">{m.service_type}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-bold text-slate-500">Active</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xl font-black text-[#0F172A]">{m.value}{m.markup_type === 'PERCENT' ? '%' : ' INR'}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.markup_type}</div>
              </div>
              <button 
                onClick={async () => {
                  if (confirm('Delete this rule?')) {
                    await api.delete(`/api/v1/settings/markups/${m.id}`)
                    setMarkups(markups.filter(x => x.id !== m.id))
                  }
                }}
                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
              </button>
            </div>
          </div>
        ))}

<<<<<<< HEAD
            {keysLoading ? (
              <div className="flex justify-center py-10"><Loader size={28} className="animate-spin text-slate-300" /></div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Key size={24} className="text-slate-400" /></div>
                <h4 className="font-bold text-slate-700 mb-1">No API keys added yet</h4>
                <p className="text-sm text-slate-400 mb-4 max-w-xs mx-auto">Add your OpenAI, Anthropic, or Google API key to activate BYOK and start saving.</p>
                <button onClick={() => setShowAddKey(true)} className="inline-flex items-center gap-2 bg-[#14B8A6] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-all">
                  <Plus size={16} /> Add Your First Key
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => {
                  const provider = PROVIDERS.find((p) => p.id === key.provider)
                  return (
                    <div key={key.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl">{provider?.icon || '🔑'}</div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{key.label || provider?.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{key.key_masked}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${key.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {key.last_used_at && <span className="text-xs text-slate-400 hidden md:block">Used {new Date(key.last_used_at).toLocaleDateString()}</span>}
                        {deleteConfirmId === key.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600 font-bold">Delete?</span>
                            <button onClick={() => handleDeleteKey(key.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">Yes</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold">No</button>
                          </div>
                        ) : (
                          <button onClick={() => handleDeleteKey(key.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
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
=======
        {markups.length === 0 && (
          <div className="md:col-span-2 py-12 text-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-200">
              <TrendingDown size={32} />
            </div>
            <h4 className="font-bold text-slate-700 mb-1">No markup rules defined</h4>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6">Create rules to automatically apply margins to quotes and bookings.</p>
            <button 
              onClick={() => {}} // Same logic as above
              className="text-[#14B8A6] font-black text-sm hover:underline"
            >
              Add Your First Rule →
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderNotifications = () => (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
          <Bell size={24} />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-[#0F172A]">Notifications</h3>
          <p className="text-sm text-slate-400 font-medium">Control when and how you get alerted.</p>
        </div>
      </div>

      <div className="space-y-6">
        {[
          { id: 'new_lead', label: 'New Lead Inbound', desc: 'Get notified when a potential customer messages or registers.', default: true },
          { id: 'payment_success', label: 'Payment Success', desc: 'Receive alerts for every successful client payment.', default: true },
          { id: 'quote_expiry', label: 'Quote Expiry Reminders', desc: 'Alert staff when a quote is about to expire.', default: false },
          { id: 'daily_report', label: 'Daily Summary Email', desc: 'A morning digest of agency performance and tasks.', default: true },
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 transition-all">
            <div className="flex-1 pr-8">
              <div className="font-extrabold text-slate-900 mb-0.5">{item.label}</div>
              <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-200 p-1 rounded-xl">
                <button className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${item.default ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Email</button>
                <button className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!item.default ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Slack</button>
              </div>
              <div className="relative inline-flex items-center cursor-pointer ml-4">
                <input type="checkbox" className="sr-only peer" defaultChecked={item.default} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14B8A6]"></div>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button className="bg-[#00236f] text-white px-8 py-3 rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/10">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )

  const renderAuditLog = () => (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
            <History size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#0F172A]">Security Audit Log</h3>
            <p className="text-sm text-slate-400 font-medium">Tracking system changes and authentication events.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-100">Export CSV</button>
          <button className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-100">Filter</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.length > 0 ? auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-xs font-bold text-slate-500 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200" />
                    <span className="text-xs font-black text-slate-700">{log.user_email || 'System'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{log.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-400">{log.ip_address}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                  No audit logs found for the current period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderSubscription = () => (
    <div className="space-y-6">
      <div className="bg-[#00236f] rounded-[40px] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="bg-teal-400 text-[#00236f] text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full w-fit mb-4">Current Status: Active</div>
            <h2 className="text-4xl font-black mb-4">NAMA {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan</h2>
            <p className="text-blue-100 font-medium text-lg leading-relaxed">
              Your agency is currently on the Growth plan. You have access to unlimited users and BYOK support.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-8 border border-white/10 text-center md:min-w-[240px]">
            <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">Next Billing Date</div>
            <div className="text-2xl font-black mb-4">May 15, 2026</div>
            <button className="w-full bg-white text-[#00236f] py-3 rounded-2xl text-sm font-black hover:bg-blue-50 transition-all active:scale-95 shadow-xl shadow-black/10">
              Manage Billing
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan
          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-[32px] p-8 border-2 transition-all flex flex-col ${
                isCurrent ? 'border-[#14B8A6] shadow-xl' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-10 bg-[#14B8A6] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                  Recommended
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-extrabold text-[#0F172A] mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#0F172A]">₹{plan.price.toLocaleString()}</span>
                  <span className="text-slate-400 font-bold text-sm">/{plan.period}</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg w-fit border ${BYOK_BADGE[plan.byok].color}`}>
                  {BYOK_BADGE[plan.byok].label}
                </div>
                <div className="space-y-3 pt-2">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle size={12} className="text-[#14B8A6]" />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={isCurrent}
                className={`w-full py-4 rounded-2xl text-sm font-black transition-all ${
                  isCurrent 
                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                    : 'bg-[#0F172A] text-white hover:bg-slate-800 active:scale-95 shadow-lg shadow-slate-200'
                }`}
              >
                {isCurrent ? 'Current Plan' : 'Switch to ' + plan.name}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderTeam = () => (
    <div className="space-y-8">
      {/* Team Members List */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">Active Team Members</h3>
              <p className="text-sm text-slate-400 font-medium">Manage your agency staff and their roles.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-[#0F172A] text-white px-5 py-3 rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
          >
            <Plus size={20} /> Invite Member
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {team.map((member) => (
            <div key={member.id} className="group flex items-center justify-between p-6 rounded-[28px] bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-300 font-black text-xl">
                  {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">{member.full_name || 'Unnamed User'}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{member.role.replace('R_', '').replace('_', ' ')}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold text-slate-500">{member.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={async () => {
                    if (confirm(`Deactivate ${member.email}?`)) {
                      await api.delete(`/api/v1/settings/team/${member.id}`)
                      setTeam(team.filter(x => x.id !== member.id))
                    }
                  }}
                  className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites List */}
      {invites.filter(i => !i.accepted_at).length > 0 && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">Pending Invitations</h3>
              <p className="text-sm text-slate-400 font-medium">Users who haven't accepted their invite yet.</p>
            </div>
          </div>

          <div className="space-y-4">
            {invites.filter(i => !i.accepted_at).map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-6 rounded-[28px] bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-300">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900">{invite.email}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{invite.role}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[10px] font-bold text-amber-500">Expires {new Date(invite.expires_at).toLocaleDateString()}</span>
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?invite=${invite.token}`)
                      alert('Invite link copied to clipboard!')
                    }}
                    className="px-4 py-2 bg-white text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Copy Link
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm('Cancel this invitation?')) {
                        await api.delete(`/api/v1/settings/invites/${invite.id}`)
                        setInvites(invites.filter(x => x.id !== invite.id))
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Invite Team Member</h2>
                <p className="text-slate-500 font-medium mt-1">Send a registration link to your staff.</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all">✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@agency.com"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-[#14B8A6] outline-none transition-all text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-[#14B8A6] outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                >
                  <option value="R2_ORG_ADMIN">Admin (Full Access)</option>
                  <option value="R3_SALES_MANAGER">Sales Manager</option>
                  <option value="R4_OPS_EXECUTIVE">Operations Executive</option>
                  <option value="R5_FINANCE_ADMIN">Finance Admin</option>
                </select>
              </div>

              <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                <div className="flex gap-3">
                  <Info size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                    The invited user will receive a link to create their own password. They will be automatically linked to your organization with the selected role.
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  setInviteLoading(true)
                  try {
                    const res = await api.post<Invite>('/api/v1/settings/invites', { email: inviteEmail, role: inviteRole })
                    setInvites([res, ...invites])
                    setShowInviteModal(false)
                    setInviteEmail('')
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to send invite')
                  } finally {
                    setInviteLoading(false)
                  }
                }}
                disabled={inviteLoading || !inviteEmail.trim()}
                className="w-full bg-[#0F172A] text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {inviteLoading ? <Loader size={20} className="animate-spin" /> : 'Send Invitation Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderApiKeys = () => (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="max-w-xl">
            <h2 className="text-3xl font-black mb-4 flex items-center gap-3">
              <Zap className="text-teal-400" /> Bring Your Own Key (BYOK)
            </h2>
            <p className="text-slate-400 font-medium text-lg leading-relaxed">
              Cut your AI operational costs by up to 80%. Connect your own provider keys and pay wholesale rates directly.
            </p>
          </div>
          <button
            onClick={() => setShowAddKey(true)}
            className="bg-[#14B8A6] text-white px-8 py-4 rounded-2xl text-base font-black hover:bg-teal-600 transition-all active:scale-95 shadow-xl shadow-teal-500/20 flex items-center gap-3"
          >
            <Plus size={24} /> Add New API Key
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
          <h3 className="font-extrabold text-[#0F172A] text-xl mb-6">Active Provider Integrations</h3>
          
          {keysLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader size={32} className="animate-spin text-teal-500" />
              <span className="text-sm font-bold text-slate-400">Securely fetching keys...</span>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Key size={32} className="text-slate-200" />
              </div>
              <h4 className="font-extrabold text-slate-700 text-lg mb-2">No keys configured</h4>
              <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto font-medium">Add your OpenAI or Anthropic key to activate cost-saving routing.</p>
              <button onClick={() => setShowAddKey(true)} className="text-[#14B8A6] font-black hover:underline">Connect Your First Provider →</button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => {
                const provider = PROVIDERS.find((p) => p.id === key.provider)
                return (
                  <div key={key.id} className="group flex items-center justify-between p-6 rounded-[28px] bg-white border border-slate-100 hover:border-teal-200 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-teal-50 transition-colors">
                        {provider?.icon || '🔑'}
                      </div>
                      <div>
                        <div className="font-extrabold text-[#0F172A] text-lg">{key.label || provider?.name}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <code className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-lg">{key.key_masked}</code>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${key.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            {key.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {deleteConfirmId === key.id ? (
                        <div className="flex items-center gap-2 bg-red-50 p-2 rounded-xl border border-red-100">
                          <span className="text-xs font-black text-red-600 px-2">Delete?</span>
                          <button onClick={() => handleDeleteKey(key.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-black hover:bg-red-700">Confirm</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 bg-white text-slate-400 rounded-lg text-xs font-black border border-slate-200 hover:bg-slate-50">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => handleDeleteKey(key.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#00236f] rounded-[32px] p-8 text-white">
            <h4 className="font-extrabold text-lg mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-teal-400" /> Security Note
            </h4>
            <p className="text-sm text-blue-100 leading-relaxed font-medium">
              Your keys are encrypted using AES-256-GCM before storage. They are only decrypted in volatile memory during API calls and never logged.
            </p>
          </div>
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
            <h4 className="font-extrabold text-[#0F172A] mb-6">Cost Benchmarks</h4>
            <div className="space-y-6">
              {[
                { name: 'GPT-4o', inp: '$5', out: '$15', color: 'bg-emerald-500' },
                { name: 'Claude Haiku', inp: '$0.25', out: '$1.25', color: 'bg-teal-400' },
                { name: 'Gemini 1.5', inp: '$1.25', out: '$5', color: 'bg-blue-400' },
              ].map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-slate-700">{p.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">per 1M tokens</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div className={`${p.color} h-full`} style={{ width: p.name === 'GPT-4o' ? '80%' : p.name === 'Claude Haiku' ? '15%' : '40%' }} />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                    <span>In: {p.inp}</span>
                    <span>Out: {p.out}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-[#0F172A]">Settings</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Platform configuration and agency management.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#14B8A6]">
            <Globe size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Instance</div>
            <div className="text-sm font-bold text-slate-700">Mumbai-1 (AWS)</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-[20px] p-5 text-red-700 shadow-lg shadow-red-100 animate-in fade-in slide-in-from-top-4">
          <AlertCircle size={24} className="shrink-0" />
          <span className="font-bold flex-1">{error}</span>
          <button onClick={() => setError(null)} className="w-10 h-10 flex items-center justify-center hover:bg-red-100 rounded-full transition-all text-xl">✕</button>
        </div>
      )}

<<<<<<< HEAD
      {/* ── TEAM ── */}
      {tab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-lg">Team Members</h3>
                <p className="text-xs text-slate-400 mt-0.5">{teamMembers.filter(m => m.status === 'active').length} active · {teamMembers.filter(m => m.status === 'invited').length} pending invite</p>
              </div>
              <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-[#00236f] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
                <UserPlus size={16} /> Invite Member
              </button>
            </div>

            <div className="space-y-2">
              {teamMembers.map((member) => {
                const role = roleForId(member.role)
                return (
                  <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center font-black text-white text-sm flex-shrink-0">
                      {member.name ? member.name[0].toUpperCase() : member.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{member.name || <span className="text-slate-400 italic">Pending</span>}</div>
                      <div className="text-xs text-slate-400 truncate">{member.email}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${role?.color || 'bg-slate-100 text-slate-500'}`}>
                        {role?.label || member.role}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        member.status === 'active' ? 'bg-emerald-50 text-emerald-700'
                          : member.status === 'invited' ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {member.status === 'active' ? '● Active' : member.status === 'invited' ? '◌ Invited' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Invite modal */}
          {showInvite && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[28px] p-8 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-extrabold text-[#0F172A]">Invite Team Member</h2>
                  <button onClick={() => setShowInvite(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-4">
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
                      {ROLES.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setInviteRole(r.id)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${inviteRole === r.id ? 'border-[#14B8A6] bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
                          </div>
                          <div className="text-xs text-slate-500">{r.description}</div>
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
      )}

      {/* ── ROLES ── */}
      {tab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-5 flex gap-3">
            <Lock size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 text-sm mb-1">Role-based access control (RBAC)</div>
              <p className="text-xs text-amber-700 leading-relaxed">
                NAMA uses a 4-tier role hierarchy. Custom roles are available on Enterprise plans.
                Role changes take effect immediately — no re-login required.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { id: 'R0_NAMA_OWNER', label: 'NAMA Owner (R0)', color: 'text-red-600', bg: 'bg-red-50 border-red-200',
                perms: ['Full platform access', 'Cross-tenant visibility', 'Investor dashboard', 'System configuration', 'Cannot be modified'] },
              { id: 'R1_SUPER_ADMIN', label: 'Super Admin (R1)', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200',
                perms: ['All tenant permissions', 'Billing management', 'Team management', 'Settings access', 'Invite/remove members'] },
              { id: 'R2_MANAGER', label: 'Manager (R2)', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200',
                perms: ['All leads, quotes, bookings', 'Reports & analytics', 'Vendor management', 'Invite agents', 'Cannot change billing'] },
              { id: 'R3_AGENT', label: 'Agent (R3)', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200',
                perms: ['Assigned leads & bookings', 'Create quotes & itineraries', 'View own reports only', 'Send communications', 'No access to settings'] },
            ].map((role) => (
              <div key={role.id} className={`bg-white rounded-[20px] border-2 ${role.bg} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Lock size={18} className={role.color} />
                    <h3 className={`font-extrabold ${role.color}`}>{role.label}</h3>
                  </div>
                  <span className="text-xs text-slate-400">{teamMembers.filter(m => m.role === role.id).length} members</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {role.perms.map((p) => (
                    <div key={p} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle size={12} className={role.color} />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MARKUPS ── */}
      {tab === 'markups' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-lg">Markup Rules</h3>
                <p className="text-xs text-slate-400 mt-0.5">Applied automatically when generating quotations. Can be overridden per quote.</p>
              </div>
              <button onClick={saveMarkups} disabled={markupSaving} className="flex items-center gap-2 bg-[#14B8A6] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-all disabled:opacity-70">
                {markupSaving ? <><Loader size={14} className="animate-spin" /> Saving</> : <><Save size={14} /> Save Rules</>}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Default Markup', hint: 'Applied when no specific rule matches', value: markupDefault, setter: setMarkupDefault },
                { label: 'International Packages', hint: 'Flights + hotels outside India', value: markupIntl, setter: setMarkupIntl },
                { label: 'Domestic Packages', hint: 'Destinations within India', value: markupDomestic, setter: setMarkupDomestic },
                { label: 'Honeymoon / Romance', hint: 'Tagged as honeymoon packages', value: markupHoneymoon, setter: setMarkupHoneymoon },
              ].map(({ label, hint, value, setter }) => (
                <div key={label} className="border border-slate-100 rounded-xl p-5">
                  <label className="block text-sm font-bold text-slate-700 mb-1">{label}</label>
                  <p className="text-xs text-slate-400 mb-3">{hint}</p>
                  <div className="relative">
                    <input
                      type="number" min="0" max="100" value={value}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-lg font-black text-[#0F172A]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-xl">
              <p className="text-xs font-bold text-teal-800 mb-1">How markups work</p>
              <p className="text-xs text-teal-700">
                When you create a quotation, NAMA automatically adds the applicable markup to the base vendor cost.
                The markup is shown transparently in the quote breakdown unless you enable "hide markup" in Quote Settings.
                GST is calculated on the post-markup price.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-[#0F172A] text-lg">Your Profile</h3>
              {profileEditing ? (
                <div className="flex gap-2">
                  <button onClick={() => setProfileEditing(false)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">
                    <X size={14} /> Cancel
                  </button>
                  <button onClick={saveProfile} disabled={profileSaving} className="flex items-center gap-2 bg-[#14B8A6] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-600 transition-all">
                    {profileSaving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} Save
                  </button>
                </div>
              ) : (
                <button onClick={() => setProfileEditing(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:border-slate-300 transition-all">
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
            </div>

            <div className="flex items-start gap-6 mb-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center font-black text-white text-2xl">
                  {profileName[0]}
                </div>
                {profileEditing && (
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-teal-500 rounded-full flex items-center justify-center text-teal-600">
                    <Upload size={12} />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-lg font-extrabold text-slate-900">{profileName}</div>
                <div className="text-sm text-slate-500">{profileEmail}</div>
                <span className="inline-block text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Super Admin</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                {profileEditing ? (
                  <input value={profileName} onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm" />
                ) : (
                  <div className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-700">{profileName}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <div className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-500">{profileEmail} <span className="text-[10px] text-slate-400">(cannot change)</span></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                {profileEditing ? (
                  <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm" />
                ) : (
                  <div className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-700">{profilePhone}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Timezone</label>
                <div className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-700 flex items-center gap-2">
                  <Globe size={14} className="text-slate-400" /> Asia/Kolkata (IST)
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h3 className="font-extrabold text-[#0F172A] text-lg mb-4">Security</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                <div>
                  <div className="text-sm font-bold text-slate-800">Password</div>
                  <div className="text-xs text-slate-400">Last changed 30 days ago</div>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-[#00236f] border border-[#00236f]/20 rounded-lg hover:bg-[#00236f]/5 transition-all">
                  <Lock size={13} /> Change
                </button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                <div>
                  <div className="text-sm font-bold text-slate-800">Two-Factor Authentication</div>
                  <div className="text-xs text-slate-400">Add an extra layer of security to your account</div>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded-full">Not enabled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BRANDING ── */}
      {tab === 'branding' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-lg">Agency Branding</h3>
                <p className="text-xs text-slate-400 mt-0.5">Applied to client portals, PDF documents, and email communications.</p>
              </div>
              <button onClick={saveBranding} disabled={brandSaving} className="flex items-center gap-2 bg-[#14B8A6] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-all disabled:opacity-70">
                {brandSaving ? <><Loader size={14} className="animate-spin" /> Saving</> : <><Save size={14} /> Save Branding</>}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Agency Name</label>
                <input value={brandName} onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tagline</label>
                <input value={brandTagline} onChange={(e) => setBrandTagline(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer p-1" />
                  <input value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Agency Logo</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-300 transition-colors cursor-pointer">
                  <Upload size={20} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Drop PNG/SVG here or click to upload</p>
                  <p className="text-[10px] text-slate-300 mt-1">Max 2MB · Recommended 200×60px</p>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preview — Client Portal Header</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="h-14 flex items-center px-6 gap-3" style={{ backgroundColor: brandColor }}>
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-white text-sm">N</div>
                  <div>
                    <div className="font-bold text-white text-sm leading-none">{brandName || 'Agency Name'}</div>
                    <div className="text-[10px] text-white/60">{brandTagline}</div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50">
                  <p className="text-xs text-slate-400">Your quotations, itineraries, and portals will use this header.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-lg">Notification Preferences</h3>
                <p className="text-xs text-slate-400 mt-0.5">Choose what you get notified about and how.</p>
              </div>
              <button onClick={saveNotifications} disabled={notifSaving} className="flex items-center gap-2 bg-[#14B8A6] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-all disabled:opacity-70">
                {notifSaving ? <><Loader size={14} className="animate-spin" /> Saving</> : <><Save size={14} /> Save</>}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Events</p>
                <div className="space-y-3">
                  {[
                    { label: 'New Lead Assigned', desc: 'When a lead is assigned or created', value: notifLeads, setter: setNotifLeads },
                    { label: 'Booking Confirmed', desc: 'When a booking status changes to confirmed', value: notifBookings, setter: setNotifBookings },
                    { label: 'Payment Received', desc: 'When a payment is received or reconciled', value: notifPayments, setter: setNotifPayments },
                    { label: 'Quote Accepted', desc: 'When a client accepts a quotation', value: notifQuotes, setter: setNotifQuotes },
                    { label: 'Weekly Report', desc: 'Summary every Monday at 9 AM IST', value: notifReports, setter: setNotifReports },
                  ].map(({ label, desc, value, setter }) => (
                    <div key={label} className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
                      </div>
                      <Toggle value={value} onChange={setter} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-2">Channels</p>
                <div className="space-y-3">
                  {[
                    { label: 'Email Notifications', desc: 'Sent to owner@nama.travel', value: notifEmail, setter: setNotifEmail, icon: Mail },
                    { label: 'WhatsApp Notifications', desc: 'Via your linked WhatsApp number', value: notifWhatsapp, setter: setNotifWhatsapp, icon: Phone },
                  ].map(({ label, desc, value, setter, icon: Icon }) => (
                    <div key={label} className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="text-slate-400" />
                        <div>
                          <div className="text-sm font-bold text-slate-800">{label}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
                        </div>
                      </div>
                      <Toggle value={value} onChange={setter} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG ── */}
      {tab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-lg">Audit Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">All actions performed by team members, last 30 days.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text" placeholder="Search..." value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none w-48"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Resource</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Details</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAudit.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 text-xs text-slate-600 font-medium">{entry.user_email}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          entry.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700'
                            : entry.action === 'DELETE' ? 'bg-red-50 text-red-600'
                            : entry.action === 'UPDATE' ? 'bg-blue-50 text-blue-700'
                            : entry.action === 'LOGIN' ? 'bg-slate-100 text-slate-600'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {entry.resource}{entry.resource_id ? ` · ${entry.resource_id}` : ''}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400 hidden md:table-cell">{entry.details || entry.ip || '—'}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 text-right">
                        {new Date(entry.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-300 text-right mt-4">Demo data · Live audit entries appear once backend is connected.</p>
          </div>
        </div>
      )}

      {/* Add Key Modal */}
=======
      <div className="flex flex-col xl:flex-row gap-10">
        {/* Sidebar Navigation */}
        <div className="xl:w-72 flex flex-col gap-1.5 shrink-0">
          {[
            { id: 'profile',      label: 'Agency Profile', icon: Building2 },
            { id: 'branding',     label: 'Branding',       icon: Palette },
            { id: 'team',         label: 'Team Members',   icon: Users },
            { id: 'roles',        label: 'Roles & RBAC',   icon: ShieldCheck, badge: 'P2-2' },
            { id: 'markups',      label: 'Markup Rules',   icon: TrendingDown },
            { id: 'notifications',label: 'Notifications',  icon: Bell },
            { id: 'audit-log',    label: 'Audit Log',      icon: History },
            { id: 'subscription', label: 'Subscription',   icon: CreditCard },
            { id: 'api-keys',     label: 'AI API Keys',    icon: Key },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`group w-full flex items-center justify-between px-5 py-4 rounded-[20px] text-sm font-black transition-all ${
                tab === t.id 
                  ? 'bg-[#00236f] text-white shadow-2xl shadow-blue-900/30 active:scale-95' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <t.icon size={20} className={tab === t.id ? 'text-teal-400' : 'group-hover:text-slate-900'} />
                {t.label}
              </div>
              {t.badge && (
                <span className={`text-[8px] px-1.5 py-0.5 rounded-md ${tab === t.id ? 'bg-white/10 text-white/50' : 'bg-amber-100 text-amber-600'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="bg-white rounded-[40px] border border-slate-100 p-24 text-center shadow-sm">
              <Loader size={48} className="animate-spin text-[#14B8A6] mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-400">Loading Configuration...</h3>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {tab === 'profile' && renderProfile()}
              {tab === 'branding' && renderBranding()}
              {tab === 'markups' && renderMarkups()}
              {tab === 'team' && renderTeam()}
              {tab === 'notifications' && renderNotifications()}
              {tab === 'audit-log' && renderAuditLog()}
              {tab === 'subscription' && renderSubscription()}
              {tab === 'api-keys' && renderApiKeys()}
              {tab === 'roles' && (
                <div className="bg-white rounded-[40px] border border-slate-100 p-20 text-center shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-10 opacity-5">
                    <Shield size={240} />
                  </div>
                  <div className="w-24 h-24 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-amber-200/50">
                    <ShieldCheck size={48} className="text-amber-500" />
                  </div>
                  <h3 className="text-3xl font-black text-[#0F172A] mb-4 tracking-tight">Access Control (P2-2)</h3>
                  <p className="text-slate-500 text-lg max-w-lg mx-auto font-medium leading-relaxed">
                    Granular permissions and invite-based team management are currently in the final stages of integration.
                  </p>
                  <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button className="px-8 py-4 bg-[#0F172A] text-white rounded-[20px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                      Request Early Access
                    </button>
                    <button className="px-8 py-4 bg-slate-100 text-slate-500 rounded-[20px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all">
                      Read Documentation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Key Modal (Portaled/Fixed) */}
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
      {showAddKey && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Connect AI Provider</h2>
                <p className="text-slate-500 font-medium mt-1">NAMA powers your agency using these keys.</p>
              </div>
              <button onClick={() => setShowAddKey(false)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all">✕</button>
            </div>
<<<<<<< HEAD
            <div className="space-y-4">
=======

            <div className="space-y-8">
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Select Provider</label>
                <div className="grid grid-cols-3 gap-4">
                  {PROVIDERS.map((p) => (
<<<<<<< HEAD
                    <button key={p.id} onClick={() => setAddProvider(p.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${addProvider === p.id ? 'border-[#14B8A6] bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="text-xl mb-1">{p.icon}</div>
                      <div className="text-xs font-bold text-slate-700">{p.name}</div>
=======
                    <button
                      key={p.id}
                      onClick={() => setAddProvider(p.id)}
                      className={`group p-6 rounded-[28px] border-2 text-center transition-all ${
                        addProvider === p.id 
                          ? 'border-[#14B8A6] bg-teal-50 shadow-inner' 
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">{p.icon}</div>
                      <div className={`text-xs font-black uppercase tracking-widest ${addProvider === p.id ? 'text-[#14B8A6]' : 'text-slate-500'}`}>{p.name}</div>
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
                    </button>
                  ))}
                </div>
              </div>
<<<<<<< HEAD
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Label (optional)</label>
                <input type="text" value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder="e.g. Production key"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">API Key</label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} value={addKeyValue} onChange={(e) => setAddKeyValue(e.target.value)}
                    placeholder={PROVIDERS.find(p => p.id === addProvider)?.hint || 'Your API key'}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all text-sm font-mono" />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
=======

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Internal Label</label>
                  <input
                    type="text"
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="e.g. Master Anthropic Key"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/5 outline-none transition-all text-sm font-bold"
                  />
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Provider API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={addKeyValue}
                      onChange={(e) => setAddKeyValue(e.target.value)}
                      placeholder={PROVIDERS.find(p => p.id === addProvider)?.hint || 'Paste your secret key here'}
                      className="w-full px-5 py-4 pr-14 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/5 outline-none transition-all text-sm font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-slate-400">
                    <Shield size={12} className="text-teal-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">AES-256 GCM Encrypted</span>
                  </div>
                </div>
              </div>
<<<<<<< HEAD
              <button onClick={handleAddKey} disabled={addLoading || !addKeyValue.trim()}
                className="w-full bg-[#0F172A] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50 mt-2">
                {addLoading ? <><Loader size={16} className="animate-spin" /> Saving...</> : <><Shield size={16} /> Save Encrypted Key</>}
=======

              <button
                onClick={handleAddKey}
                disabled={addLoading || !addKeyValue.trim()}
                className="w-full bg-[#0F172A] text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-2xl shadow-slate-200 active:scale-[0.98]"
              >
                {addLoading ? <Loader size={20} className="animate-spin" /> : 'Connect Encrypted Provider'}
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
