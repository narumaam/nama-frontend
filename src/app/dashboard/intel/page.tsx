'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useRef, useEffect } from 'react';
import {
  Users, TrendingUp, AlertTriangle, Clock, Search,
  ChevronRight, Mail, CreditCard, X, CheckCircle,
  BarChart2, Cpu, Globe, Zap, ArrowUpRight, Send,
  Loader2, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

type Plan = 'Trial' | 'Starter' | 'Growth' | 'Churned';
type TrialStatus = 'CRITICAL' | 'URGENT' | 'WARNING' | 'ACTIVE' | 'PAID' | 'CHURNED';

interface Customer {
  id: number;
  name: string;
  email: string;
  plan: Plan;
  status: TrialStatus;
  trialDaysLeft: number | null;
  lastActive: string;
  mrr: number | null;
  trialStarted?: string;
}

interface ActivityEvent {
  id: number;
  type: 'signup' | 'upgrade' | 'login' | 'expiry_warning';
  agency: string;
  detail: string;
  time: string;
}

interface Module {
  name: string;
  completion: number;
  status: 'Live' | 'Beta' | 'Preview';
  lastUpdated: string;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const SEED_CUSTOMERS: Customer[] = [
  { id: 1,  name: 'Horizon Holidays',  email: 'ops@horizonholidays.in',   plan: 'Trial',   status: 'URGENT',   trialDaysLeft: 2,   lastActive: '2h ago',  mrr: null, trialStarted: '2026-04-03' },
  { id: 2,  name: 'Wanderlust DMC',    email: 'hello@wanderlustdmc.com',  plan: 'Trial',   status: 'WARNING',  trialDaysLeft: 5,   lastActive: '1d ago',  mrr: null, trialStarted: '2026-04-06' },
  { id: 3,  name: 'Elite Escapes',     email: 'admin@eliteescapes.in',    plan: 'Starter', status: 'PAID',     trialDaysLeft: null,lastActive: '30m ago', mrr: 4999, trialStarted: undefined },
  { id: 4,  name: 'Sky Routes',        email: 'info@skyroutes.co.in',     plan: 'Trial',   status: 'ACTIVE',   trialDaysLeft: 8,   lastActive: '3h ago',  mrr: null, trialStarted: '2026-04-09' },
  { id: 5,  name: 'Globe Trotters',    email: 'team@globetrotters.in',    plan: 'Growth',  status: 'PAID',     trialDaysLeft: null,lastActive: '1h ago',  mrr: 12999,trialStarted: undefined },
  { id: 6,  name: 'Voyage India',      email: 'contact@voyageindia.com',  plan: 'Trial',   status: 'CRITICAL', trialDaysLeft: 1,   lastActive: '5h ago',  mrr: null, trialStarted: '2026-04-02' },
  { id: 7,  name: 'Nomad Trails',      email: 'hi@nomadtrails.in',        plan: 'Trial',   status: 'ACTIVE',   trialDaysLeft: 12,  lastActive: '2d ago',  mrr: null, trialStarted: '2026-04-13' },
  { id: 8,  name: 'Sunrise Travels',   email: 'accounts@sunrisetravels.in',plan:'Starter', status: 'PAID',     trialDaysLeft: null,lastActive: '4h ago',  mrr: 4999, trialStarted: undefined },
  { id: 9,  name: 'Blue Ocean Tours',  email: 'ops@blueoceantours.com',   plan: 'Trial',   status: 'URGENT',   trialDaysLeft: 3,   lastActive: '6h ago',  mrr: null, trialStarted: '2026-04-04' },
  { id: 10, name: 'Mountain High',     email: 'info@mountainhigh.in',     plan: 'Trial',   status: 'WARNING',  trialDaysLeft: 7,   lastActive: '1d ago',  mrr: null, trialStarted: '2026-04-08' },
  { id: 11, name: 'Desert Dunes',      email: 'hello@desertdunes.com',    plan: 'Churned', status: 'CHURNED',  trialDaysLeft: null,lastActive: '6d ago',  mrr: null, trialStarted: undefined },
  { id: 12, name: 'Coastal Dreams',    email: 'team@coastaldreams.in',    plan: 'Trial',   status: 'ACTIVE',   trialDaysLeft: 15,  lastActive: '8h ago',  mrr: null, trialStarted: '2026-04-16' },
];

const SEED_ACTIVITY: ActivityEvent[] = [
  { id: 1,  type: 'signup',          agency: 'Coastal Dreams',   detail: 'New trial signup — 14-day trial started', time: '8h ago' },
  { id: 2,  type: 'login',           agency: 'Globe Trotters',   detail: 'Active session — leads module',            time: '1h ago' },
  { id: 3,  type: 'expiry_warning',  agency: 'Voyage India',     detail: 'Trial expires in 1 day — no upgrade yet', time: '5h ago' },
  { id: 4,  type: 'login',           agency: 'Elite Escapes',    detail: 'Logged in — quotations module',            time: '30m ago' },
  { id: 5,  type: 'expiry_warning',  agency: 'Horizon Holidays', detail: 'Trial expires in 2 days — contacted?',    time: '2h ago' },
  { id: 6,  type: 'login',           agency: 'Sky Routes',       detail: 'Active session — bookings module',        time: '3h ago' },
  { id: 7,  type: 'upgrade',         agency: 'Sunrise Travels',  detail: 'Upgraded from Trial → Starter plan',      time: '3d ago' },
  { id: 8,  type: 'login',           agency: 'Nomad Trails',     detail: 'First login after 2 days inactive',        time: '2d ago' },
  { id: 9,  type: 'upgrade',         agency: 'Globe Trotters',   detail: 'Upgraded from Starter → Growth plan',     time: '5d ago' },
  { id: 10, type: 'signup',          agency: 'Mountain High',    detail: 'New trial signup via onboarding wizard',   time: '11d ago' },
];

const SEED_MODULES: Module[] = [
  { name: 'Leads',          completion: 90, status: 'Live',    lastUpdated: '2026-04-18' },
  { name: 'Quotations',     completion: 85, status: 'Live',    lastUpdated: '2026-04-18' },
  { name: 'Itineraries',    completion: 80, status: 'Live',    lastUpdated: '2026-04-17' },
  { name: 'Bookings',       completion: 85, status: 'Live',    lastUpdated: '2026-04-18' },
  { name: 'Visas',          completion: 70, status: 'Beta',    lastUpdated: '2026-04-15' },
  { name: 'Documents',      completion: 90, status: 'Live',    lastUpdated: '2026-04-19' },
  { name: 'Contracts',      completion: 60, status: 'Preview', lastUpdated: '2026-04-10' },
  { name: 'Finance',        completion: 75, status: 'Preview', lastUpdated: '2026-04-16' },
  { name: 'Comms',          completion: 80, status: 'Live',    lastUpdated: '2026-04-14' },
  { name: 'Automations',    completion: 75, status: 'Live',    lastUpdated: '2026-04-17' },
  { name: 'Routines',       completion: 85, status: 'Live',    lastUpdated: '2026-04-19' },
  { name: 'Vendors',        completion: 85, status: 'Live',    lastUpdated: '2026-04-18' },
  { name: 'Content',        completion: 70, status: 'Beta',    lastUpdated: '2026-04-16' },
  { name: 'Reports',        completion: 75, status: 'Live',    lastUpdated: '2026-04-18' },
  { name: 'Integrations',   completion: 70, status: 'Beta',    lastUpdated: '2026-04-19' },
  { name: 'Widget',         completion: 90, status: 'Live',    lastUpdated: '2026-04-19' },
  { name: 'Org & Control',  completion: 80, status: 'Live',    lastUpdated: '2026-04-19' },
  { name: 'Copilot',        completion: 65, status: 'Beta',    lastUpdated: '2026-04-17' },
];

// ─── Keyword answers for Ask NAMA fallback ───────────────────────────────────

const KEYWORD_ANSWERS: { keys: string[]; answer: string }[] = [
  {
    keys: ['screen', 'page', 'view'],
    answer: 'NAMA has 43 screens across 6 categories: Core CRM (8 screens), Operations (10 screens), Intelligence (6 screens), Finance & Docs (7 screens), Admin & Config (8 screens), and Customer-facing (4 screens). This includes the public customer portal, widget, and onboarding wizard.',
  },
  {
    keys: ['module'],
    answer: '18 core modules: Leads, Quotations, Itineraries, Bookings, Visas, Documents, Contracts, Finance, Comms, Automations, Routines, Vendors, Content, Reports, Integrations, Widget, Org & Control, and Copilot. Average completion across all modules is 78%.',
  },
  {
    keys: ['trial', 'free'],
    answer: 'Currently 9 trial accounts active. Breakdown by urgency: CRITICAL (≤1 day) = 1 (Voyage India), URGENT (≤3 days) = 2 (Horizon Holidays, Blue Ocean Tours), WARNING (≤7 days) = 2 (Wanderlust DMC, Mountain High), ACTIVE = 4. Immediate action needed on Voyage India and Horizon Holidays.',
  },
  {
    keys: ['paid', 'customer', 'revenue'],
    answer: 'Currently 3 paid accounts generating ₹22,997/month MRR: Globe Trotters (Growth ₹12,999/mo), Elite Escapes (Starter ₹4,999/mo), Sunrise Travels (Starter ₹4,999/mo). Total ARR potential = ₹275,964. If all 9 trials convert at Starter, MRR would grow to ₹67,988.',
  },
  {
    keys: ['convert', 'conversion', 'upgrade', 'urgency'],
    answer: 'Conversion pipeline — CRITICAL: Voyage India (1 day left). URGENT: Horizon Holidays (2 days), Blue Ocean Tours (3 days). WARNING: Wanderlust DMC (5 days), Mountain High (7 days). Recommended action: send personalised outreach to Voyage India and Horizon Holidays today. Estimated conversion MRR if all 5 upgrade = ₹24,995/mo.',
  },
  {
    keys: ['api', 'endpoint', 'backend'],
    answer: 'NAMA backend exposes 80+ API endpoints built on FastAPI (Railway). Categories: Auth (3), Leads (12), Quotations (8), Itineraries (10), Bookings (8), Vendors (10), Copilot (5), Onboarding (6), Analytics (7), Webhooks (6), Marketplace (4), Calendar (3), Sentinel (3), RBAC (8), others (7+).',
  },
  {
    keys: ['test', 'playwright', 'e2e'],
    answer: 'E2E test suite: 27 tests across 6 test files using Playwright. All 27 tests passing as of 2026-04-18. Coverage: auth flows, leads CRUD, quotation builder, booking confirmation, copilot chat, dashboard navigation.',
  },
  {
    keys: ['stack', 'tech', 'technology'],
    answer: 'Frontend: Next.js 14.2 App Router + TypeScript 5 + Tailwind 3.4 (Vercel, auto-deploy). Backend: FastAPI + SQLAlchemy + Alembic (Railway). Database: Neon PostgreSQL (serverless). AI: OpenRouter (Llama 3.3 70B) + Anthropic Claude (optional). Email: Resend + React Email. PDF: WeasyPrint server-side.',
  },
  {
    keys: ['churn', 'churned', 'lost'],
    answer: '1 churned account in the current dataset: Desert Dunes (trial expired 3 days ago, no conversion). Churn rate = 1 of 13 total accounts = 7.7%. Recommendation: set up automated follow-up sequence for day-12, day-14, and day-16 of trial.',
  },
  {
    keys: ['loc', 'lines of code', 'codebase'],
    answer: 'NAMA codebase is approximately 45,000 lines of code. Frontend (Next.js): ~28,000 lines across 60+ component and page files. Backend (FastAPI): ~17,000 lines across 40+ route, model, and service files. Excluding node_modules, migrations, and auto-generated files.',
  },
];

function getKeywordAnswer(query: string): string | null {
  const q = query.toLowerCase();
  for (const item of KEYWORD_ANSWERS) {
    if (item.keys.some((k) => q.includes(k))) return item.answer;
  }
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TrialStatus }) {
  const map: Record<TrialStatus, { label: string; className: string }> = {
    CRITICAL: { label: 'CRITICAL', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
    URGENT:   { label: 'URGENT',   className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
    WARNING:  { label: 'WARNING',  className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
    ACTIVE:   { label: 'ACTIVE',   className: 'bg-teal-500/20 text-teal-400 border border-teal-500/30' },
    PAID:     { label: 'PAID',     className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
    CHURNED:  { label: 'CHURNED',  className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
  };
  const { label, className } = map[status];
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${className}`}>
      {status === 'CRITICAL' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />}
      {label}
    </span>
  );
}

function CompletionBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? 'bg-[#14B8A6]' : pct >= 70 ? 'bg-amber-400' : 'bg-orange-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function ModuleStatusBadge({ status }: { status: Module['status'] }) {
  const map = {
    Live:    'bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30',
    Beta:    'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    Preview: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${map[status]}`}>
      {status}
    </span>
  );
}

// ─── Convert Modal ────────────────────────────────────────────────────────────

function ConvertModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [plan, setPlan] = useState<'Starter' | 'Growth'>('Starter');
  const [done, setDone] = useState(false);

  const PLANS = [
    { id: 'Starter', label: 'Starter', price: '₹4,999/mo', desc: '5 team members, all core modules' },
    { id: 'Growth',  label: 'Growth',  price: '₹12,999/mo', desc: 'Unlimited members, AI + analytics' },
  ] as const;

  const handleConvert = () => { setDone(true); };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#0F172A] rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {!done ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Convert to Paid</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{customer.name}</p>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      plan === p.id
                        ? 'border-[#14B8A6] bg-[#14B8A6]/5 dark:bg-[#14B8A6]/10'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 dark:text-white">{p.label}</span>
                      <span className="font-black text-[#14B8A6]">{p.price}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvert}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#14B8A6] text-white text-sm font-black hover:bg-teal-500 transition-all"
                >
                  Convert Now
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#14B8A6]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-[#14B8A6]" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Conversion Logged</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {customer.name} marked as {plan}. A payment link + welcome email would fire here with Razorpay + Resend wired up.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#0F172A] dark:bg-white dark:text-[#0F172A] text-white text-sm font-black hover:opacity-90 transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab() {
  const total = SEED_CUSTOMERS.length;
  const trial = SEED_CUSTOMERS.filter(c => c.plan === 'Trial').length;
  const paid  = SEED_CUSTOMERS.filter(c => c.plan === 'Starter' || c.plan === 'Growth').length;
  const expiring = SEED_CUSTOMERS.filter(c => c.trialDaysLeft !== null && c.trialDaysLeft <= 7).length;

  const pipeline = SEED_CUSTOMERS
    .filter(c => c.plan === 'Trial')
    .sort((a, b) => (a.trialDaysLeft ?? 99) - (b.trialDaysLeft ?? 99));

  const statusLabel = (c: Customer): TrialStatus => {
    if (c.trialDaysLeft === null) return 'PAID';
    if (c.trialDaysLeft <= 1)  return 'CRITICAL';
    if (c.trialDaysLeft <= 3)  return 'URGENT';
    if (c.trialDaysLeft <= 7)  return 'WARNING';
    return 'ACTIVE';
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Accounts</span>
            <div className="w-8 h-8 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center">
              <Users size={16} className="text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{total}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">across all plans</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Trial Accounts</span>
            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Clock size={16} className="text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{trial}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">active free trials</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Paid Accounts</span>
            <div className="w-8 h-8 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center justify-center">
              <CreditCard size={16} className="text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-green-600 dark:text-green-400">{paid}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">paying customers</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Expiring This Week</span>
            <div className="w-8 h-8 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center relative">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-600 dark:text-red-400">{expiring}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">trials ≤ 7 days left</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Pipeline */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Conversion Pipeline</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Trial accounts sorted by urgency</p>
            </div>
            <TrendingUp size={16} className="text-[#14B8A6]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Agency</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Started</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Days Left</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">MRR Potential</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {pipeline.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">{c.trialStarted ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`font-black ${(c.trialDaysLeft ?? 99) <= 1 ? 'text-red-500' : (c.trialDaysLeft ?? 99) <= 3 ? 'text-orange-500' : (c.trialDaysLeft ?? 99) <= 7 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {c.trialDaysLeft}d
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">₹4,999/mo</td>
                    <td className="px-3 py-3"><StatusBadge status={statusLabel(c)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Recent Activity</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Account events across all tenants</p>
            </div>
            <RefreshCw size={14} className="text-slate-400 cursor-pointer hover:text-[#14B8A6] transition-colors" />
          </div>
          <div className="divide-y divide-slate-50 dark:divide-white/5">
            {SEED_ACTIVITY.map((ev) => {
              const iconMap = {
                signup:          { icon: Users,       color: 'text-teal-500 bg-teal-50 dark:bg-teal-500/10' },
                upgrade:         { icon: TrendingUp,  color: 'text-green-500 bg-green-50 dark:bg-green-500/10' },
                login:           { icon: ChevronRight,color: 'text-slate-400 bg-slate-50 dark:bg-white/5' },
                expiry_warning:  { icon: AlertTriangle,color: 'text-red-500 bg-red-50 dark:bg-red-500/10' },
              };
              const { icon: Icon, color } = iconMap[ev.type];
              return (
                <div key={ev.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ev.agency}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{ev.detail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{ev.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: Customers ─────────────────────────────────────────────────────────

function CustomersTab() {
  const [filter, setFilter] = useState<'All' | 'Trial' | 'Paid' | 'Churned'>('All');
  const [convertTarget, setConvertTarget] = useState<Customer | null>(null);

  const filtered = SEED_CUSTOMERS.filter((c) => {
    if (filter === 'Trial')   return c.plan === 'Trial';
    if (filter === 'Paid')    return c.plan === 'Starter' || c.plan === 'Growth';
    if (filter === 'Churned') return c.plan === 'Churned';
    return true;
  });

  const mrrTotal = SEED_CUSTOMERS.reduce((s, c) => s + (c.mrr ?? 0), 0);

  const FILTERS = ['All', 'Trial', 'Paid', 'Churned'] as const;

  return (
    <div className="space-y-5">
      {convertTarget && (
        <ConvertModal customer={convertTarget} onClose={() => setConvertTarget(null)} />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total MRR', value: `₹${mrrTotal.toLocaleString('en-IN')}`, sub: 'per month' },
          { label: 'Avg Trial Length', value: '14 days', sub: 'standard' },
          { label: 'Trial Conversion', value: '33%', sub: 'historical avg' },
          { label: 'NPS Score', value: '72', sub: 'last 30 days' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#0F172A] rounded-xl p-4 border border-slate-100 dark:border-white/5">
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">{s.label}</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === f
                ? 'bg-[#0F172A] dark:bg-[#14B8A6] text-white dark:text-[#0F172A]'
                : 'bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            {f}
            <span className="ml-1.5 text-[10px] opacity-60">
              {f === 'All' ? SEED_CUSTOMERS.length :
               f === 'Trial' ? SEED_CUSTOMERS.filter(c => c.plan === 'Trial').length :
               f === 'Paid' ? SEED_CUSTOMERS.filter(c => c.plan === 'Starter' || c.plan === 'Growth').length :
               SEED_CUSTOMERS.filter(c => c.plan === 'Churned').length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                {['Agency Name','Email','Plan','Status','Trial Days Left','Last Active','MRR','Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{c.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${
                      c.plan === 'Growth'  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' :
                      c.plan === 'Starter' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                      c.plan === 'Trial'   ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                      'bg-slate-100 dark:bg-slate-500/20 text-slate-500 dark:text-slate-400'
                    }`}>{c.plan}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    {c.trialDaysLeft !== null ? (
                      <span className={`font-black text-sm ${c.trialDaysLeft <= 1 ? 'text-red-500' : c.trialDaysLeft <= 3 ? 'text-orange-500' : c.trialDaysLeft <= 7 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {c.trialDaysLeft}d
                      </span>
                    ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{c.lastActive}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {c.mrr ? `₹${c.mrr.toLocaleString('en-IN')}/mo` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all" title="View">
                        <ArrowUpRight size={13} />
                      </button>
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all" title="Send Email">
                        <Mail size={13} />
                      </button>
                      {c.plan === 'Trial' && (
                        <button
                          onClick={() => setConvertTarget(c)}
                          className="px-2.5 py-1 rounded-lg bg-[#14B8A6] text-white text-[10px] font-black hover:bg-teal-500 transition-all whitespace-nowrap"
                        >
                          Convert
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Product Intelligence ─────────────────────────────────────────────

function ProductTab() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const QUICK_STATS = [
    { label: 'Total Screens',        value: '43',             icon: Globe },
    { label: 'Total Modules',        value: '18',             icon: Cpu },
    { label: 'API Endpoints',        value: '80+',            icon: Zap },
    { label: 'Lines of Code',        value: '~45,000',        icon: BarChart2 },
    { label: 'E2E Tests',            value: '27 passing',     icon: CheckCircle },
    { label: 'Avg Module Completion',value: '78%',            icon: TrendingUp },
    { label: 'Tech Stack',           value: 'Next.js 14 + FastAPI', icon: Cpu },
    { label: 'Deploy Time',          value: '~2 min',         icon: RefreshCw },
  ];

  const QUICK_QUESTIONS = [
    'How many screens does NAMA have?',
    'Which modules need work?',
    'How many trial customers?',
    'Who needs to convert this week?',
  ];

  const avgCompletion = Math.round(
    SEED_MODULES.reduce((s, m) => s + m.completion, 0) / SEED_MODULES.length
  );

  const handleAsk = async (q?: string) => {
    const finalQ = q ?? query;
    if (!finalQ.trim()) return;
    setQuery(finalQ);
    setLoading(true);
    setAnswer('');

    try {
      const res = await fetch('/api/v1/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: finalQ }],
          system: `You are the NAMA OS product intelligence assistant. NAMA is a SaaS platform for travel agencies.
Key facts:
- 43 screens, 18 modules, 80+ API endpoints, ~45,000 lines of code
- 27 passing E2E tests (Playwright), avg module completion 78%
- Tech: Next.js 14 + FastAPI + Neon PostgreSQL
- Current customers: 12 total — 9 trials, 3 paid (MRR ₹22,997)
- Critical trials: Voyage India (1 day), Horizon Holidays (2 days), Blue Ocean Tours (3 days)
- Paid: Globe Trotters (Growth ₹12,999), Elite Escapes (Starter ₹4,999), Sunrise Travels (Starter ₹4,999)
Answer concisely and helpfully. Use bullet points where appropriate.`,
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? data?.response ?? data?.message ?? '';
      if (text) { setAnswer(text); return; }
      throw new Error('empty');
    } catch {
      // Keyword fallback
      const fallback = getKeywordAnswer(finalQ);
      setAnswer(fallback ?? "I don't have a specific answer for that query. Try asking about: screens, modules, trial customers, conversions, API endpoints, tech stack, or E2E tests.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleAsk(); };

  return (
    <div className="space-y-6">
      {/* Quick Stats grid */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Quick Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_STATS.map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#0F172A] rounded-xl p-4 border border-slate-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={14} className="text-[#14B8A6]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{s.label}</p>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Module Health */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Module Health</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              18 modules — avg completion{' '}
              <span className={`font-black ${avgCompletion >= 80 ? 'text-[#14B8A6]' : 'text-amber-500'}`}>{avgCompletion}%</span>
            </p>
          </div>
          <BarChart2 size={16} className="text-[#14B8A6]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Module</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-48">Completion</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {SEED_MODULES.map((m) => (
                <tr key={m.name} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{m.name}</td>
                  <td className="px-4 py-3 w-48"><CompletionBar pct={m.completion} /></td>
                  <td className="px-4 py-3"><ModuleStatusBadge status={m.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 hidden sm:table-cell">{m.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ask NAMA */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Ask NAMA</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Ask any product or business question — powered by NAMA Copilot</p>
        </div>

        <div className="p-5">
          {/* Quick questions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleAsk(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-[#14B8A6]/10 hover:text-[#14B8A6] transition-all font-medium border border-transparent hover:border-[#14B8A6]/30"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. how many trial customers need converting this week?"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50 focus:border-[#14B8A6]/50 transition-all"
              />
            </div>
            <button
              onClick={() => handleAsk()}
              disabled={loading || !query.trim()}
              className="px-4 py-3 rounded-xl bg-[#0F172A] dark:bg-[#14B8A6] text-white dark:text-[#0F172A] font-black text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Ask
            </button>
          </div>

          {/* Answer */}
          {(loading || answer) && (
            <div className="mt-4 p-4 rounded-xl bg-[#0F172A]/5 dark:bg-white/5 border border-[#14B8A6]/20">
              {loading ? (
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <Loader2 size={14} className="animate-spin text-[#14B8A6]" />
                  <span className="text-xs">NAMA is thinking...</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-[#14B8A6] rounded-md flex items-center justify-center font-black text-[#0F172A] text-[10px]">N</div>
                    <span className="text-xs font-black text-[#14B8A6] uppercase tracking-widest">NAMA Answer</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntelPage() {
  const auth = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'customers' | 'product'>('overview');

  // Role guard — R0/R1/R2 only
  useEffect(() => {
    const role = auth.user?.role;
    const ALLOWED = ['R0_NAMA_OWNER', 'R1_SUPER_ADMIN', 'R2_ORG_ADMIN'];
    // If auth has resolved and role is set but not allowed, redirect
    if (role && !ALLOWED.includes(role)) {
      router.replace('/dashboard');
    }
  }, [auth.user?.role, router]);

  const TABS = [
    { id: 'overview',   label: 'Overview' },
    { id: 'customers',  label: 'Customers' },
    { id: 'product',    label: 'Product Intelligence' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#14B8A6]">Live</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">NAMA Intelligence Hub</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live operational command center — customers, conversions, product health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">as of</span>
          <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">2026-04-19</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview'  && <OverviewTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'product'   && <ProductTab />}
    </div>
  );
}
