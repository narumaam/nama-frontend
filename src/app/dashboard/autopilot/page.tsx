"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap, AlertTriangle, CheckCircle, Clock, TrendingUp,
  DollarSign, Users, ArrowRight, Play, Pause, Eye,
  ChevronRight, Activity, Brain, Target, Shield,
  Wifi, Circle, MoreHorizontal, Sparkles, Bot,
  PhoneCall, MessageSquare, CreditCard, MapPin, X
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type AgentStatus = 'RUNNING' | 'IDLE' | 'ALERT' | 'PAUSED';

interface AttentionItem {
  id: number;
  priority: Priority;
  name: string;
  route: string;
  value: string;
  message: string;
  action: string;
  actionType: 'call' | 'payment' | 'approve' | 'review';
  timeAgo: string;
  confidence: number;
}

interface AgentCard {
  name: string;
  role: string;
  status: AgentStatus;
  tasksDone: number;
  currentTask: string;
  icon: React.ElementType;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const attentionFeed: AttentionItem[] = [
  {
    id: 1,
    priority: 'HIGH',
    name: 'Meera Nair',
    route: 'Maldives Overwater',
    value: '₹4,80,000',
    message: 'Client viewed itinerary 3 times in 2 hrs. Probability surged to 91%. Strike now.',
    action: 'Call Client',
    actionType: 'call',
    timeAgo: '4 min ago',
    confidence: 91,
  },
  {
    id: 2,
    priority: 'HIGH',
    name: 'Sharma Family',
    route: 'Kerala Backwaters',
    value: '₹1,20,000',
    message: 'Payment of ₹60,000 pending for 26 hours. Risk of trip cancellation is rising.',
    action: 'Send Reminder',
    actionType: 'payment',
    timeAgo: '26 min ago',
    confidence: 72,
  },
  {
    id: 3,
    priority: 'MEDIUM',
    name: 'Arjun Mehta',
    route: 'Dubai Business + Leisure',
    value: '₹2,10,000',
    message: 'Itinerary ready. AI has drafted a personalized quote. Awaiting your approval to send.',
    action: 'Approve & Send',
    actionType: 'approve',
    timeAgo: '1 hr ago',
    confidence: 84,
  },
  {
    id: 4,
    priority: 'MEDIUM',
    name: 'Priya Krishnan',
    route: 'Bali Honeymoon',
    value: '₹3,60,000',
    message: 'Competitor quoted ₹3.2L. AI recommends value-add (complimentary spa) to hold margin.',
    action: 'Review Strategy',
    actionType: 'review',
    timeAgo: '2 hr ago',
    confidence: 68,
  },
  {
    id: 5,
    priority: 'LOW',
    name: 'TCS Corporate Batch',
    route: 'Thailand Team Offsite',
    value: '₹18,40,000',
    message: 'Vendor confirmation for 3 hotels received. Trip fully confirmed. No action needed.',
    action: 'View Details',
    actionType: 'review',
    timeAgo: '3 hr ago',
    confidence: 99,
  },
];

const agents: AgentCard[] = [
  { name: 'Triage', role: 'Lead Qualification', status: 'RUNNING', tasksDone: 47, currentTask: 'Classifying 2 new WhatsApp leads', icon: Brain },
  { name: 'Itinerary', role: 'Trip Design', status: 'RUNNING', tasksDone: 12, currentTask: 'Building 7D Rajasthan Royal plan', icon: MapPin },
  { name: 'Bidding', role: 'Vendor Negotiation', status: 'ALERT', tasksDone: 8, currentTask: 'Hyatt Dubai unresponsive >4h', icon: Target },
  { name: 'Finance', role: 'Payments & Ledger', status: 'IDLE', tasksDone: 31, currentTask: 'Awaiting next transaction', icon: CreditCard },
  { name: 'Comms', role: 'Client Messaging', status: 'RUNNING', tasksDone: 63, currentTask: 'Sending 3 follow-up messages', icon: MessageSquare },
  { name: 'Operations', role: 'Booking Execution', status: 'RUNNING', tasksDone: 19, currentTask: 'Confirming Maldives transfers', icon: Shield },
];

// ─── Sub-Components ───────────────────────────────────────────────────────────
const priorityConfig: Record<Priority, { bar: string; badge: string; label: string }> = {
  HIGH:   { bar: 'bg-red-500',     badge: 'bg-red-500/10 text-red-400 border-red-500/20',    label: 'CRITICAL' },
  MEDIUM: { bar: 'bg-[#C9A84C]',   badge: 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20', label: 'ATTENTION' },
  LOW:    { bar: 'bg-[#1D9E75]',   badge: 'bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/20', label: 'INFO' },
};

const actionIcon: Record<string, React.ElementType> = {
  call: PhoneCall,
  payment: CreditCard,
  approve: CheckCircle,
  review: Eye,
};

function AttentionCard({ item, onDismiss }: { item: AttentionItem; onDismiss: (id: number) => void }) {
  const cfg = priorityConfig[item.priority];
  const ActionIcon = actionIcon[item.actionType];

  return (
    <div className="relative bg-[#111111] rounded-2xl border border-[#C9A84C]/10 overflow-hidden hover:border-[#C9A84C]/30 transition-all group">
      {/* Priority bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar} rounded-l-2xl`} />
      
      <div className="pl-5 pr-4 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[9px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border font-mono ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-[#4A453E] font-mono">{item.timeAgo}</span>
            </div>
            
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-bold text-[#F5F0E8] font-body">{item.name}</span>
              <span className="text-[11px] text-[#B8B0A0] font-mono">·</span>
              <span className="text-[11px] text-[#B8B0A0] font-mono truncate">{item.route}</span>
            </div>

            <p className="text-xs text-[#B8B0A0] leading-relaxed mb-3 font-body">{item.message}</p>

            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/deals?lead=${item.id}`}
                className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(201,168,76,0.2)]"
              >
                <ActionIcon size={12} />
                {item.action}
              </Link>
              <div className="text-[10px] font-mono text-[#4A453E] flex items-center gap-1">
                <Sparkles size={10} className="text-[#C9A84C]" />
                AI confidence: <span className="text-[#C9A84C] font-bold">{item.confidence}%</span>
              </div>
              <span className="ml-auto text-sm font-black font-mono text-[#F5F0E8]">{item.value}</span>
            </div>
          </div>

          <button
            onClick={() => onDismiss(item.id)}
            className="text-[#4A453E] hover:text-[#B8B0A0] transition-colors mt-0.5 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const agentStatusConfig: Record<AgentStatus, { dot: string; label: string; ring: string }> = {
  RUNNING: { dot: 'bg-[#1D9E75]', label: 'RUNNING',  ring: 'ring-[#1D9E75]/20' },
  IDLE:    { dot: 'bg-[#4A453E]', label: 'IDLE',     ring: 'ring-[#4A453E]/20' },
  ALERT:   { dot: 'bg-red-500',   label: 'ALERT',    ring: 'ring-red-500/20' },
  PAUSED:  { dot: 'bg-[#C9A84C]', label: 'PAUSED',   ring: 'ring-[#C9A84C]/20' },
};

function AgentStatusCard({ agent }: { agent: AgentCard }) {
  const cfg = agentStatusConfig[agent.status];
  const Icon = agent.icon;

  return (
    <div className="bg-[#111111] rounded-2xl border border-[#C9A84C]/10 p-5 hover:border-[#C9A84C]/25 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#1A1A1A] border border-[#C9A84C]/10 ring-4 ${cfg.ring} group-hover:scale-110 transition-transform`}>
          <Icon size={18} className="text-[#C9A84C]" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${agent.status === 'RUNNING' ? 'animate-pulse' : ''}`} />
          <span className="text-[9px] font-mono font-black text-[#4A453E] uppercase tracking-widest">{cfg.label}</span>
        </div>
      </div>

      <div className="text-sm font-black text-[#F5F0E8] font-body mb-0.5">{agent.name} Agent</div>
      <div className="text-[10px] text-[#4A453E] uppercase tracking-widest font-mono mb-3">{agent.role}</div>

      <div className="text-[11px] text-[#B8B0A0] leading-relaxed mb-3 min-h-[32px]">{agent.currentTask}</div>

      <div className="flex items-center justify-between">
        <div className="text-[9px] font-mono text-[#4A453E]">
          <span className="text-[#C9A84C] font-black text-sm">{agent.tasksDone}</span> tasks today
        </div>
        <button className="text-[#4A453E] hover:text-[#C9A84C] transition-colors">
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AutopilotPage() {
  const [autopilotOn, setAutopilotOn] = useState(true);
  const [feed, setFeed] = useState(attentionFeed);
  const [ticker, setTicker] = useState(0);

  // Simulate live ticker
  useEffect(() => {
    const t = setInterval(() => setTicker(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const totalPipelineValue = '₹32,10,000';
  const todayRevenue = '₹8,40,000';
  const hotLeads = feed.filter(i => i.priority === 'HIGH').length;

  function dismiss(id: number) {
    setFeed(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Zap size={14} className="text-[#C9A84C]" fill="currentColor" />
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[#C9A84C]">
              Autopilot OS — {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="w-px h-3 bg-[#C9A84C]/30" />
            <span className="text-[10px] font-mono text-[#4A453E]">Tick #{ticker}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-[#F5F0E8] font-headline uppercase">
            Command Center
          </h1>
          <p className="text-[#4A453E] mt-1 text-sm font-body">
            AI is operating your business. You only see what needs you.
          </p>
        </div>

        {/* Autopilot toggle */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E] mb-0.5">System Mode</div>
            <div className={`text-xs font-black font-mono uppercase ${autopilotOn ? 'text-[#1D9E75]' : 'text-[#C9A84C]'}`}>
              {autopilotOn ? 'Autopilot Active' : 'Manual Mode'}
            </div>
          </div>
          <button
            onClick={() => setAutopilotOn(!autopilotOn)}
            className={`relative w-14 h-7 rounded-full border transition-all duration-300 ${
              autopilotOn
                ? 'bg-[#1D9E75]/20 border-[#1D9E75]/40 shadow-[0_0_16px_rgba(29,158,117,0.3)]'
                : 'bg-[#1A1A1A] border-[#C9A84C]/20'
            }`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center ${
              autopilotOn
                ? 'translate-x-7 bg-[#1D9E75]'
                : 'translate-x-0.5 bg-[#4A453E]'
            }`}>
              {autopilotOn ? <Play size={10} className="text-white" /> : <Pause size={10} className="text-white" />}
            </span>
          </button>
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pipeline Value', value: totalPipelineValue, icon: TrendingUp, color: 'text-[#C9A84C]', glow: 'shadow-[0_0_20px_rgba(201,168,76,0.1)]' },
          { label: "Today's Revenue", value: todayRevenue, icon: DollarSign, color: 'text-[#1D9E75]', glow: 'shadow-[0_0_20px_rgba(29,158,117,0.1)]' },
          { label: 'Needs Attention', value: `${hotLeads} Alerts`, icon: AlertTriangle, color: 'text-red-400', glow: '' },
          { label: 'AI Actions Today', value: '147 Done', icon: Bot, color: 'text-[#C9A84C]', glow: '' },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-[#111111] rounded-2xl border border-[#C9A84C]/10 p-5 ${kpi.glow}`}>
            <div className="flex items-center gap-2 mb-3">
              <kpi.icon size={14} className={kpi.color} />
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E]">{kpi.label}</span>
            </div>
            <div className={`text-2xl font-black font-mono ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── Main Layout: Feed + Agents ─────────────────────── */}
      <div className="grid grid-cols-3 gap-8 pb-12">

        {/* Attention Feed (2/3) */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#C9A84C]" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#F5F0E8] font-mono">
                Attention Feed
              </span>
              {feed.filter(i => i.priority === 'HIGH').length > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono">
                  {feed.filter(i => i.priority === 'HIGH').length} CRITICAL
                </span>
              )}
            </div>
            <button className="text-[10px] font-mono text-[#4A453E] hover:text-[#C9A84C] transition-colors uppercase tracking-widest flex items-center gap-1">
              Approve All Low Risk <ChevronRight size={12} />
            </button>
          </div>

          {feed.length === 0 ? (
            <div className="bg-[#111111] rounded-2xl border border-[#1D9E75]/20 p-12 text-center">
              <CheckCircle size={32} className="text-[#1D9E75] mx-auto mb-3" />
              <div className="text-[#1D9E75] font-black font-mono uppercase tracking-widest text-sm">All Clear</div>
              <div className="text-[#4A453E] text-xs font-body mt-1">AI is handling everything. No action needed.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map(item => (
                <AttentionCard key={item.id} item={item} onDismiss={dismiss} />
              ))}
            </div>
          )}

          {/* Zero-UI notification hint */}
          <div className="bg-[#111111]/50 rounded-2xl border border-[#C9A84C]/5 p-4 flex items-center gap-3">
            <Wifi size={14} className="text-[#C9A84C] flex-shrink-0" />
            <p className="text-[11px] text-[#4A453E] font-body leading-relaxed">
              NAMA is also monitoring via <span className="text-[#C9A84C] font-bold">WhatsApp</span> and <span className="text-[#C9A84C] font-bold">Mobile Push</span>. You don't need to stay logged in — AI alerts you only when it matters.
            </p>
          </div>
        </div>

        {/* Agent Swarm Panel (1/3) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-[#C9A84C]" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#F5F0E8] font-mono">
              Agent Swarm
            </span>
            <span className="ml-auto text-[9px] font-mono text-[#1D9E75] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse inline-block" />
              {agents.filter(a => a.status === 'RUNNING').length} / {agents.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {agents.map(agent => (
              <AgentStatusCard key={agent.name} agent={agent} />
            ))}
          </div>

          {/* Switch to full Kinetic view */}
          <Link
            href="/kinetic"
            className="flex items-center justify-between bg-[#C9A84C] text-[#0A0A0A] rounded-2xl p-4 hover:opacity-95 transition-opacity shadow-[0_0_24px_rgba(201,168,76,0.15)] group"
          >
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#0A0A0A]/60">Deep Dive</div>
              <div className="font-black text-sm uppercase tracking-tight">Kinetic Engine OS</div>
            </div>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </div>
  );
}
