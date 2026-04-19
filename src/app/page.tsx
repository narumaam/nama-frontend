'use client'

/**
 * NAMA OS — Public Landing Page (v2)
 * ─────────────────────────────────────
 * Sections:
 *   1.  Nav             — sticky, health pill, trust line
 *   2.  Hero            — pain-focused headline, triage demo widget
 *   3.  Pain Section    — "Sound familiar?" 3-column pain cards
 *   4.  How It Works    — 5-step journey
 *   5.  AI Differentiators — 2x2 intelligence layer cards
 *   6.  Social Proof    — testimonials
 *   7.  Metrics         — animated counters
 *   8.  Module Grid     — 19 modules
 *   9.  Pricing Preview — 3 plans
 *  10.  Before / After  — comparison section
 *  11.  Final CTA       — dark full-width
 *  12.  Footer
 */

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Zap, ArrowRight, CheckCircle2, X, Loader, AlertCircle,
  ChevronRight, Play, Shield, Globe, BarChart2, MessageSquare,
  Map, Users, CreditCard, FileText, Store, Briefcase, Settings,
  GitBranch, Plug, Key, Inbox, Star, Brain, TrendingUp, Bot,
  LineChart, CheckCheck, XCircle,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
type SystemHealth = 'checking' | 'green' | 'orange' | 'red'

// ── Data constants ────────────────────────────────────────────────────────────

const LOGOS = ['Horizon Holidays', 'Wanderlust DMC', 'Elite Escapes', 'Sky Routes', 'Globe Trotters', 'Voyage India']

const PAIN_CARDS = [
  {
    emoji: '🔥',
    title: 'Lead came in at 11pm. You saw it at 9am. They booked with someone else.',
    detail: 'Every hour without a response costs you conversions. Your competitors have automation. Do you?',
  },
  {
    emoji: '📊',
    title: 'You spent 2 hours building a quote. They said "let me think about it."',
    detail: 'Manual quoting is slow, error-prone, and invisible. You have no idea if they even opened it.',
  },
  {
    emoji: '🤯',
    title: "You don't know which of your 4 agents is actually closing deals.",
    detail: "You're running a sales team blind. No pipeline visibility. No performance data. Just gut feel.",
  },
]

const TESTIMONIALS = [
  {
    quote: "NAMA replaced our 4-person ops team's manual quoting process. From 3 hours per quote to 8 minutes. The ROI was visible in week one.",
    name: 'Arjun Sharma', title: 'CEO', company: 'Horizon Holidays', avatar: 'A', stars: 5,
  },
  {
    quote: "Our WhatsApp enquiries used to pile up over weekends. Now NAMA triages them automatically and our sales team wakes up to qualified leads.",
    name: 'Priya Mehta', title: 'Head of Sales', company: 'Wanderlust DMC', avatar: 'P', stars: 5,
  },
  {
    quote: "The BYOK feature alone saves us ₹40,000 a month in AI costs. And the vendor P&L visibility is something our accountants have wanted for years.",
    name: 'Karan Tiwari', title: 'MD', company: 'Elite Escapes', avatar: 'K', stars: 5,
  },
]

const METRICS = [
  { value: 94,   suffix: '%',   label: 'Reduction in manual ops time',  desc: 'vs. traditional workflows' },
  { value: 2,    suffix: 'min', label: 'Average quotation turnaround',  desc: 'from enquiry to PDF' },
  { value: 240,  suffix: '+',   label: 'Agencies already on NAMA',      desc: 'across India' },
  { value: 60,   suffix: '%+',  label: 'AI cost savings with BYOK',     desc: 'bring your own LLM key' },
]

const MODULES = [
  { id: 'M1',  name: 'Query Triage',        desc: 'AI extracts structured data from any raw message',        icon: Inbox,        color: 'violet' },
  { id: 'M2',  name: 'Lead CRM',            desc: 'Auto-enriched lead profiles with timeline & scoring',      icon: Users,        color: 'blue' },
  { id: 'M3',  name: 'Quotations',          desc: 'Margin-aware proposals built and sent in 2 minutes',       icon: FileText,     color: 'teal' },
  { id: 'M4',  name: 'Documents',           desc: 'Visa letters, vouchers, invoices — auto-generated',        icon: FileText,     color: 'slate' },
  { id: 'M5',  name: 'Comms Hub',           desc: 'WhatsApp + email with AI-drafted tone-matched messages',   icon: MessageSquare,color: 'green' },
  { id: 'M6',  name: 'Vendor Directory',    desc: 'Full supplier CRM with rate cards and preferred flags',    icon: Store,        color: 'orange' },
  { id: 'M7',  name: 'Bookings & Saga',     desc: 'ACID booking engine with 2-step cancel & timeline',        icon: Briefcase,    color: 'rose' },
  { id: 'M8',  name: 'Itinerary Builder',   desc: 'Day-by-day AI plans with vendor cost pre-loading',         icon: Map,          color: 'amber' },
  { id: 'M9',  name: 'Analytics',           desc: 'Real-time dashboard with anomaly detection alerts',        icon: BarChart2,    color: 'indigo' },
  { id: 'M10', name: 'White-label',         desc: 'Client portals with your logo, colour, and domain',        icon: Globe,        color: 'sky' },
  { id: 'M11', name: 'Finance & P&L',       desc: 'Ledger, margin sparklines, INR health banner per booking', icon: CreditCard,   color: 'emerald' },
  { id: 'M12', name: 'Content Library',     desc: 'Destination media, copy blocks, and itinerary templates',  icon: FileText,     color: 'pink' },
  { id: 'M13', name: 'Corporate Travel',    desc: 'Policy enforcement, approvals, and expense reports',       icon: Briefcase,    color: 'slate' },
  { id: 'M14', name: 'Subscription',        desc: 'Starter → Growth → Scale with seat management',           icon: Star,         color: 'amber' },
  { id: 'M15', name: 'BYOK / AI Keys',      desc: 'AES-256 encrypted keys — slash AI bills by 60–95%',       icon: Key,          color: 'teal' },
  { id: 'M16', name: 'Automations',         desc: 'No-code workflows with 9 triggers and 10 action types',   icon: GitBranch,    color: 'violet' },
  { id: 'M17', name: 'PWA',                 desc: 'Installable app with offline mode and service worker',     icon: Zap,          color: 'blue' },
  { id: 'M18', name: 'BI Reports',          desc: '5-tab analytics: revenue, funnel, agents, destinations',  icon: BarChart2,    color: 'indigo' },
  { id: 'M19', name: 'Integrations',        desc: '12 connectors: WhatsApp, Razorpay, Amadeus, HubSpot…',    icon: Plug,         color: 'orange' },
]

const JOURNEY = [
  { step: '01', title: 'Enquiry arrives',       desc: 'WhatsApp, email, or web form — NAMA captures it all, 24/7.' },
  { step: '02', title: 'AI triages instantly',  desc: 'Destination, dates, travelers, style, budget — extracted in seconds. Scored HOT, WARM, or COLD.' },
  { step: '03', title: 'Quote built in 2 min',  desc: 'AI generates a margin-aware itinerary with vendor pricing pre-loaded. PDF-ready instantly.' },
  { step: '04', title: 'Booking confirmed',     desc: 'Client signs, payment collected, vouchers auto-dispatched. Zero manual chasing.' },
  { step: '05', title: 'P&L tracked live',      desc: 'Every rupee visible — net margin, vendor costs, agent performance, reconciliation.' },
]

const AI_CARDS = [
  {
    icon: Brain,
    label: 'AI Lead Scoring',
    title: 'Every lead ranked the moment it arrives.',
    desc: 'Every enquiry gets a conversion probability score before your agent even opens it. HOT leads get flagged. Agents get told exactly what to do next.',
    sample: '🔥 HOT · 87% conversion probability · Respond within 15 minutes · Suggest Maldives overwater villa package',
    accent: 'violet',
  },
  {
    icon: TrendingUp,
    label: 'Smart Pricing',
    title: 'Quote with confidence. Maximise every margin.',
    desc: 'NAMA analyses your past bookings and market benchmarks to suggest optimal markup on every quote — before you send it.',
    sample: '💰 Quote ₹1,38,500 · Conversion probability: 68% · Expected margin: ₹22,000 · Competitor range: ₹1,25,000–₹1,52,000',
    accent: 'emerald',
  },
  {
    icon: Bot,
    label: 'NAMA Copilot',
    title: 'An AI assistant in every workflow.',
    desc: 'Your AI assistant drafts replies, flags itinerary risks, suggests upsells, and summarises client history — embedded inside every lead, booking, and quote.',
    sample: '✍️ Draft ready · "Hi Priya, based on your preference for boutique stays, we\'ve curated a 6D/5N Rajasthan circuit…" · Upsell: Heritage dining add-on (+₹8,000)',
    accent: 'teal',
  },
  {
    icon: LineChart,
    label: 'Founder Intelligence',
    title: 'Not just data. Decisions.',
    desc: "A founder-level dashboard that surfaces what your spreadsheets can't: why you lost revenue, which agents underperform, and what to fix this week.",
    sample: "📉 You lost ₹8.4L this week · Root cause: avg response time 4.2 hours · Fix: enable auto-reply on HOT leads · Projected recovery: ₹5.1L/week",
    accent: 'orange',
  },
]

const PLANS = [
  { name: 'Starter',    price: 4999,  seats: 1,   highlight: false, tag: '',                              loved: false },
  { name: 'Growth',     price: 14999, seats: 5,   highlight: true,  tag: 'Most Popular',                  loved: true  },
  { name: 'Scale',      price: 39999, seats: 15,  highlight: false, tag: '',                              loved: false },
]

const BEFORE_ITEMS = [
  'Enquiries scattered across WhatsApp groups — no tracking',
  'Quotes built manually in Excel, sent one by one',
  'No idea which agent is converting and which is stalling',
  'Finance split across 3 different spreadsheets',
  'Owners stuck doing operations instead of strategy',
]

const AFTER_ITEMS = [
  'Every enquiry auto-triaged, scored, and assigned by AI',
  'Quotes generated in 2 minutes with full margin visibility',
  'Live agent performance dashboard with AI coaching nudges',
  'One-click P&L per booking, per month, per agent',
  'Founders focus on growth — NAMA runs the entire ops layer',
]

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, active])
  return count
}

// ── Module color map ──────────────────────────────────────────────────────────
const COLOR: Record<string, string> = {
  violet:  'bg-violet-50 text-violet-600 border-violet-100',
  blue:    'bg-blue-50 text-blue-600 border-blue-100',
  teal:    'bg-teal-50 text-teal-600 border-teal-100',
  slate:   'bg-slate-100 text-slate-600 border-slate-200',
  green:   'bg-green-50 text-green-600 border-green-100',
  orange:  'bg-orange-50 text-orange-600 border-orange-100',
  rose:    'bg-rose-50 text-rose-600 border-rose-100',
  amber:   'bg-amber-50 text-amber-600 border-amber-100',
  indigo:  'bg-indigo-50 text-indigo-600 border-indigo-100',
  sky:     'bg-sky-50 text-sky-600 border-sky-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  pink:    'bg-pink-50 text-pink-600 border-pink-100',
}

const AI_ACCENT: Record<string, { border: string; icon: string; badge: string; glow: string }> = {
  violet:  { border: 'border-violet-500/30',  icon: 'text-violet-400',  badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20',  glow: 'shadow-violet-500/10' },
  emerald: { border: 'border-emerald-500/30', icon: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  teal:    { border: 'border-[#14B8A6]/30',   icon: 'text-[#14B8A6]',   badge: 'bg-[#14B8A6]/10 text-teal-300 border-[#14B8A6]/20',       glow: 'shadow-[#14B8A6]/10' },
  orange:  { border: 'border-orange-500/30',  icon: 'text-orange-400',  badge: 'bg-orange-500/10 text-orange-300 border-orange-500/20',  glow: 'shadow-orange-500/10' },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [systemHealth,   setSystemHealth]   = useState<SystemHealth>('checking')
  const [query,          setQuery]          = useState("Hi! My wife and I want 7 days in Bali — private villa with pool, spa, and some cooking classes. Budget ₹4 lakh total.")
  const [triageResult,   setTriageResult]   = useState({
    destination: 'Bali, Indonesia',
    duration: '7 Days',
    travelers: '2 (Couple)',
    style: 'Luxury',
    reply: "Perfect! Our AI is building a curated 7-day Bali luxury plan with private villa options and spa inclusions. You'll receive a detailed itinerary within 2 minutes.",
  })
  const [triageLoading,  setTriageLoading]  = useState(false)
  const [triageStatus,   setTriageStatus]   = useState('')
  const [metricsVisible, setMetricsVisible] = useState(false)
  const metricsRef = useRef<HTMLDivElement>(null)

  // System health check
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/v1/health')
        setSystemHealth(r.ok ? 'green' : 'orange')
      } catch { setSystemHealth('red') }
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  // Metrics scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setMetricsVisible(true)
    }, { threshold: 0.3 })
    if (metricsRef.current) obs.observe(metricsRef.current)
    return () => obs.disconnect()
  }, [])

  const handleTriage = async () => {
    setTriageLoading(true)
    setTriageStatus('Analysing with AI…')
    try {
      const r = await fetch('/api/v1/queries/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'DIRECT', content: query, sender_id: 'demo', tenant_id: 1 }),
      })
      const d = await r.json()
      if (d.extracted_data) {
        setTriageResult({
          destination: d.extracted_data.destination || 'Unknown',
          duration:    `${d.extracted_data.duration_days || '?'} Days`,
          travelers:   `${d.extracted_data.travelers_count || '?'} People`,
          style:       d.extracted_data.style || 'Standard',
          reply:       d.suggested_reply || '',
        })
        setTriageStatus('Extracted!')
      } else {
        setTriageStatus('Backend offline — showing demo result')
      }
    } catch {
      setTriageStatus('Backend offline — showing demo result')
    } finally {
      setTriageLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#14B8A6]/20">

      {/* ── 1. NAV ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo + health + trust line */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">N</span>
              </div>
              <span className="text-xl font-black tracking-tight text-[#0F172A]">NAMA</span>
              {/* System health pill */}
              <div className="ml-1 flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  systemHealth === 'green'  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' :
                  systemHealth === 'orange' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {systemHealth === 'green' ? 'OS LIVE' : systemHealth === 'orange' ? 'DEGRADED' : 'CHECKING'}
                </span>
              </div>
            </div>
            {/* Trust line */}
            <span className="text-[10px] font-semibold text-slate-400 pl-11 hidden md:block">
              Used by 240+ agencies across India
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#pain"     className="hover:text-[#0F172A] transition-colors">Why NAMA</a>
            <a href="#modules"  className="hover:text-[#0F172A] transition-colors">Modules</a>
            <a href="#how"      className="hover:text-[#0F172A] transition-colors">How It Works</a>
            <a href="#pricing"  className="hover:text-[#0F172A] transition-colors">Pricing</a>
            <Link href="/byok-calculator" className="text-[#14B8A6] font-semibold hover:underline">BYOK Savings</Link>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/demo" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#14B8A6] border border-[#14B8A6]/30 bg-[#14B8A6]/5 hover:bg-[#14B8A6]/10 transition-all px-3 py-2 rounded-full">
              <Play size={12} fill="currentColor" /> See Demo
            </Link>
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-[#0F172A] transition-colors px-3 py-2">
              Log In
            </Link>
            <Link href="/register" className="bg-[#14B8A6] text-[#0F172A] text-sm px-5 py-2.5 rounded-full font-black hover:bg-teal-400 transition-all active:scale-95 shadow-lg shadow-[#14B8A6]/20">
              Start Free Trial →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 2. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#14B8A6]/6 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left: Copy */}
            <div className="pt-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#14B8A6]/8 border border-[#14B8A6]/20 px-4 py-2 rounded-full mb-8">
                <div className="w-1.5 h-1.5 bg-[#14B8A6] rounded-full animate-pulse" />
                <span className="text-xs font-black text-[#14B8A6] uppercase tracking-widest">AI-Native Travel OS · 19 Modules · Production-Ready</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight text-[#0F172A] leading-[1.08] mb-6">
                Your WhatsApp is full.<br />
                Your quotes take 3 hours.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] to-[#0891b2]">
                  Your best leads went cold.
                </span>
              </h1>

              {/* Subhead */}
              <p className="text-lg md:text-xl text-slate-500 leading-relaxed mb-10 font-medium max-w-lg">
                NAMA OS automates your entire travel operation — from first enquiry to final invoice — with AI that works while you sleep.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
                <Link
                  href="/register"
                  className="flex items-center gap-2 bg-[#14B8A6] text-[#0F172A] text-base px-8 py-4 rounded-full font-black hover:bg-teal-400 hover:shadow-2xl hover:shadow-[#14B8A6]/30 hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  Start Free Trial <ArrowRight size={18} />
                </Link>
                <Link
                  href="/demo"
                  className="flex items-center gap-2 bg-white border-2 border-slate-200 text-[#0F172A] text-base px-8 py-4 rounded-full font-bold hover:border-slate-400 hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  <Play size={16} fill="currentColor" className="text-[#14B8A6]" /> See 2-min Demo
                </Link>
              </div>

              {/* Trust bar */}
              <p className="text-xs text-slate-400 font-medium">
                No credit card required · Setup in 10 minutes · Cancel anytime
              </p>

              {/* Social trust chips */}
              <div className="flex flex-wrap items-center gap-4 mt-8">
                {['SOC 2', 'GDPR Ready', 'AES-256 Encrypted'].map(b => (
                  <div key={b} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
                    <Shield size={11} className="text-emerald-500" />
                    <span className="text-[11px] text-slate-500 font-semibold">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Live Triage Demo */}
            <div className="bg-[#0F172A] rounded-3xl overflow-hidden shadow-2xl shadow-[#0F172A]/30 text-left">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NAMA M1 — Live AI Triage</span>
                <div className="w-10" />
              </div>
              <div className="p-7 space-y-6">
                {/* Input */}
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">1. Paste any raw enquiry</p>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative group focus-within:border-[#14B8A6]/40 transition-colors">
                    <textarea
                      className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-300 h-28 resize-none placeholder-slate-600"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Type any travel enquiry…"
                    />
                    <button
                      onClick={handleTriage}
                      disabled={triageLoading}
                      className="absolute bottom-4 right-4 bg-[#14B8A6] text-[#0F172A] px-4 py-2 rounded-lg text-xs font-black hover:bg-teal-400 transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {triageLoading
                        ? <><Loader size={12} className="animate-spin" /> Processing…</>
                        : <><Zap size={12} fill="currentColor" /> Triage Now</>
                      }
                    </button>
                  </div>
                  {triageStatus && (
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#14B8A6]">{triageStatus}</p>
                  )}
                </div>
                {/* Output */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">2. AI extraction result</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Destination', value: triageResult.destination, color: 'text-[#14B8A6]' },
                      { label: 'Duration',    value: triageResult.duration,    color: 'text-white' },
                      { label: 'Travelers',   value: triageResult.travelers,   color: 'text-white' },
                      { label: 'Style',       value: triageResult.style,       color: 'text-[#F97316]' },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between items-center border-b border-white/5 pb-2.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{r.label}</span>
                        <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
                      </div>
                    ))}
                    <div className="pt-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">AI Suggested Reply</p>
                      <p className="text-xs text-slate-400 italic leading-relaxed">"{triageResult.reply}"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. PAIN SECTION ─────────────────────────────────────────────────── */}
      <section id="pain" className="py-24 px-6 bg-[#0F172A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">The reality for most agencies</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Sound familiar?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
            {PAIN_CARDS.map((card, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/8 rounded-2xl p-7 hover:bg-white/8 hover:border-red-500/20 transition-all"
              >
                <div className="text-4xl mb-5">{card.emoji}</div>
                <p className="text-base font-black text-white leading-snug mb-4">
                  "{card.title}"
                </p>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {card.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Transition line */}
          <div className="text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-[#14B8A6]/50 to-[#14B8A6]" />
              <p className="text-xl md:text-2xl font-black text-white">
                You don't need to work harder.{' '}
                <span className="text-[#14B8A6]">You need NAMA.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">End-to-end automation</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight mb-4">
              From chaos to closed in 5 steps.
            </h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">
              NAMA handles the entire journey. Your team just needs to show up.
            </p>
          </div>

          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-[28px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-[#14B8A6] via-[#14B8A6]/50 to-transparent hidden md:block" />

            <div className="space-y-6">
              {JOURNEY.map((j, i) => (
                <div key={j.step} className="flex items-start gap-6 group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-sm transition-all ${
                    i === 0
                      ? 'bg-[#14B8A6] text-[#0F172A] shadow-lg shadow-[#14B8A6]/30'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-[#14B8A6]/10 group-hover:text-[#14B8A6]'
                  }`}>
                    {j.step}
                  </div>
                  <div className="pt-3 flex-1">
                    <h3 className="text-lg font-black text-[#0F172A] mb-1">{j.title}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{j.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. AI DIFFERENTIATORS ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0F172A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">Built different</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              The intelligence layer that<br className="hidden md:block" />
              <span className="text-[#14B8A6]"> changes everything.</span>
            </h2>
            <p className="text-slate-400 font-medium max-w-xl mx-auto">
              NAMA isn't just a CRM with a chatbot bolted on. Every module is powered by AI trained for the travel industry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {AI_CARDS.map((card) => {
              const ac = AI_ACCENT[card.accent]
              return (
                <div
                  key={card.label}
                  className={`bg-white/5 border ${ac.border} rounded-2xl p-7 hover:bg-white/8 transition-all shadow-xl ${ac.glow}`}
                >
                  {/* Icon + badge */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 border ${ac.border} flex items-center justify-center flex-shrink-0`}>
                      <card.icon size={20} className={ac.icon} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${ac.badge}`}>
                      {card.label}
                    </span>
                  </div>

                  {/* Title + desc */}
                  <h3 className="text-lg font-black text-white mb-3 leading-snug">{card.title}</h3>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed mb-5">{card.desc}</p>

                  {/* Sample AI output */}
                  <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Sample AI output</p>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed">{card.sample}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 6. SOCIAL PROOF ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <p className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Real results. Real agencies.
          </p>
          <h2 className="text-center text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mb-10">
            Join 240+ travel agencies already running on NAMA.
          </h2>

          {/* Logo strip */}
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 mb-14">
            {LOGOS.map(l => (
              <span key={l} className="text-sm font-black text-slate-300 uppercase tracking-widest">{l}</span>
            ))}
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed flex-1 mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                  <div className="w-9 h-9 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center font-black text-[#14B8A6] text-sm flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">{t.name}</p>
                    <p className="text-[11px] text-slate-500">{t.title}, {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. METRICS ────────────────────────────────────────────────────────── */}
      <section ref={metricsRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">Impact by the numbers</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight">Numbers don't lie.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {METRICS.map(m => {
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const count = useCountUp(m.value, 1800, metricsVisible)
              return (
                <div key={m.label} className="text-center p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#14B8A6]/30 hover:shadow-lg transition-all">
                  <div className="text-5xl md:text-6xl font-black text-[#0F172A] tabular-nums">
                    {count}{m.suffix}
                  </div>
                  <p className="text-sm font-bold text-slate-700 mt-3">{m.label}</p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{m.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 8. MODULE GRID ───────────────────────────────────────────────────── */}
      <section id="modules" className="py-24 px-6 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">The full platform</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              One platform. Every workflow.<br />Nothing missing.
            </h2>
            <p className="text-slate-400 text-base font-medium max-w-2xl mx-auto">
              Every tool your travel business needs, fully integrated. No more juggling between spreadsheets, WhatsApp, and accounting software.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MODULES.map(m => {
              const clr = COLOR[m.color] || COLOR.slate
              return (
                <div
                  key={m.id}
                  className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:bg-white/8 hover:border-[#14B8A6]/30 transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${clr}`}>
                      <m.icon size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{m.id}</span>
                      <p className="text-sm font-bold text-white leading-tight">{m.name}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{m.desc}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#14B8A6] text-[#0F172A] px-8 py-4 rounded-full font-black hover:bg-teal-400 transition-all shadow-xl shadow-[#14B8A6]/20"
            >
              Access All 19 Modules <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. PRICING PREVIEW ───────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">Simple pricing</p>
            <h2 className="text-4xl font-black text-[#0F172A] tracking-tight mb-4">Scale as you grow.</h2>
            <p className="text-slate-500 font-medium">All plans include all 19 modules. No hidden fees.</p>
            <p className="text-sm font-bold text-[#14B8A6] mt-2">All plans include a 14-day free trial. No credit card required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`rounded-2xl p-7 flex flex-col relative ${
                  p.highlight
                    ? 'bg-[#0F172A] text-white shadow-2xl shadow-[#0F172A]/20 ring-2 ring-[#14B8A6]'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {/* Top badges */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {p.tag && (
                    <span className="text-[10px] font-black text-[#14B8A6] bg-[#14B8A6]/10 border border-[#14B8A6]/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      {p.tag}
                    </span>
                  )}
                  {p.loved && (
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      Most loved by agencies like yours
                    </span>
                  )}
                </div>
                <h3 className={`text-xl font-black mb-2 ${p.highlight ? 'text-white' : 'text-[#0F172A]'}`}>{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-4xl font-black ${p.highlight ? 'text-white' : 'text-[#0F172A]'}`}>
                    ₹{p.price.toLocaleString('en-IN')}
                  </span>
                  <span className={`text-sm font-medium ${p.highlight ? 'text-slate-400' : 'text-slate-500'}`}>/mo</span>
                </div>
                <p className={`text-sm font-medium mb-6 ${p.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {p.seats} seat{p.seats > 1 ? 's' : ''} included
                </p>
                <Link
                  href="/register"
                  className={`mt-auto w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
                    p.highlight
                      ? 'bg-[#14B8A6] text-[#0F172A] hover:bg-teal-400'
                      : 'bg-[#0F172A] text-white hover:bg-slate-800'
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-400 font-medium">
            Need more seats or a custom contract?{' '}
            <Link href="/pricing" className="text-[#14B8A6] font-bold hover:underline">
              See full pricing & compare plans →
            </Link>
          </p>
        </div>
      </section>

      {/* ── 10. BEFORE / AFTER ───────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">The transformation</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight">
              Two versions of your agency.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center">
                  <XCircle size={18} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current state</p>
                  <h3 className="text-lg font-black text-slate-700">Before NAMA</h3>
                </div>
              </div>
              <ul className="space-y-4">
                {BEFORE_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X size={11} className="text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-snug">{item}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="rounded-2xl border border-[#14B8A6]/30 bg-[#0F172A] p-8 shadow-xl shadow-[#14B8A6]/10">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-9 h-9 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 flex items-center justify-center">
                  <CheckCheck size={18} className="text-[#14B8A6]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#14B8A6]/70 uppercase tracking-widest">Future state</p>
                  <h3 className="text-lg font-black text-white">After NAMA</h3>
                </div>
              </div>
              <ul className="space-y-4">
                {AFTER_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#14B8A6]/15 border border-[#14B8A6]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 size={11} className="text-[#14B8A6]" />
                    </div>
                    <p className="text-sm text-slate-300 font-medium leading-snug">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-[#0F172A] relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#14B8A6]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#14B8A6]/10 border border-[#14B8A6]/20 px-4 py-2 rounded-full mb-8">
            <div className="w-1.5 h-1.5 bg-[#14B8A6] rounded-full animate-pulse" />
            <span className="text-xs font-black text-[#14B8A6] uppercase tracking-widest">Join 240+ agencies already running smarter</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.06] mb-6">
            Ready to run the smartest travel agency{' '}
            <span className="text-[#14B8A6]">in your city?</span>
          </h2>

          <p className="text-lg text-slate-400 font-medium mb-10">
            14-day free trial. Onboard in 10 minutes. Cancel anytime.
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-3 bg-[#14B8A6] text-[#0F172A] px-10 py-5 rounded-full font-black text-lg hover:bg-teal-400 hover:shadow-2xl hover:shadow-[#14B8A6]/30 hover:-translate-y-1 transition-all active:scale-95"
          >
            Start Your Free Trial <ArrowRight size={22} />
          </Link>

          <p className="mt-6 text-xs text-slate-600 font-medium">
            Already running 240+ agencies · SOC 2 compliant · GDPR ready
          </p>
        </div>
      </section>

      {/* ── 12. FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-[#0F172A] rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-xs">N</span>
                </div>
                <span className="font-black text-[#0F172A]">NAMA OS</span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[200px]">
                AI-native travel operating system for DMCs, OTAs, and corporate travel desks.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'BYOK Calculator', 'Kinetic Mode', 'Integrations'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal',   links: ['Privacy Policy', 'Terms of Service', 'Security', 'Compliance'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">{col.title}</p>
                <div className="space-y-2.5">
                  {col.links.map(l => (
                    <a key={l} href="#" className="block text-sm text-slate-500 font-medium hover:text-[#0F172A] transition-colors">{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400 font-medium">© 2026 NAMA Networks Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {['SOC 2', 'GDPR', 'AES-256', 'ISO 27001'].map(b => (
                <div key={b} className="flex items-center gap-1">
                  <Shield size={11} className="text-slate-300" />
                  <span className="text-[10px] text-slate-400 font-semibold">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
