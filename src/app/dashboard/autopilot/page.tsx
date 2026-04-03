"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DEFAULT_DEMO_PROFILE, readDemoProfile } from '@/lib/demo-profile';
import {
  Zap, AlertTriangle, CheckCircle, Clock, TrendingUp,
  ArrowRight, Play, Pause, Eye, Activity, Brain, Target,
  Shield, Circle, Sparkles, Bot, PhoneCall, MessageSquare,
  CreditCard, MapPin, X, MoreHorizontal, ChevronRight,
  Users, DollarSign, BarChart3, RefreshCw
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD = '#C9A84C';
const TEAL = '#1D9E75';
const SURFACE = '#111111';
const SURFACE2 = '#1A1A1A';
const OFF_WHITE = '#F5F0E8';
const MUTED = '#B8B0A0';
const FAINT = '#4A453E';

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = 'CRITICAL' | 'ATTENTION' | 'INFO';
type AgentState = 'RUNNING' | 'IDLE' | 'ALERT' | 'PAUSED';

interface FeedItem {
  id: number;
  priority: Priority;
  name: string;
  destination: string;
  value: string;
  headline: string;
  subtext: string;
  cta: string;
  ctaType: 'call' | 'payment' | 'approve' | 'review';
  confidence: number;
  ago: string;
  leadId: number;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  state: AgentState;
  done: number;
  current: string;
  Icon: React.ElementType;
}

// ─── Static data ─────────────────────────────────────────────────────────────
const FEED_DATA: FeedItem[] = [
  {
    id: 1,
    priority: 'CRITICAL',
    name: 'Meera Nair',
    destination: 'Maldives Honeymoon',
    value: '₹4,86,000',
    headline: 'Website enquiry captured and staged for the quote-to-close walkthrough.',
    subtext: 'Use this card to open the deal view, then show triage, itinerary, finance, and the CRM transcript in one flow.',
    cta: 'Open Deal',
    ctaType: 'call',
    confidence: 91,
    ago: 'Just now',
    leadId: 1,
  },
  {
    id: 3,
    priority: 'ATTENTION',
    name: 'Arjun Mehta',
    destination: 'Dubai Bleisure',
    value: '₹2,12,000',
    headline: 'Phone-captured executive lead is staged with a premium business + leisure blend.',
    subtext: 'Perfect for showing a quote that feels tailored, fast, and still margin aware.',
    cta: 'Approve & Send',
    ctaType: 'approve',
    confidence: 89,
    ago: '2m ago',
    leadId: 3,
  },
  {
    id: 2,
    priority: 'CRITICAL',
    name: 'Sharma Family',
    destination: 'Kerala Family',
    value: '₹1,24,000',
    headline: 'Email-captured family request is staged with pacing, houseboat, and reminder context.',
    subtext: 'This is the backup story if you want to show a slower booking path that still converts.',
    cta: 'Send Reminder',
    ctaType: 'payment',
    confidence: 90,
    ago: '5m ago',
    leadId: 2,
  },
];

const AGENTS: Agent[] = [
  { id: 'triage',     name: 'Triage',     role: 'Lead Qualification',    state: 'RUNNING', done: 47, current: 'Parsing 2 new WhatsApp leads',        Icon: Brain },
  { id: 'itinerary',  name: 'Itinerary',  role: 'Trip Architecture',     state: 'RUNNING', done: 12, current: 'Building the Maldives honeymoon draft', Icon: MapPin },
  { id: 'bidding',    name: 'Bidding',    role: 'Vendor Negotiation',    state: 'ALERT',   done: 8,  current: 'Holding a Dubai fallback rate if needed', Icon: Target },
  { id: 'finance',    name: 'Finance',    role: 'Payments & Ledger',     state: 'IDLE',    done: 31, current: 'Awaiting next transaction event',       Icon: CreditCard },
  { id: 'comms',      name: 'Comms',      role: 'Client Messaging',      state: 'RUNNING', done: 63, current: 'Staging WhatsApp, email, and call follow-ups', Icon: MessageSquare },
  { id: 'operations', name: 'Operations', role: 'Booking Execution',     state: 'RUNNING', done: 19, current: 'Confirming Maldives speed boat hold',       Icon: Shield },
];

// ─── Priority config ──────────────────────────────────────────────────────────
const P_CFG = {
  CRITICAL:  { bar: 'bg-red-500',   badge: 'text-red-400 bg-red-500/10 border-red-500/20',           dot: 'bg-red-500' },
  ATTENTION: { bar: 'bg-[#C9A84C]', badge: 'text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/20',   dot: 'bg-[#C9A84C]' },
  INFO:      { bar: 'bg-[#1D9E75]', badge: 'text-[#1D9E75] bg-[#1D9E75]/10 border-[#1D9E75]/20',   dot: 'bg-[#1D9E75]' },
};

const AGENT_CFG = {
  RUNNING: { color: 'text-[#1D9E75]', bg: 'bg-[#1D9E75]/10', ring: 'ring-[#1D9E75]/20', pulse: true },
  IDLE:    { color: 'text-[#4A453E]', bg: 'bg-[#4A453E]/10', ring: 'ring-[#4A453E]/10', pulse: false },
  ALERT:   { color: 'text-red-400',   bg: 'bg-red-500/10',   ring: 'ring-red-500/20',   pulse: true },
  PAUSED:  { color: 'text-[#C9A84C]', bg: 'bg-[#C9A84C]/10', ring: 'ring-[#C9A84C]/20', pulse: false },
};

const CTA_ICON = { call: PhoneCall, payment: CreditCard, approve: CheckCircle, review: Eye };

// ─── Sub-components ───────────────────────────────────────────────────────────
function LiveTicker() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(t); }, []);
  const d = new Date();
  return (
    <span className="text-[10px] font-mono text-[#4A453E] tabular-nums">
      {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? TEAL : value >= 60 ? GOLD : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono font-black" style={{ color }}>{value}%</span>
    </div>
  );
}

function FeedCard({ item, onDismiss, onFocus }: { item: FeedItem; onDismiss: (id: number) => void; onFocus: () => void }) {
  const p = P_CFG[item.priority];
  const CtaIcon = CTA_ICON[item.ctaType];
  return (
    <div className="relative bg-[#111111] rounded-2xl border border-[#C9A84C]/10 overflow-hidden hover:border-[#C9A84C]/25 transition-all duration-300 group">
      <div className={`absolute left-0 inset-y-0 w-[3px] ${p.bar}`} />
      <div className="pl-6 pr-5 py-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className={`text-[9px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border font-mono ${p.badge}`}>
                {item.priority}
              </span>
              <span className="text-[9px] font-mono text-[#4A453E]">{item.ago}</span>
              <span className="ml-auto text-sm font-black font-mono text-[#F5F0E8]">{item.value}</span>
            </div>
            {/* Name + route */}
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-bold text-[#F5F0E8] font-body text-sm">{item.name}</span>
              <span className="text-[10px] text-[#4A453E] font-mono">·</span>
              <span className="text-[10px] text-[#B8B0A0] font-mono">{item.destination}</span>
            </div>
            {/* Headline */}
            <p className="text-[11px] font-semibold text-[#F5F0E8] leading-snug mb-1 font-body">{item.headline}</p>
            <p className="text-[10px] text-[#B8B0A0] leading-relaxed mb-4 font-body">{item.subtext}</p>
            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/deals?lead=${item.leadId}`}
                onClick={onFocus}
                className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(201,168,76,0.2)] shrink-0"
              >
                <CtaIcon size={11} />
                {item.cta}
              </Link>
              <button onClick={onFocus} className="text-[9px] font-mono text-[#4A453E] hover:text-[#B8B0A0] transition-colors flex items-center gap-1 uppercase tracking-widest">
                Full context <ChevronRight size={10} />
              </button>
              <div className="ml-auto">
                <ConfidenceBar value={item.confidence} />
              </div>
            </div>
          </div>
          <button onClick={() => onDismiss(item.id)} className="text-[#4A453E] hover:text-[#B8B0A0] transition-colors shrink-0 mt-0.5">
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const cfg = AGENT_CFG[agent.state];
  const { Icon } = agent;
  return (
    <div className="bg-[#111111] rounded-2xl border border-[#C9A84C]/10 p-4 hover:border-[#C9A84C]/25 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border border-[#C9A84C]/10 ring-4 ${cfg.ring} bg-[#1A1A1A] group-hover:scale-110 transition-transform`}>
          <Icon size={16} className="text-[#C9A84C]" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.color.replace('text-', 'bg-').replace('[', '[').replace(']', ']')} ${agent.state === 'RUNNING' || agent.state === 'ALERT' ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: agent.state === 'RUNNING' ? TEAL : agent.state === 'ALERT' ? '#ef4444' : agent.state === 'PAUSED' ? GOLD : FAINT }}
          />
          <span className={`text-[8px] font-mono font-black uppercase tracking-widest ${cfg.color}`}>{agent.state}</span>
        </div>
      </div>
      <div className="text-xs font-black text-[#F5F0E8] font-body mb-0.5">{agent.name} Agent</div>
      <div className="text-[9px] text-[#4A453E] uppercase tracking-widest font-mono mb-2">{agent.role}</div>
      <div className="text-[10px] text-[#B8B0A0] leading-relaxed mb-3 min-h-[28px] font-body">{agent.current}</div>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono text-[#4A453E]">
          <span className="text-[#C9A84C] font-black text-sm tabular-nums">{agent.done}</span> done today
        </span>
        <button className="text-[#4A453E] hover:text-[#C9A84C] transition-colors">
          <MoreHorizontal size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AutopilotPage() {
  const profile = readDemoProfile();
  const [autopilot, setAutopilot] = useState(true);
  const [feed, setFeed] = useState(FEED_DATA);
  const [selectedFocus, setSelectedFocus] = useState(FEED_DATA[0]);
  const critical = feed.filter(i => i.priority === 'CRITICAL').length;
  const visibleCompany = profile.company || DEFAULT_DEMO_PROFILE.company;
  const visibleRoles = profile.roles.length ? profile.roles.join(' + ') : DEFAULT_DEMO_PROFILE.roles.join(' + ');

  function dismiss(id: number) { setFeed(prev => prev.filter(i => i.id !== id)); }

  return (
    <div className="space-y-7 animate-in fade-in duration-700 pb-16">

      {/* ── Top header ──────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Zap size={12} className="text-[#C9A84C]" fill="currentColor" />
            <span className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-[#C9A84C]">NAMA Autopilot OS</span>
            <span className="w-px h-3 bg-[#C9A84C]/20" />
            <LiveTicker />
          </div>
          <h1 className="text-[40px] font-black tracking-[-0.04em] text-[#F5F0E8] font-headline uppercase leading-none">
            Command Center
          </h1>
          <p className="text-[#4A453E] mt-2 text-[11px] font-mono uppercase tracking-widest">
            Seeded demo cases are driving the walkthrough · You only see what needs your attention
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
              {visibleCompany}
            </span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
              {visibleRoles}
            </span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
              {profile.market.country} · {profile.baseCurrency} · {profile.market.gateway}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              'Website intake',
              'Phone transcript',
              'Email capture',
              'WhatsApp placeholder',
            ].map((tag) => (
              <span key={tag} className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: 'Maldives', href: '/dashboard/deals?case=maldives-honeymoon' },
              { label: 'Dubai', href: '/dashboard/deals?case=dubai-bleisure' },
              { label: 'Kerala', href: '/dashboard/deals?case=kerala-family' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0] hover:text-[#F5F0E8] hover:border-[#C9A84C]/30 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Autopilot toggle */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#4A453E] mb-0.5">System Mode</div>
            <div className={`text-[10px] font-black font-mono uppercase tracking-widest ${autopilot ? 'text-[#1D9E75]' : 'text-[#C9A84C]'}`}>
              {autopilot ? '⬤ Autopilot Active' : '⬤ Manual Mode'}
            </div>
          </div>
          <button
            onClick={() => setAutopilot(!autopilot)}
            aria-label="Toggle autopilot"
            className={`relative w-14 h-7 rounded-full border-2 transition-all duration-300 ${
              autopilot
                ? 'bg-[#1D9E75]/10 border-[#1D9E75]/40 shadow-[0_0_20px_rgba(29,158,117,0.2)]'
                : 'bg-[#1A1A1A] border-[#C9A84C]/20'
            }`}
          >
            <span className={`absolute top-[3px] w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-300 ${
              autopilot ? 'translate-x-7 bg-[#1D9E75]' : 'translate-x-[3px] bg-[#4A453E]'
            }`}>
              {autopilot ? <Play size={9} className="text-white" fill="white" /> : <Pause size={9} className="text-white" />}
            </span>
          </button>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pipeline Value',    value: '₹32,10,000', Icon: TrendingUp,   glow: 'shadow-[0_0_20px_rgba(201,168,76,0.06)]',  color: 'text-[#C9A84C]' },
          { label: "Today's Revenue",   value: '₹8,40,000',  Icon: DollarSign,   glow: 'shadow-[0_0_20px_rgba(29,158,117,0.06)]',  color: 'text-[#1D9E75]' },
          { label: 'Critical Alerts',   value: `${critical} Now`,  Icon: AlertTriangle, glow: '',                                   color: critical > 0 ? 'text-red-400' : 'text-[#4A453E]' },
          { label: 'AI Actions Today',  value: '147 Done',   Icon: Bot,          glow: '',                                          color: 'text-[#C9A84C]' },
        ].map(k => (
          <div key={k.label} className={`bg-[#111111] rounded-2xl border border-[#C9A84C]/10 p-5 ${k.glow}`}>
            <div className="flex items-center gap-2 mb-3">
              <k.Icon size={13} className={k.color} />
              <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#4A453E]">{k.label}</span>
            </div>
            <div className={`text-xl font-black font-mono ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Main 2-col layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-7">

        {/* Attention Feed ── 2 cols */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity size={13} className="text-[#C9A84C]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F5F0E8] font-mono">Attention Feed</span>
              {critical > 0 && (
                <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full font-mono animate-pulse">
                  {critical} CRITICAL
                </span>
              )}
            </div>
            <div className="text-[9px] font-mono text-[#4A453E] uppercase tracking-widest flex items-center gap-1">
              Active focus: <span className="text-[#C9A84C]">{selectedFocus.name}</span>
            </div>
          </div>

          <div className="bg-[#111111] rounded-2xl border border-[#C9A84C]/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9A84C] font-mono">Current autopilot focus</div>
                <div className="mt-2 text-lg font-black text-[#F5F0E8]">{selectedFocus.name} · {selectedFocus.destination}</div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{selectedFocus.value} · confidence {selectedFocus.confidence}%</div>
              </div>
              <Link
                href={`/dashboard/deals?lead=${selectedFocus.leadId}`}
                className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors"
              >
                Open Case
              </Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FocusTile label="What autopilot sees" value={selectedFocus.headline} />
              <FocusTile label="Why it matters" value={selectedFocus.subtext} />
              <FocusTile label="Next operator move" value={selectedFocus.cta} />
            </div>
          </div>

          {feed.length === 0 ? (
            <div className="bg-[#111111] rounded-2xl border border-[#1D9E75]/15 p-16 text-center">
              <CheckCircle size={28} className="text-[#1D9E75] mx-auto mb-3" />
              <div className="text-[#1D9E75] font-black font-mono uppercase tracking-widest text-xs mb-1">All Clear</div>
              <div className="text-[#4A453E] text-[10px] font-body">AI is handling everything. No human action required.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map(item => <FeedCard key={item.id} item={item} onDismiss={dismiss} onFocus={() => setSelectedFocus(item)} />)}
            </div>
          )}

          {/* Zero-UI hint */}
            <div className="bg-[#111111]/40 rounded-xl border border-[#C9A84C]/5 p-4 flex items-center gap-3 mt-2">
              <MessageSquare size={13} className="text-[#C9A84C] shrink-0" />
              <p className="text-[10px] text-[#4A453E] font-body leading-relaxed">
              In the demo, this alert pattern is what would later surface in <span className="text-[#C9A84C] font-bold">WhatsApp</span> or <span className="text-[#C9A84C] font-bold">mobile push</span>. For Monday, we keep it on-screen so the walkthrough stays stable and deterministic.
              </p>
            </div>
        </div>

        {/* Agent Swarm ── 1 col */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Bot size={13} className="text-[#C9A84C]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F5F0E8] font-mono">Agent Swarm</span>
            <span className="ml-auto text-[8px] font-mono text-[#1D9E75] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse inline-block" />
              {AGENTS.filter(a => a.state === 'RUNNING').length}/{AGENTS.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {AGENTS.map(a => <AgentCard key={a.id} agent={a} />)}
          </div>

          {/* Kinetic CTA */}
          <Link
            href="/kinetic"
            className="flex items-center justify-between bg-gradient-to-r from-[#C9A84C] to-[#B89840] text-[#0A0A0A] rounded-2xl p-5 hover:opacity-95 transition-opacity shadow-[0_0_24px_rgba(201,168,76,0.12)] group mt-1"
          >
            <div>
              <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#0A0A0A]/50 mb-0.5">Deep Dive</div>
              <div className="font-black text-sm uppercase tracking-tight">Kinetic Demo OS</div>
              <div className="text-[8px] font-mono text-[#0A0A0A]/60 mt-0.5">Operational demo monitor</div>
            </div>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FocusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-2 text-sm leading-relaxed text-[#F5F0E8]">{value}</div>
    </div>
  );
}
