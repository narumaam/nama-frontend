'use client'

/**
 * NAMA OS — Public Landing Page
 * ─────────────────────────────────
 * World-class SaaS marketing page.
 * Sections:
 *   1. Nav          — sticky, with system health pill + CTA
 *   2. Hero         — headline, sub, CTA buttons, live AI triage demo
 *   3. Social Proof — logos strip + 3 testimonials
 *   4. Metrics      — 4 impact numbers with animated counters
 *   5. Module Grid  — all 19 modules in category cards
 *   6. How It Works — 5-step journey (query → invoice)
 *   7. Pricing Preview — 3 plan cards linking to /pricing
 *   8. BYOK Banner  — 60–95% AI cost savings CTA
 *   9. Kinetic CTA  — command center promo
 *  10. Footer       — links + legal
 */

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Zap, ArrowRight, CheckCircle2, X, Loader, AlertCircle,
  ChevronRight, Play, Shield, Globe, BarChart2, MessageSquare,
  Map, Users, CreditCard, FileText, Store, Briefcase, Settings,
  GitBranch, Plug, Key, Inbox, Star,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
type SystemHealth = 'checking' | 'green' | 'orange' | 'red'

// ── Data constants ────────────────────────────────────────────────────────────

const LOGOS = ['Horizon Holidays', 'Wanderlust DMC', 'Elite Escapes', 'Sky Routes', 'Globe Trotters', 'Voyage India']

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
  { value: 94,   suffix: '%',  label: 'Reduction in manual ops time',  desc: 'vs. traditional workflows' },
  { value: 2,    suffix: 'min', label: 'Average quotation turnaround',  desc: 'from enquiry to PDF' },
  { value: 19,   suffix: '',   label: 'Integrated modules',             desc: 'triage → CRM → bid → book → invoice' },
  { value: 60,   suffix: '%+', label: 'AI cost savings with BYOK',      desc: 'bring your own LLM key' },
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
  { step: '01', title: 'Enquiry arrives',       desc: 'WhatsApp, email, or web form — NAMA captures it all.' },
  { step: '02', title: 'AI triages instantly',  desc: 'Destination, dates, travelers, style, budget — extracted in seconds.' },
  { step: '03', title: 'Quote built in 2 min',  desc: 'AI generates an itinerary with margin-aware vendor pricing.' },
  { step: '04', title: 'Booking confirmed',     desc: 'Client signs, payment collected, vouchers auto-dispatched.' },
  { step: '05', title: 'P&L tracked live',      desc: 'Every rupee visible — net margin, vendor costs, reconciliation.' },
]

const PLANS = [
  { name: 'Starter',    price: 4999,  seats: 1,   highlight: false, tag: '' },
  { name: 'Growth',     price: 14999, seats: 5,   highlight: true,  tag: 'Most Popular' },
  { name: 'Scale',      price: 39999, seats: 15,  highlight: false, tag: '' },
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

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>('checking')
  const [query,        setQuery]        = useState("Hi! My wife and I want 7 days in Bali — private villa with pool, spa, and some cooking classes. Budget ₹4 lakh total.")
  const [triageResult, setTriageResult] = useState({ destination: 'Bali, Indonesia', duration: '7 Days', travelers: '2 (Couple)', style: 'Luxury', reply: "Perfect! Our AI is building a curated 7-day Bali luxury plan with private villa options and spa inclusions. You'll receive a detailed itinerary within 2 minutes." })
  const [triageLoading, setTriageLoading] = useState(false)
  const [triageStatus,  setTriageStatus]  = useState('')
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setMetricsVisible(true) }, { threshold: 0.3 })
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
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">N</span>
            </div>
            <span className="text-xl font-black tracking-tight text-[#0F172A]">NAMA</span>
            {/* System health pill */}
            <div className="ml-2 flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                systemHealth === 'green' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' :
                systemHealth === 'orange' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {systemHealth === 'green' ? 'OS LIVE' : systemHealth === 'orange' ? 'DEGRADED' : 'CHECKING'}
              </span>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#modules"  className="hover:text-[#0F172A] transition-colors">Modules</a>
            <a href="#how"      className="hover:text-[#0F172A] transition-colors">How It Works</a>
            <a href="#pricing"  className="hover:text-[#0F172A] transition-colors">Pricing</a>
            <Link href="/byok-calculator" className="text-[#14B8A6] font-semibold hover:underline">BYOK Savings</Link>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/demo" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#14B8A6] border border-[#14B8A6]/30 bg-[#14B8A6]/5 hover:bg-[#14B8A6]/10 transition-all px-3 py-2 rounded-full">
              <Play size={12} fill="currentColor" /> Try Demo
            </Link>
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-[#0F172A] transition-colors px-3 py-2">
              Log In
            </Link>
            <Link href="/register" className="bg-[#0F172A] text-white text-sm px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-[#0F172A]/15">
              Start Free Pilot
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 2. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-[#14B8A6]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#14B8A6]/8 border border-[#14B8A6]/20 px-4 py-2 rounded-full mb-8">
            <div className="w-1.5 h-1.5 bg-[#14B8A6] rounded-full animate-pulse" />
            <span className="text-xs font-black text-[#14B8A6] uppercase tracking-widest">AI-Native Travel OS · 19 Modules · Production-Ready</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tighter text-[#0F172A] leading-[1.02] mb-8">
            The travel industry's<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] via-[#0891b2] to-[#F97316]">
              operating system.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed mb-12 font-medium">
            From the first WhatsApp enquiry to the final invoice — automated, intelligent, and real-time.
            <br className="hidden md:block" />
            <span className="text-[#0F172A] font-bold"> 94% less manual work. Quotations in 2 minutes.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-[#0F172A] text-white text-base px-8 py-4 rounded-full font-bold hover:shadow-2xl hover:shadow-[#0F172A]/20 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Start Free Pilot <ArrowRight size={18} />
            </Link>
            <Link
              href="/demo"
              className="flex items-center gap-2 bg-[#14B8A6] text-[#0F172A] text-base px-8 py-4 rounded-full font-bold hover:shadow-2xl hover:shadow-[#14B8A6]/30 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              <Play size={18} fill="currentColor" /> View Live Demo
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-2 bg-white border-2 border-slate-200 text-base px-8 py-4 rounded-full font-bold hover:border-[#0F172A] transition-all active:scale-95 text-[#0F172A]"
            >
              View Pricing <ChevronRight size={18} />
            </Link>
          </div>

          {/* Live Triage Demo */}
          <div className="max-w-5xl mx-auto bg-[#0F172A] rounded-3xl overflow-hidden shadow-2xl shadow-[#0F172A]/20 text-left">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NAMA M1 — Query Triage Playground</span>
              <div className="w-10" />
            </div>
            <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Input */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">1. Paste any raw enquiry</p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative group focus-within:border-[#14B8A6]/40 transition-colors">
                  <textarea
                    className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-300 h-32 resize-none placeholder-slate-600"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Type any travel enquiry…"
                  />
                  <button
                    onClick={handleTriage}
                    disabled={triageLoading}
                    className="absolute bottom-4 right-4 bg-[#14B8A6] text-[#0F172A] px-4 py-2 rounded-lg text-xs font-black hover:bg-teal-400 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {triageLoading ? <><Loader size={12} className="animate-spin" /> Processing…</> : <><Zap size={12} fill="currentColor" /> Triage Now</>}
                  </button>
                </div>
                {triageStatus && (
                  <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#14B8A6]">{triageStatus}</p>
                )}
              </div>
              {/* Output */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-5">2. Structured AI extraction</p>
                <div className="space-y-4">
                  {[
                    { label: 'Destination', value: triageResult.destination, color: 'text-[#14B8A6]' },
                    { label: 'Duration',    value: triageResult.duration,    color: 'text-white' },
                    { label: 'Travelers',   value: triageResult.travelers,   color: 'text-white' },
                    { label: 'Style',       value: triageResult.style,       color: 'text-[#F97316]' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-end border-b border-white/5 pb-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{r.label}</span>
                      <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">AI Suggested Reply</p>
                    <p className="text-xs text-slate-400 italic leading-relaxed">"{triageResult.reply}"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. SOCIAL PROOF ──────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest mb-10">
            Trusted by travel companies across India
          </p>
          {/* Logo strip */}
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 mb-16">
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

      {/* ── 4. METRICS ────────────────────────────────────────────────────────── */}
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

      {/* ── 5. MODULE GRID ───────────────────────────────────────────────────── */}
      <section id="modules" className="py-24 px-6 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">The full platform</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">19 modules. One OS.</h2>
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

      {/* ── 6. HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">End-to-end automation</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight">From enquiry to invoice.</h2>
          </div>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[28px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-[#14B8A6] to-transparent hidden md:block" />
            <div className="space-y-6">
              {JOURNEY.map((j, i) => (
                <div key={j.step} className="flex items-start gap-6 group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-sm transition-all ${
                    i === 0 ? 'bg-[#14B8A6] text-[#0F172A] shadow-lg shadow-[#14B8A6]/30' : 'bg-slate-100 text-slate-500 group-hover:bg-[#14B8A6]/10 group-hover:text-[#14B8A6]'
                  }`}>
                    {j.step}
                  </div>
                  <div className="pt-3 flex-1">
                    <h3 className="text-lg font-black text-[#0F172A] mb-1">{j.title}</h3>
                    <p className="text-sm text-slate-500 font-medium">{j.desc}</p>
                  </div>
                  {i < JOURNEY.length - 1 && (
                    <div className="hidden md:flex pt-5 text-slate-200">
                      <ChevronRight size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. PRICING PREVIEW ───────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest mb-3">Simple pricing</p>
            <h2 className="text-4xl font-black text-[#0F172A] tracking-tight mb-4">Scale as you grow.</h2>
            <p className="text-slate-500 font-medium">All plans include all 19 modules. No hidden fees.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`rounded-2xl p-7 flex flex-col ${
                  p.highlight
                    ? 'bg-[#0F172A] text-white shadow-2xl shadow-[#0F172A]/20 ring-2 ring-[#14B8A6]'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {p.tag && (
                  <span className="text-[10px] font-black text-[#14B8A6] bg-[#14B8A6]/10 border border-[#14B8A6]/20 px-2.5 py-1 rounded-full uppercase tracking-widest self-start mb-4">
                    {p.tag}
                  </span>
                )}
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
                  Start Free Pilot
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

      {/* ── 8. BYOK BANNER ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-r from-[#0F172A] via-[#0F172A] to-[#0a2a29]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#14B8A6]/10 border border-[#14B8A6]/20 px-3 py-1.5 rounded-full mb-4">
              <Key size={12} className="text-[#14B8A6]" />
              <span className="text-[10px] font-black text-[#14B8A6] uppercase tracking-widest">BYOK — Bring Your Own Key</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-3 leading-tight">
              Cut your AI bill by <span className="text-[#14B8A6]">60–95%.</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium max-w-md">
              Plug in your own Anthropic, OpenAI, or Gemini API key. Your data never touches NAMA's AI credits.
              AES-256 encrypted at rest.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4 flex-shrink-0">
            <Link
              href="/byok-calculator"
              className="flex items-center gap-2 bg-[#14B8A6] text-[#0F172A] px-8 py-4 rounded-full font-black hover:bg-teal-400 transition-all shadow-xl shadow-[#14B8A6]/20 whitespace-nowrap"
            >
              Calculate Your Savings <ArrowRight size={18} />
            </Link>
            <p className="text-xs text-slate-500 font-medium">Free calculator — no signup required</p>
          </div>
        </div>
      </section>

      {/* ── 9. KINETIC CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="w-16 h-16 bg-[#0F172A] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#0F172A]/20">
            <Zap size={28} className="text-[#14B8A6]" fill="currentColor" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight mb-4">
            Switch to <span className="text-[#14B8A6] italic">Kinetic Mode.</span>
          </h2>
          <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto mb-10">
            Real-time anomaly detection, AI agent logs, supply-chain re-routing, and live P&L — visualised like a mission control centre.
          </p>
          <Link
            href="/kinetic"
            className="inline-flex items-center gap-3 bg-[#0F172A] text-white px-10 py-5 rounded-full font-black text-lg hover:shadow-2xl hover:shadow-[#0F172A]/25 hover:-translate-y-1 transition-all"
          >
            <Zap size={20} fill="currentColor" className="text-[#14B8A6]" />
            Enter Command Center
          </Link>
        </div>
      </section>

      {/* ── 10. FOOTER ───────────────────────────────────────────────────────── */}
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
