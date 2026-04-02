"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';
import {
  Zap, ArrowRight, Brain, MapPin, Target, CreditCard,
  MessageSquare, Shield, CheckCircle, ChevronRight,
  TrendingUp, Users, Globe, Bot, Activity, Sparkles
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HealthStatus { status: 'online' | 'degraded' | 'offline'; }
interface DemoPreset {
  slug: string;
  label: string;
  query: string;
}

interface DemoPreview {
  destination: string;
  duration: string;
  travelers: string;
  style: string;
  reply: string;
}

// ─── Components ──────────────────────────────────────────────────────────────
function SystemStatus() {
  const [health, setHealth] = useState<HealthStatus['status']>('online');
  useEffect(() => {
    fetch(apiUrl('/health'))
      .then(r => setHealth(r.ok ? 'online' : 'degraded'))
      .catch(() => setHealth('offline'));
  }, []);
  const cfg = {
    online:   { dot: 'bg-[#1D9E75]', label: 'OS ACTIVE',  color: 'text-[#1D9E75]', border: 'border-[#1D9E75]/20', bg: 'bg-[#1D9E75]/8' },
    degraded: { dot: 'bg-[#C9A84C]', label: 'DEGRADED',   color: 'text-[#C9A84C]', border: 'border-[#C9A84C]/20', bg: 'bg-[#C9A84C]/8' },
    offline:  { dot: 'bg-red-500',   label: 'OFFLINE',     color: 'text-red-400',   border: 'border-red-500/20',   bg: 'bg-red-500/8' },
  }[health];
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.border} ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.dot}`} />
      <span className={`text-[8px] font-black uppercase tracking-[0.2em] font-mono ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
}

const AGENTS = [
  { name: 'Triage',     desc: 'Parses every inbound signal — WhatsApp, email, DM — into structured intent in seconds.',  Icon: Brain,         color: 'text-[#C9A84C]', border: 'border-[#C9A84C]/20', bg: 'bg-[#C9A84C]/8' },
  { name: 'Itinerary',  desc: 'Designs bespoke day-by-day itineraries from structured travel cases. Fast, visual, and editable.',   Icon: MapPin,        color: 'text-blue-400',   border: 'border-blue-400/20', bg: 'bg-blue-400/8' },
  { name: 'Bidding',    desc: 'Prepares vendor negotiation workflows and quote logic from the case data you provide.',   Icon: Target,        color: 'text-orange-400', border: 'border-orange-400/20', bg: 'bg-orange-400/8' },
  { name: 'Finance',    desc: 'Sends invoices, tracks payments, reconciles accounts, and forecasts cash flow autonomously.', Icon: CreditCard,   color: 'text-[#1D9E75]', border: 'border-[#1D9E75]/20', bg: 'bg-[#1D9E75]/8' },
  { name: 'Comms',      desc: 'Handles all client communication with perfect tone, timing, and context at every stage.',   Icon: MessageSquare, color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/8' },
  { name: 'Operations', desc: 'Executes bookings, tracks confirmations, and re-routes supply chains when things go wrong.', Icon: Shield,       color: 'text-red-400',    border: 'border-red-400/20',   bg: 'bg-red-400/8' },
];

const STATS = [
  { value: '80%+',    label: 'Reduction in manual ops' },
  { value: '<2 min',  label: 'Quotation generation' },
  { value: '97%',     label: 'AI decision accuracy' },
  { value: '10×',     label: 'Scale without headcount' },
];

const ATTENTION_FEED = [
  { priority: 'CRITICAL', name: 'Meera Nair',     dest: 'Maldives',  value: '₹4,80,000', msg: 'Ready to close · AI confidence 91%',  color: 'text-red-400',   bar: 'bg-red-500' },
  { priority: 'ATTENTION', name: 'Arjun Mehta',   dest: 'Dubai',     value: '₹2,10,000', msg: 'Quote approved · Awaiting send',       color: 'text-[#C9A84C]', bar: 'bg-[#C9A84C]' },
  { priority: 'INFO',      name: 'TCS Corporate', dest: 'Thailand',  value: '₹18,40,000',msg: 'All confirmed · Zero action needed',   color: 'text-[#1D9E75]', bar: 'bg-[#1D9E75]' },
];

const DEMO_PRESETS: DemoPreset[] = [
  {
    slug: 'maldives-honeymoon',
    label: 'Maldives Honeymoon',
    query: 'Hi NAMA! We want a honeymoon in Maldives — 6 nights, luxury overwater villa, private beach. Budget ₹5L for 2 people. Flexible on dates in April.',
  },
  {
    slug: 'dubai-bleisure',
    label: 'Dubai Bleisure',
    query: 'Need 4 nights in Dubai for one executive traveler. Mix of meetings and leisure. Downtown hotel, airport transfers, one desert experience. Budget around ₹2L all-in.',
  },
  {
    slug: 'kerala-family',
    label: 'Kerala Family',
    query: 'Need a Kerala family trip for 5 days in June for 2 adults and 1 child. Want Munnar, Alleppey houseboat, and easy pacing. Budget about ₹1.2L total.',
  },
];

const DEMO_PREVIEWS: Record<string, DemoPreview> = {
  "maldives-honeymoon": {
    destination: "Maldives",
    duration: "6 Nights",
    travelers: "2 (Couple)",
    style: "Luxury",
    reply:
      "Perfect choice for a honeymoon! I have curated an exclusive 6-night Maldives escape at Soneva Jani — overwater bungalow, private lagoon, and infinity spa. Shall I send the full itinerary?",
  },
  "dubai-bleisure": {
    destination: "Dubai",
    duration: "4 Nights",
    travelers: "1 (Executive)",
    style: "Premium",
    reply:
      "I’ve prepared a premium Dubai business-leisure plan with Downtown stay, executive transfers, and a desert experience. Would you like the executive version or a softer leisure-heavy version?",
  },
  "kerala-family": {
    destination: "Kerala",
    duration: "5 Nights",
    travelers: "3 (Family)",
    style: "Comfort",
    reply:
      "I’ve mapped a relaxed Kerala family journey with Munnar hills, a private Alleppey houseboat, and child-friendly pacing. Would you like the standard or upgraded resort option?",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [query, setQuery] = useState("Hi NAMA! We want a honeymoon in Maldives — 6 nights, luxury overwater villa, private beach. Budget ₹5L for 2 people. Flexible on dates in April.");
  const [result, setResult] = useState({ destination: 'Maldives', duration: '6 Nights', travelers: '2 (Couple)', style: 'Luxury', reply: 'Perfect choice for a honeymoon! I have curated an exclusive 6-night Maldives escape at Soneva Jani — overwater bungalow, private lagoon, and infinity spa. Shall I send the full itinerary?' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('maldives-honeymoon');
  const [tick, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(t); }, []);

  async function loadPreset(slug: string) {
    const preset = DEMO_PRESETS.find((item) => item.slug === slug);
    if (preset) {
      setQuery(preset.query);
    }
    setSelectedPreset(slug);
    setLoading(true);
    setStatus("Loading demo case...");
    const localPreview = DEMO_PREVIEWS[slug];
    if (localPreview) {
      setResult(localPreview);
    }
    try {
      const r = await fetch(apiUrl(`/demo/triage/${slug}`));
      const data = await r.json();
      if (data.extracted_data) {
        setResult({
          destination: data.extracted_data.destination || 'Unknown',
          duration: `${data.extracted_data.duration_days} Nights`,
          travelers: `${data.extracted_data.travelers_count} ${data.extracted_data.travelers_count > 1 ? 'People' : 'Person'}`,
          style: data.extracted_data.style || 'Standard',
          reply: data.suggested_reply,
        });
        setStatus('Demo case loaded ✓');
      } else if (localPreview) {
        setStatus('Using local demo fallback ✓');
      }
    } catch {
      if (localPreview) {
        setResult(localPreview);
        setStatus('Using local demo fallback ✓');
      } else {
        setStatus('Demo case unavailable.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTriage() {
    setLoading(true); setStatus('Analyzing...');
    try {
      const r = await fetch(apiUrl('/queries/ingest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'DIRECT', content: query, sender_id: 'web-visitor', tenant_id: 1 }),
      });
      const data = await r.json();
      if (data.extracted_data) {
        setResult({ destination: data.extracted_data.destination || 'Unknown', duration: `${data.extracted_data.duration_days} Nights`, travelers: `${data.extracted_data.travelers_count} People`, style: data.extracted_data.style || 'Standard', reply: data.suggested_reply });
        setStatus('Extraction complete ✓');
      } else { setStatus('Extraction failed — backend responded but no data.'); }
    } catch { setStatus('Backend offline — using demo data.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8] font-body selection:bg-[#C9A84C] selection:text-[#0A0A0A]">

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#C9A84C]/10 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#C9A84C] rounded-lg flex items-center justify-center font-black text-[#0A0A0A] text-xs shadow-[0_0_12px_rgba(201,168,76,0.3)]">N</div>
            <span className="text-base font-black tracking-tighter font-headline text-[#F5F0E8] uppercase">NAMA</span>
          </Link>
          <SystemStatus />
        </div>
        <div className="hidden md:flex items-center gap-8 text-[11px] font-semibold text-[#B8B0A0]">
          <a href="#vision" className="hover:text-[#F5F0E8] transition-colors">Vision</a>
          <a href="#agents" className="hover:text-[#F5F0E8] transition-colors">Agents</a>
          <a href="#demo" className="hover:text-[#F5F0E8] transition-colors">Demo</a>
          <Link href="/kinetic" className="text-[#C9A84C] hover:opacity-80 transition-opacity flex items-center gap-1">
            Kinetic OS <Zap size={10} fill="currentColor" />
          </Link>
        </div>
        <Link
          href="/dashboard/autopilot"
          className="bg-[#C9A84C] text-[#0A0A0A] text-[11px] px-5 py-2.5 rounded-full font-black hover:opacity-90 transition-opacity shadow-[0_0_16px_rgba(201,168,76,0.2)] uppercase tracking-widest"
        >
          Open Demo OS
        </Link>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section id="vision" className="relative px-6 pt-28 pb-32 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9A84C]/4 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-[#1D9E75]/3 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-10 bg-[#C9A84C]/8 border border-[#C9A84C]/15 rounded-full">
            <Sparkles size={11} className="text-[#C9A84C]" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#C9A84C] font-mono">AI-Native Travel Operating System · Demo Ready</span>
          </div>

          <h1 className="text-[64px] md:text-[88px] font-black tracking-[-0.04em] leading-none mb-8 font-headline">
            Travel companies<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #C9A84C, #1D9E75, #C9A84C)' }}>
              don&apos;t run software.
            </span><br />
            Software runs them.
          </h1>

          <p className="text-lg text-[#B8B0A0] max-w-2xl mx-auto leading-relaxed mb-12 font-body">
            NAMA turns travel leads into structured demo cases, itineraries, quotes, and operator views. This build is designed to show the workflow clearly, fast, and safely.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-20">
            <Link
              href="/dashboard/autopilot"
              className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] text-sm px-8 py-4 rounded-full font-black hover:opacity-90 transition-opacity shadow-[0_0_24px_rgba(201,168,76,0.2)] uppercase tracking-widest"
            >
              <Zap size={14} fill="currentColor" /> Open Demo OS
            </Link>
            <Link
              href="/kinetic"
              className="flex items-center gap-2 bg-transparent border border-[#C9A84C]/20 text-[#C9A84C] text-sm px-8 py-4 rounded-full font-black hover:border-[#C9A84C]/40 transition-all uppercase tracking-widest"
            >
              View Control Room <ChevronRight size={14} />
            </Link>
            <Link
              href="/dashboard/deals?case=maldives-honeymoon"
              className="flex items-center gap-2 bg-transparent border border-white/10 text-[#F5F0E8] text-sm px-8 py-4 rounded-full font-black hover:border-[#C9A84C]/25 transition-all uppercase tracking-widest"
            >
              Open Maldives Case <ChevronRight size={14} />
            </Link>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#C9A84C]/10 rounded-3xl overflow-hidden border border-[#C9A84C]/10">
            {STATS.map(s => (
              <div key={s.label} className="bg-[#111111] py-8 px-6">
                <div className="text-3xl font-black font-mono text-[#C9A84C] mb-1">{s.value}</div>
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#4A453E]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── No-Workflow Concept ─────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#111111] border-y border-[#C9A84C]/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#C9A84C] mb-4">The Zero-Workflow Paradigm</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter font-headline mb-4">
              No tasks. No reminders.<br />No workflow.
            </h2>
            <p className="text-[#B8B0A0] max-w-xl mx-auto text-sm leading-relaxed font-body">
              Every CRM is built for humans to do work. NAMA is built for AI to do the work and bring you only what it can&apos;t handle alone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Old way */}
            <div className="bg-[#0A0A0A] rounded-3xl border border-white/5 p-8">
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-red-400 mb-6 font-black">Old Way — Every Travel CRM</div>
              <div className="space-y-3">
                {['Human creates lead in CRM', 'Human calls to qualify', 'Human builds itinerary manually', 'Human sends quote via email', 'Human chases payment', 'Human coordinates vendors', 'Human follows up 3× after booking'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-[11px] text-[#4A453E] font-body">
                    <span className="text-[8px] font-mono text-red-500 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="line-through">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/5 text-[10px] font-mono text-red-400 font-black uppercase tracking-widest">
                Software = passive tool
              </div>
            </div>

            {/* NAMA way */}
            <div className="bg-[#0A0A0A] rounded-3xl border border-[#C9A84C]/15 p-8 relative overflow-hidden shadow-[0_0_40px_rgba(201,168,76,0.06)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C]/3 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#C9A84C] mb-6 font-black">NAMA Way — Autonomous OS</div>
                {/* Attention feed preview */}
                <div className="space-y-3 mb-6">
                  {ATTENTION_FEED.map((item, i) => (
                    <div key={i} className="relative bg-[#111111] rounded-xl border border-[#C9A84C]/10 overflow-hidden flex items-center gap-4 p-3">
                      <div className={`absolute left-0 inset-y-0 w-[2px] ${item.bar}`} />
                      <div className="pl-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[7px] font-black font-mono uppercase tracking-widest ${item.color}`}>{item.priority}</span>
                          <span className="text-[8px] text-[#4A453E] font-body truncate">{item.name} · {item.dest}</span>
                        </div>
                        <div className="text-[9px] text-[#B8B0A0] font-body">{item.msg}</div>
                      </div>
                      <span className="text-[9px] font-mono font-black text-[#F5F0E8] shrink-0">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-4 border-t border-[#C9A84C]/10 text-[10px] font-mono text-[#C9A84C] font-black uppercase tracking-widest">
                  Software = autonomous operator
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Agent Swarm ────────────────────────────────────────────── */}
      <section id="agents" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#C9A84C] mb-4">The Agent Swarm</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter font-headline mb-4">
              6 AI agents.<br />One travel company.
            </h2>
            <p className="text-[#B8B0A0] max-w-xl mx-auto text-sm leading-relaxed font-body">
              Each agent specializes in one domain. Together, they run an entire travel operation without a single human workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENTS.map(agent => (
              <div key={agent.name} className={`bg-[#111111] rounded-2xl border ${agent.border} p-6 hover:shadow-[0_0_20px_rgba(201,168,76,0.08)] transition-all group`}>
                <div className={`w-10 h-10 rounded-xl ${agent.bg} border ${agent.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <agent.Icon size={18} className={agent.color} />
                </div>
                <div className={`text-xs font-black font-mono uppercase tracking-widest mb-2 ${agent.color}`}>{agent.name} Agent</div>
                <p className="text-[11px] text-[#B8B0A0] leading-relaxed font-body">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demo ───────────────────────────────────────────────── */}
      <section id="demo" className="py-24 px-6 bg-[#111111] border-y border-[#C9A84C]/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#C9A84C] mb-4">Live AI Playground</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter font-headline mb-3">
              See the triage flow in one click.
            </h2>
            <p className="text-[#B8B0A0] text-sm font-body">Use the presets to load a deterministic demo case instantly, or type your own request and run the same flow.</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-3xl border border-[#C9A84C]/15 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#C9A84C]/10 bg-[#111111]">
              <div className="flex gap-2">
                {['bg-red-500', 'bg-[#C9A84C]', 'bg-[#1D9E75]'].map((c, i) => <div key={i} className={`w-2.5 h-2.5 rounded-full ${c} opacity-70`} />)}
              </div>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#4A453E] font-mono">NAMA Triage Playground</div>
              <div className="text-[8px] font-mono text-[#4A453E] tabular-nums">
                {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-0">
              {/* Input */}
              <div className="p-8 border-r border-[#C9A84C]/10">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E] font-black mb-3">1. Load a demo case or type a query</div>
                <div className="mb-4 rounded-2xl border border-[#C9A84C]/10 bg-[#111111] px-4 py-3 text-[10px] text-[#B8B0A0] leading-relaxed">
                  The presets are the fastest path for Monday. They load the same deterministic case every time and fall back safely if the backend is unreachable.
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {DEMO_PRESETS.map((preset) => (
                    <button
                      key={preset.slug}
                      onClick={() => loadPreset(preset.slug)}
                      className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-colors ${
                        selectedPreset === preset.slug
                          ? 'border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#C9A84C]'
                          : 'border-[#C9A84C]/10 bg-[#111111] text-[#B8B0A0] hover:text-[#F5F0E8]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="mb-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#4A453E] font-mono">
                  <span className="h-px flex-1 bg-white/5" />
                  One click, then review the output
                  <span className="h-px flex-1 bg-white/5" />
                </div>
                <div className="bg-[#111111] rounded-2xl border border-[#C9A84C]/10 focus-within:border-[#C9A84C]/30 transition-colors p-4 relative">
                  <textarea
                    className="w-full bg-transparent border-none outline-none text-[11px] font-body h-36 resize-none text-[#F5F0E8] placeholder:text-[#4A453E]"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Type any travel request..."
                  />
                  <button
                    onClick={handleTriage}
                    disabled={loading}
                    className="absolute bottom-3 right-3 bg-[#C9A84C] text-[#0A0A0A] px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Bot size={10} /> {loading ? 'Processing...' : 'Run Demo'}
                  </button>
                </div>
                {status && (
                  <div className={`mt-3 text-[9px] font-mono font-black uppercase tracking-widest ${status.includes('fail') || status.includes('offline') ? 'text-red-400' : 'text-[#1D9E75]'}`}>
                    {status}
                  </div>
                )}
              </div>

              {/* Output */}
              <div className="p-8">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E] font-black mb-3">2. AI Extraction Output</div>
                <div className="space-y-3 mb-5">
                  {[
                    { label: 'Destination', value: result.destination },
                    { label: 'Duration',    value: result.duration },
                    { label: 'Travelers',   value: result.travelers },
                    { label: 'Style',       value: result.style },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-[#C9A84C]/8">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{row.label}</span>
                      <span className="text-[11px] font-bold text-[#F5F0E8] font-body">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#111111] rounded-xl border border-[#C9A84C]/10 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Bot size={10} className="text-[#C9A84C]" />
                    <span className="text-[8px] font-mono uppercase tracking-widest text-[#C9A84C] font-black">AI Suggested Reply</span>
                  </div>
                  <p className="text-[10px] text-[#B8B0A0] leading-relaxed font-body italic">&ldquo;{result.reply}&rdquo;</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C9A84C]/4 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#C9A84C] mb-6">Define a category</div>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter font-headline mb-6">
            Run your travel business<br />without running every step manually.
          </h2>
          <p className="text-[#B8B0A0] text-base mb-10 font-body">
            This demo shows how a lead becomes a structured case, a quote, and an operator view in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/autopilot"
              className="flex items-center justify-center gap-2 bg-[#C9A84C] text-[#0A0A0A] px-10 py-4 rounded-full font-black text-sm hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(201,168,76,0.2)] uppercase tracking-widest"
            >
              <Zap size={14} fill="currentColor" /> Enter NAMA OS
            </Link>
            <Link
              href="/kinetic"
              className="flex items-center justify-center gap-2 border border-[#C9A84C]/20 text-[#C9A84C] px-10 py-4 rounded-full font-black text-sm hover:border-[#C9A84C]/40 transition-all uppercase tracking-widest"
            >
              Kinetic Engine <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-[#C9A84C]/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-[#C9A84C] rounded-md flex items-center justify-center font-black text-[#0A0A0A] text-[10px]">N</div>
            <span className="font-black text-sm text-[#F5F0E8] uppercase font-headline tracking-tighter">NAMA Travel OS</span>
          </div>
          <div className="flex gap-8 text-[11px] text-[#4A453E] font-semibold">
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Compliance', href: '/compliance' },
              { label: 'Contact', href: '/contact' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="hover:text-[#B8B0A0] transition-colors">{item.label}</Link>
            ))}
          </div>
          <div className="text-[10px] text-[#4A453E] font-mono">© 2026 NAMA Networks · All rights reserved</div>
        </div>
      </footer>
    </div>
  );
}
