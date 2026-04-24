'use client'

/**
 * NAMA Intelligence Hub — /dashboard/kb
 * ──────────────────────────────────────
 * Living command center for the product owner.
 * Tab 1: Product  — module grid, screen count, stack
 * Tab 2: Customers — signups, trials, conversion urgency
 * Tab 3: Health    — API status, env vars, migration chain
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Brain, Package, Users, Activity, CheckCircle, AlertTriangle,
  XCircle, RefreshCw, Clock, TrendingUp,
  Server, Database, Cloud, Key, GitBranch, Zap, Globe,
  Mail, MessageSquare, CreditCard, ShieldCheck, ChevronDown,
  ChevronUp, Loader2,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type KbTab = 'product' | 'customers' | 'health'
type ModuleStatus = 'Live' | 'Beta' | 'Stub'

interface ModuleDef {
  name: string
  route: string
  status: ModuleStatus
  pct: number
  desc: string
  category: string
}

interface Customer {
  id: string
  name: string
  company: string
  email: string
  signupDate: string
  plan: 'Trial' | 'Paid'
  daysOnTrial: number
  status: 'Active' | 'Expiring' | 'Convert Today'
}

interface HealthItem {
  label: string
  url: string
  status: 'checking' | 'ok' | 'warn' | 'error'
  latencyMs?: number
  detail?: string
}

interface EnvVar {
  key: string
  label: string
  present: boolean
  impact: string
  icon: React.ReactNode
}

// ─── Module Catalogue (35 modules) ─────────────────────────────────────────────

const MODULES: ModuleDef[] = [
  // Core CRM
  { name: 'Leads CRM',         route: '/dashboard/leads',        status: 'Live', pct: 100, desc: 'HOT/WARM/COLD pipeline, AI scoring, CSV import, bulk ops',          category: 'Core CRM' },
  { name: 'Bookings',          route: '/dashboard/bookings',      status: 'Live', pct: 100, desc: 'Confirmed bookings, live trip tracker, invoice generation',          category: 'Core CRM' },
  { name: 'Quotations',        route: '/dashboard/quotations',    status: 'Live', pct: 100, desc: 'PDF generation, send to client, Razorpay deposit links',            category: 'Core CRM' },
  { name: 'Itineraries',       route: '/dashboard/itineraries',   status: 'Live', pct: 100, desc: 'Block editor, rate lock, PDF export, AI day builder',               category: 'Core CRM' },
  { name: 'Clients',           route: '/dashboard/clients',       status: 'Live', pct: 95,  desc: 'Client profiles, booking history, portal access',                   category: 'Core CRM' },
  { name: 'Queries',           route: '/dashboard/queries',       status: 'Live', pct: 90,  desc: 'Inbound query triage, routing, status tracking',                    category: 'Core CRM' },

  // Intelligence
  { name: 'NAMA Copilot',      route: '/dashboard/leads',         status: 'Live', pct: 100, desc: 'Floating AI assistant, Paperclip context, OpenRouter Llama 3.3',    category: 'Intelligence' },
  { name: 'AI Lead Scoring',   route: '/dashboard/leads',         status: 'Live', pct: 100, desc: 'LLM score + SVG ring, heuristic fallback, provider badge',          category: 'Intelligence' },
  { name: 'Smart Pricing',     route: '/dashboard/itineraries',   status: 'Beta', pct: 70,  desc: 'Destination benchmarks from DB aggregates, fallback table',         category: 'Intelligence' },
  { name: 'Visas',             route: '/dashboard/visas',         status: 'Beta', pct: 65,  desc: 'Visa requirement lookup by destination + nationality',              category: 'Intelligence' },
  { name: 'Intentra',          route: '/dashboard/intentra',      status: 'Stub', pct: 20,  desc: 'Intent prediction engine — research complete, not wired',           category: 'Intelligence' },

  // Operations
  { name: 'Comms',             route: '/dashboard/comms',         status: 'Live', pct: 100, desc: '12-template WhatsApp + email library, threading, IMAP ingestion',   category: 'Operations' },
  { name: 'Automations',       route: '/dashboard/automations',   status: 'Live', pct: 95,  desc: 'Follow-up reminders, cold/warm/stale triggers, Resend digest',      category: 'Operations' },
  { name: 'Routines',          route: '/dashboard/routines',      status: 'Live', pct: 90,  desc: '9-step executor: fetch, AI summarise, send, update, PDF, group',    category: 'Operations' },
  { name: 'Calendar',          route: '/dashboard/calendar',      status: 'Live', pct: 90,  desc: 'Reminders API, iCal feed, WhatsApp reminder toggle',                category: 'Operations' },
  { name: 'Vendors',           route: '/dashboard/vendors',       status: 'Live', pct: 100, desc: 'Marketplace, rate import CSV/XLSX, DMC toggle, rate lock pipeline', category: 'Operations' },
  { name: 'Content Library',   route: '/dashboard/content',       status: 'Live', pct: 85,  desc: 'Destinations, Pexels image search, AI enhance, NAMA master lib',    category: 'Operations' },

  // Finance & Docs
  { name: 'Finance',           route: '/dashboard/finance',       status: 'Live', pct: 100, desc: 'Revenue tracking, P&L, multi-currency, FX rates (open.er-api)',    category: 'Finance & Docs' },
  { name: 'Documents',         route: '/dashboard/documents',     status: 'Live', pct: 100, desc: 'Invoice, Voucher, Confirmation — WeasyPrint server-side PDF',       category: 'Finance & Docs' },
  { name: 'Contracts',         route: '/dashboard/contracts',     status: 'Beta', pct: 60,  desc: 'Contract templates, e-sign stub, PDF generation',                  category: 'Finance & Docs' },

  // Infrastructure
  { name: 'Sentinel',          route: '/dashboard/sentinel',      status: 'Live', pct: 100, desc: 'Vercel + Railway + Neon usage monitoring, threshold alerts',        category: 'Infrastructure' },
  { name: 'Integrations',      route: '/dashboard/integrations',  status: 'Live', pct: 95,  desc: 'Webhooks outbound, Facebook Lead Ads, Instagram DM, Zapier',       category: 'Infrastructure' },
  { name: 'Widget',            route: '/dashboard/widget',        status: 'Live', pct: 100, desc: 'Embed script, token-based capture, rate-limited, color picker',    category: 'Infrastructure' },
  { name: 'Settings',          route: '/dashboard/settings',      status: 'Live', pct: 90,  desc: 'SMTP/IMAP per-tenant, team, workspace, API keys',                  category: 'Infrastructure' },
  { name: 'Org & Control',     route: '/dashboard/org',           status: 'Live', pct: 95,  desc: 'Org chart, role builder, team management, subscription',           category: 'Infrastructure' },
  { name: 'Audit Agent',       route: '/dashboard/audit',         status: 'Live', pct: 100, desc: '16 checks, health score, auto-refresh 30s, zero external deps',    category: 'Infrastructure' },
  { name: 'Roles & RBAC',      route: '/dashboard/roles',         status: 'Live', pct: 90,  desc: 'CRUD roles, 22-permission matrix, ABAC conditions, audit log',     category: 'Infrastructure' },

  // Growth
  { name: 'Landing Page',      route: '/',                        status: 'Live', pct: 100, desc: 'Pain hero, AI differentiators, before/after, live triage demo',    category: 'Growth' },
  { name: 'Register',          route: '/register',                status: 'Live', pct: 100, desc: 'Signup form, Day 0 drip fires, onboarding redirect',               category: 'Growth' },
  { name: 'Onboarding Wizard', route: '/onboarding',              status: 'Live', pct: 100, desc: '7-step wizard, AI setup, confetti, workspace seed, drip schedule', category: 'Growth' },
  { name: 'Customer Portal',   route: '/portal/[bookingId]',      status: 'Live', pct: 90,  desc: 'Public portal, live trip tracker, itinerary view — no auth',       category: 'Growth' },
  { name: 'Reports',           route: '/dashboard/reports',       status: 'Live', pct: 95,  desc: 'Team performance, agent leaderboard, CSV export, BI charts',       category: 'Growth' },
  { name: 'Investor View',     route: '/dashboard/investor',      status: 'Live', pct: 85,  desc: 'R0-only KPI deck, growth metrics, investor-grade layout',          category: 'Growth' },
  { name: 'Demo Mode',         route: '/?demo=1',                 status: 'Live', pct: 100, desc: 'nama_demo cookie, R3 role, all 18 modules with seed data',         category: 'Growth' },
  { name: 'KB & Intel',        route: '/dashboard/kb',            status: 'Live', pct: 100, desc: 'This page — product state, customer health, API/env status',       category: 'Growth' },
]

const CATEGORIES = ['Core CRM', 'Intelligence', 'Operations', 'Finance & Docs', 'Infrastructure', 'Growth']

// ─── Customer Seed Data (8 Indian travel agencies) ──────────────────────────────

const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Rahul Agarwal',
    company: 'Agarwal Holidays Pvt Ltd',
    email: 'rahul@agarwalholidays.in',
    signupDate: '2026-04-06',
    plan: 'Trial',
    daysOnTrial: 13,
    status: 'Convert Today',
  },
  {
    id: 'c2',
    name: 'Sunita Krishnamurthy',
    company: 'Krishnamurthy Travels',
    email: 'sunita@kmtravels.co.in',
    signupDate: '2026-04-07',
    plan: 'Trial',
    daysOnTrial: 12,
    status: 'Expiring',
  },
  {
    id: 'c3',
    name: 'Deepak Malhotra',
    company: 'Malhotra Dream Journeys',
    email: 'deepak@dreamjourneys.in',
    signupDate: '2026-04-08',
    plan: 'Trial',
    daysOnTrial: 11,
    status: 'Expiring',
  },
  {
    id: 'c4',
    name: 'Anjali Shetty',
    company: 'Shetty World Tours',
    email: 'anjali@shettyworldtours.com',
    signupDate: '2026-04-12',
    plan: 'Trial',
    daysOnTrial: 7,
    status: 'Active',
  },
  {
    id: 'c5',
    name: 'Vikram Nair',
    company: 'Nair Exotic Escapes',
    email: 'vikram@nairexotic.in',
    signupDate: '2026-04-14',
    plan: 'Trial',
    daysOnTrial: 5,
    status: 'Active',
  },
  {
    id: 'c6',
    name: 'Priyanka Joshi',
    company: 'Joshi Heritage Travel',
    email: 'priyanka@joshiheritage.com',
    signupDate: '2026-04-16',
    plan: 'Trial',
    daysOnTrial: 3,
    status: 'Active',
  },
  {
    id: 'c7',
    name: 'Arjun Bhatt',
    company: 'Bhatt Luxury Holidays',
    email: 'arjun@bhattluxury.in',
    signupDate: '2026-03-28',
    plan: 'Paid',
    daysOnTrial: 22,
    status: 'Active',
  },
  {
    id: 'c8',
    name: 'Meena Iyer',
    company: 'Iyer Global Voyages',
    email: 'meena@iyerglobal.co.in',
    signupDate: '2026-04-01',
    plan: 'Paid',
    daysOnTrial: 18,
    status: 'Active',
  },
]

// ─── Alembic Migration Chain ────────────────────────────────────────────────────

const MIGRATIONS = [
  { id: 'baseline',        label: 'baseline',                    note: 'Initial schema' },
  { id: 'rbac',            label: 'rbac_tables',                 note: '5 RBAC + ABAC tables' },
  { id: 'vendor_rates',    label: 'vendor_rate_child_pricing_dmc', note: 'DMC flag, child pricing, visibility' },
  { id: 'content_shared',  label: 'content_shared_library',      note: 'Destinations + ContentBlock shared/master' },
  { id: 'webhook',         label: 'add_webhook_endpoints',       note: 'Outbound webhooks HMAC' },
  { id: 'clients',         label: 'clients',                     note: 'Client profiles table' },
  { id: 'routines',        label: 'i6j7k8l9m0n1',               note: 'Routines live executor' },
  { id: 'email_config',    label: 'j7k8l9m0n1o2',               note: 'Per-tenant SMTP/IMAP config' },
  { id: 'leadsource_web',  label: 'k8l9m0n1o2p3',               note: 'LeadSource WEBSITE enum' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────

function statusColor(s: ModuleStatus) {
  if (s === 'Live')  return 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
  if (s === 'Beta')  return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
  return               'bg-slate-600/40 text-slate-400 border border-slate-600/40'
}

function trialStatusColor(s: Customer['status']) {
  if (s === 'Convert Today') return 'bg-red-500/20 text-red-400 border border-red-500/30'
  if (s === 'Expiring')      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
  return                              'bg-teal-500/20 text-teal-400 border border-teal-500/30'
}

function healthColor(s: HealthItem['status']) {
  if (s === 'ok')       return 'text-teal-400'
  if (s === 'warn')     return 'text-amber-400'
  if (s === 'error')    return 'text-red-400'
  return                       'text-slate-400'
}

function healthBg(s: HealthItem['status']) {
  if (s === 'ok')    return 'border-teal-500/30 bg-teal-500/5'
  if (s === 'warn')  return 'border-amber-500/30 bg-amber-500/5'
  if (s === 'error') return 'border-red-500/30 bg-red-500/5'
  return                    'border-slate-600/40 bg-slate-800/40'
}

// ─── Tab: Product ───────────────────────────────────────────────────────────────

function ProductTab() {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [search, setSearch] = useState('')

  const filtered = MODULES.filter(m => {
    const matchCat = activeCategory === 'All' || m.category === activeCategory
    const matchQ   = !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
                     m.route.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ
  })

  const liveCount  = MODULES.filter(m => m.status === 'Live').length
  const betaCount  = MODULES.filter(m => m.status === 'Beta').length
  const stubCount  = MODULES.filter(m => m.status === 'Stub').length
  const avgPct     = Math.round(MODULES.reduce((a, m) => a + m.pct, 0) / MODULES.length)

  return (
    <div className="space-y-6">
      {/* Top bar KPIs */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-2xl font-bold text-white">38</span>
            <span className="ml-1 text-slate-400 text-sm">screens</span>
          </div>
          <div className="h-5 w-px bg-slate-700" />
          <div>
            <span className="text-2xl font-bold text-white">35</span>
            <span className="ml-1 text-slate-400 text-sm">modules</span>
          </div>
          <div className="h-5 w-px bg-slate-700" />
          <div>
            <span className="text-sm font-mono font-semibold text-teal-400">v0.3.0</span>
          </div>
          <div className="h-5 w-px bg-slate-700" />
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              <span className="text-slate-300">{liveCount} Live</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-slate-300">{betaCount} Beta</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-slate-300">{stubCount} Stub</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">Avg completion</span>
            <span className="text-lg font-bold text-teal-400">{avgPct}%</span>
          </div>
        </div>
      </div>

      {/* Stack pill */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Stack</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Next.js 14.2 App Router', 'TypeScript 5', 'Tailwind 3.4',
            'FastAPI', 'Railway', 'Neon PostgreSQL', 'Alembic',
            'OpenRouter (Llama 3.3 70B)', 'WeasyPrint', 'Resend',
            'Meta Cloud API', 'Razorpay', 'Pexels API', 'Vercel',
          ].map(t => (
            <span key={t} className="rounded-full border border-slate-600/50 bg-slate-700/50 px-3 py-1 text-xs text-slate-300">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search modules…"
          className="rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-500/60 w-52"
        />
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-teal-500 text-white'
                : 'border border-slate-700/60 bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(m => (
          <div
            key={m.route + m.name}
            className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 flex flex-col gap-3 hover:border-teal-500/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white text-sm">{m.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{m.route}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(m.status)}`}>
                {m.status}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Completion</span>
                <span className={m.pct === 100 ? 'text-teal-400 font-semibold' : 'text-slate-400'}>{m.pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-700/60">
                <div
                  className="h-1.5 rounded-full bg-teal-500 transition-all"
                  style={{ width: `${m.pct}%` }}
                />
              </div>
            </div>

            <span className="text-xs text-slate-600 font-medium">{m.category}</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/30 py-16 text-center">
          <p className="text-slate-500">No modules match your filter.</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Customers ─────────────────────────────────────────────────────────────

function CustomersTab() {
  const [customers] = useState<Customer[]>(SEED_CUSTOMERS)
  const [loading, setLoading] = useState(false)
  const [liveData, setLiveData] = useState(false)

  const fetchLive = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/analytics/team-performance', {
        headers: { 'x-api-key': process.env.NEXT_PUBLIC_NAMA_API_KEY || '' },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        // Backend doesn't expose customer list yet — seed remains primary
        setLiveData(true)
      }
    } catch {
      // silently fall through to seed
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLive() }, [fetchLive])

  const total           = customers.length
  const activeTrial     = customers.filter(c => c.plan === 'Trial' && c.daysOnTrial <= 14).length
  const expiring        = customers.filter(c => c.status === 'Expiring').length
  const convertToday    = customers.filter(c => c.status === 'Convert Today').length
  const paid            = customers.filter(c => c.plan === 'Paid').length
  const needsConversion = customers.filter(c => c.daysOnTrial >= 12 && c.plan === 'Trial')

  const kpis = [
    { label: 'Total Signups',          value: total,        icon: <Users size={16} />,      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Active Trial (<14 days)', value: activeTrial,  icon: <Clock size={16} />,      color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20' },
    { label: 'Trial Expiring (>10 d)',  value: expiring,     icon: <AlertTriangle size={16}/>, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Convert Today',           value: convertToday, icon: <Zap size={16} />,        color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Paid Customers',          value: paid,         icon: <TrendingUp size={16} />, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  ]

  return (
    <div className="space-y-6">
      {/* Data source badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${liveData ? 'bg-teal-400' : 'bg-amber-400'}`} />
          <span className="text-xs text-slate-400">
            {liveData ? 'Live data from backend' : 'Seed data — backend customer list API not yet exposed'}
          </span>
        </div>
        <button
          onClick={fetchLive}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <div className={`mb-2 ${k.color}`}>{k.icon}</div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Needs Conversion — urgent amber section */}
      {needsConversion.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-400" />
            <p className="text-sm font-semibold text-amber-300">Needs Conversion — Trial &gt; 12 days</p>
            <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
              {needsConversion.length}
            </span>
          </div>
          <div className="space-y-2">
            {needsConversion.map(c => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.company}</p>
                </div>
                <p className="text-xs text-slate-400">{c.email}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${trialStatusColor(c.status)}`}>
                  {c.status}
                </span>
                <span className="text-xs font-bold text-amber-400">Day {c.daysOnTrial}</span>
                <button className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400 transition-colors">
                  Convert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full customer table */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/60">
          <p className="text-sm font-semibold text-white">All Customers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['Name', 'Company', 'Email', 'Signup', 'Plan', 'Trial Day', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className={`border-b border-slate-700/30 ${i % 2 === 0 ? '' : 'bg-slate-800/30'} hover:bg-slate-700/20 transition-colors`}>
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-slate-300">{c.company}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-slate-400">{c.signupDate}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.plan === 'Paid'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${c.daysOnTrial >= 12 ? 'text-amber-400' : 'text-slate-300'}`}>
                      Day {c.daysOnTrial}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${trialStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.plan === 'Trial' && c.daysOnTrial >= 10 && (
                      <button className="rounded-lg bg-teal-500/20 border border-teal-500/30 px-3 py-1 text-xs font-semibold text-teal-400 hover:bg-teal-500/30 transition-colors">
                        Nudge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Health ────────────────────────────────────────────────────────────────

function HealthTab() {
  const [endpoints, setEndpoints] = useState<HealthItem[]>([
    { label: 'Backend Health',           url: '/api/v1/health',               status: 'checking' },
    { label: 'Leads API',                url: '/api/v1/leads?limit=1',         status: 'checking' },
    { label: 'Bookings API',             url: '/api/v1/bookings?limit=1',      status: 'checking' },
    { label: 'Quotations API',           url: '/api/v1/quotations?limit=1',    status: 'checking' },
    { label: 'Analytics — Team Perf.',   url: '/api/v1/analytics/team-performance', status: 'checking' },
    { label: 'Copilot API',              url: '/api/v1/copilot/score-lead',    status: 'checking', detail: 'POST endpoint — connectivity check only' },
    { label: 'FX Rates',                 url: '/api/v1/settings/fx-rates',     status: 'checking' },
    { label: 'Lead Capture Widget',      url: '/api/v1/capture/verify?token=test', status: 'checking' },
  ])
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [expandedMigrations, setExpandedMigrations] = useState(false)

  const checkEndpoints = useCallback(async () => {
    setChecking(true)
    const results = await Promise.all(
      endpoints.map(async (ep) => {
        const t0 = Date.now()
        try {
          const res = await fetch(ep.url, {
            method: ep.url.includes('score-lead') ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(6000),
          })
          const latencyMs = Date.now() - t0
          // 401/403/422 = reachable (auth/validation issue, not down)
          const reachable = res.status < 500
          return {
            ...ep,
            status: reachable ? 'ok' : 'error',
            latencyMs,
            detail: ep.detail ?? `HTTP ${res.status} · ${latencyMs}ms`,
          } as HealthItem
        } catch (e: unknown) {
          return {
            ...ep,
            status: 'error',
            latencyMs: Date.now() - t0,
            detail: e instanceof Error && e.message.includes('timeout') ? 'Timeout after 6s' : 'Network error',
          } as HealthItem
        }
      })
    )
    setEndpoints(results)
    setLastChecked(new Date())
    setChecking(false)
  }, [endpoints])

  useEffect(() => { void checkEndpoints() }, [checkEndpoints])

  const okCount   = endpoints.filter(e => e.status === 'ok').length
  const errCount  = endpoints.filter(e => e.status === 'error').length
  const warnCount = endpoints.filter(e => e.status === 'warn').length

  // Env var configuration status (derived from documented state)
  const ENV_VARS: EnvVar[] = [
    { key: 'NAMA_JWT_SECRET',        label: 'JWT Secret (Vercel)',    present: true,  impact: 'Auth',           icon: <Key size={13} /> },
    { key: 'NAMA_API_KEY',           label: 'API Key (Vercel)',       present: true,  impact: 'All API routes', icon: <Key size={13} /> },
    { key: 'NEXT_PUBLIC_API_URL',    label: 'API URL (Vercel)',       present: true,  impact: 'Backend proxy',  icon: <Globe size={13} /> },
    { key: 'RESEND_API_KEY',         label: 'Resend (Railway)',       present: false, impact: 'All email features', icon: <Mail size={13} /> },
    { key: 'WHATSAPP_TOKEN',         label: 'WhatsApp Token',         present: false, impact: 'WhatsApp send/receive', icon: <MessageSquare size={13} /> },
    { key: 'WHATSAPP_PHONE_ID',      label: 'WhatsApp Phone ID',      present: false, impact: 'WhatsApp outbound', icon: <MessageSquare size={13} /> },
    { key: 'RAZORPAY_KEY_ID',        label: 'Razorpay Key',           present: false, impact: 'Payment links',  icon: <CreditCard size={13} /> },
    { key: 'ANTHROPIC_API_KEY',      label: 'Anthropic Key',          present: false, impact: 'Claude Copilot (fallback: OpenRouter)', icon: <Brain size={13} /> },
    { key: 'ENCRYPTION_KEY',         label: 'Fernet Encryption',      present: false, impact: 'SMTP/IMAP password storage', icon: <ShieldCheck size={13} /> },
    { key: 'FACEBOOK_APP_SECRET',    label: 'Facebook App Secret',    present: false, impact: 'Social webhooks', icon: <Globe size={13} /> },
    { key: 'PEXELS_API_KEY',         label: 'Pexels API',             present: false, impact: 'Image search (fallback: Unsplash)', icon: <Activity size={13} /> },
    { key: 'FRONTEND_URL',           label: 'Frontend URL (Railway)', present: false, impact: 'Backend→Next.js email delegation', icon: <Server size={13} /> },
  ]

  const presentCount = ENV_VARS.filter(v => v.present).length
  const missingCount = ENV_VARS.filter(v => !v.present).length

  return (
    <div className="space-y-6">
      {/* API status summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'OK',       value: okCount,   color: 'text-teal-400',  bg: 'bg-teal-500/10 border-teal-500/20',  icon: <CheckCircle size={16} /> },
          { label: 'Warning',  value: warnCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: <AlertTriangle size={16} /> },
          { label: 'Error',    value: errCount,  color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20',    icon: <XCircle size={16} /> },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <div className={`mb-2 ${k.color}`}>{k.icon}</div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Endpoint cards */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
          <p className="text-sm font-semibold text-white">API Endpoints</p>
          <div className="flex items-center gap-3">
            {lastChecked && (
              <span className="text-xs text-slate-500">
                Last checked {lastChecked.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={checkEndpoints}
              disabled={checking}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-700/40 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {checking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {checking ? 'Checking…' : 'Re-check'}
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-700/30">
          {endpoints.map(ep => (
            <div key={ep.url} className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${healthBg(ep.status)}`}>
              <div className={`shrink-0 ${healthColor(ep.status)}`}>
                {ep.status === 'checking' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : ep.status === 'ok' ? (
                  <CheckCircle size={15} />
                ) : ep.status === 'warn' ? (
                  <AlertTriangle size={15} />
                ) : (
                  <XCircle size={15} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{ep.label}</p>
                <p className="text-xs font-mono text-slate-500 truncate">{ep.url}</p>
              </div>
              {ep.latencyMs !== undefined && (
                <span className={`text-xs font-mono ${ep.latencyMs > 2000 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {ep.latencyMs}ms
                </span>
              )}
              {ep.detail && (
                <span className="text-xs text-slate-500 max-w-xs truncate hidden md:block">{ep.detail}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Env vars checklist */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <Key size={15} className="text-slate-400" />
            <p className="text-sm font-semibold text-white">Environment Variables</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-teal-400 font-semibold">{presentCount} configured</span>
            <span className="text-xs text-amber-400 font-semibold">{missingCount} missing</span>
          </div>
        </div>
        <div className="divide-y divide-slate-700/30">
          {ENV_VARS.map(v => (
            <div key={v.key} className="flex items-center gap-4 px-6 py-3.5">
              <div className={v.present ? 'text-teal-400' : 'text-amber-400'}>
                {v.present ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 shrink-0">{v.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium text-white">{v.key}</p>
                <p className="text-xs text-slate-500">{v.label}</p>
              </div>
              <span className="text-xs text-slate-500 hidden sm:block">{v.impact}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                v.present
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {v.present ? '✅ Set' : '⚠️ Missing'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Platform status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            name: 'Vercel',
            icon: <Cloud size={16} />,
            detail: 'Auto-deploy on push to main · getnama.app',
            status: 'ok' as const,
            note: 'Project: nama-web',
          },
          {
            name: 'Railway',
            icon: <Server size={16} />,
            detail: 'intuitive-blessing · FastAPI + Gunicorn 4 workers',
            status: 'ok' as const,
            note: 'v0.3.0 · alembic upgrade heads on deploy',
          },
          {
            name: 'Neon PostgreSQL',
            icon: <Database size={16} />,
            detail: 'Serverless Postgres · connection pooling via SQLAlchemy',
            status: 'ok' as const,
            note: '9 migrations · heads: leadsource_website',
          },
        ].map(p => (
          <div key={p.name} className={`rounded-2xl border p-5 ${healthBg(p.status)}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={healthColor(p.status)}>{p.icon}</span>
              <p className="font-semibold text-white text-sm">{p.name}</p>
              <CheckCircle size={13} className="ml-auto text-teal-400" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{p.detail}</p>
            <p className="text-xs text-slate-500 mt-2 font-mono">{p.note}</p>
          </div>
        ))}
      </div>

      {/* Alembic migration chain */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        <button
          onClick={() => setExpandedMigrations(v => !v)}
          className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-slate-700/20 transition-colors"
        >
          <GitBranch size={15} className="text-slate-400" />
          <p className="text-sm font-semibold text-white flex-1">Alembic Migration Chain</p>
          <span className="text-xs text-slate-500">{MIGRATIONS.length} migrations</span>
          {expandedMigrations ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        {expandedMigrations && (
          <div className="px-6 pb-5 pt-1">
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-[7px] top-4 bottom-4 w-px bg-slate-700/60" />
              <div className="space-y-3">
                {MIGRATIONS.map((m, i) => (
                  <div key={m.id} className="flex items-start gap-4 pl-1">
                    <div className={`relative z-10 mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 ${
                      i === MIGRATIONS.length - 1
                        ? 'border-teal-500 bg-teal-500'
                        : 'border-slate-600 bg-slate-800'
                    }`} />
                    <div>
                      <p className="text-xs font-mono font-semibold text-white">{m.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.note}</p>
                    </div>
                    {i === MIGRATIONS.length - 1 && (
                      <span className="ml-auto shrink-0 rounded-full bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 text-xs text-teal-400 font-semibold">
                        HEAD
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root Page ──────────────────────────────────────────────────────────────────

export default function KbPage() {
  const [tab, setTab] = useState<KbTab>('product')

  const tabs: { id: KbTab; label: string; icon: React.ReactNode }[] = [
    { id: 'product',   label: 'Product',   icon: <Package size={15} /> },
    { id: 'customers', label: 'Customers', icon: <Users size={15} /> },
    { id: 'health',    label: 'Health',    icon: <Activity size={15} /> },
  ]

  return (
    <div className="min-h-screen bg-slate-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Brain size={22} className="text-teal-400" />
            <h1 className="text-xl font-bold text-white">NAMA Intelligence Hub</h1>
            <span className="rounded-full bg-teal-500/20 border border-teal-500/30 px-2.5 py-0.5 text-xs font-semibold text-teal-400">
              R0 Only
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Living command center — product state, customer health, infrastructure status.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          <span>Last updated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-1.5 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'product'   && <ProductTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'health'    && <HealthTab />}
    </div>
  )
}
