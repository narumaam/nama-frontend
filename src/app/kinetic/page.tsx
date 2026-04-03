"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Zap, ChevronLeft, ShieldCheck, Globe, Cpu, RefreshCw,
  Terminal, Activity, Brain, MapPin, Target, CreditCard,
  MessageSquare, Shield, AlertTriangle, CheckCircle,
  TrendingUp, MoreHorizontal, Circle, Wifi, Bot
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type LogStatus = 'SUCCESS' | 'IN_PROGRESS' | 'ALERT' | 'WARN';
interface LogEntry { id: number; time: string; agent: string; msg: string; status: LogStatus; }
interface AgentNode { id: string; name: string; angle: number; r: number; state: 'RUNNING' | 'IDLE' | 'ALERT'; tasks: number; Icon: React.ElementType; }

// ─── Agent nodes (orbital positions) ─────────────────────────────────────────
const NODES: AgentNode[] = [
  { id: 'triage',     name: 'Triage',     angle: 270, r: 110, state: 'RUNNING', tasks: 47, Icon: Brain },
  { id: 'itinerary',  name: 'Itinerary',  angle: 342, r: 110, state: 'RUNNING', tasks: 12, Icon: MapPin },
  { id: 'bidding',    name: 'Bidding',    angle: 54,  r: 110, state: 'ALERT',   tasks: 8,  Icon: Target },
  { id: 'finance',    name: 'Finance',    angle: 126, r: 110, state: 'IDLE',    tasks: 31, Icon: CreditCard },
  { id: 'comms',      name: 'Comms',      angle: 198, r: 110, state: 'RUNNING', tasks: 63, Icon: MessageSquare },
  { id: 'operations', name: 'Ops',        angle: 18,  r: 80,  state: 'RUNNING', tasks: 19, Icon: Shield },
];

const NODE_CFG = {
  RUNNING: { ring: '#1D9E75', glow: 'rgba(29,158,117,0.35)', dot: 'bg-[#1D9E75]' },
  IDLE:    { ring: '#4A453E', glow: 'rgba(74,69,62,0.2)',    dot: 'bg-[#4A453E]' },
  ALERT:   { ring: '#ef4444', glow: 'rgba(239,68,68,0.45)',  dot: 'bg-red-500' },
};

// ─── Log seed ─────────────────────────────────────────────────────────────────
const SEED_LOGS: LogEntry[] = [
  { id: 1,  time: '', agent: 'Triage',    msg: 'New WhatsApp lead from +91-98XX. Classified: HIGH intent, ₹3.2L budget, Bali destination.',      status: 'SUCCESS' },
  { id: 2,  time: '', agent: 'Itinerary', msg: 'Generated 7D Bali Luxury draft — Ubud villa + Uluwatu sunset. Sent for approval.',                  status: 'SUCCESS' },
  { id: 3,  time: '', agent: 'Bidding',   msg: 'ALERT: Hyatt Dubai unresponsive 4h+. Switching to JW Marriott fallback. Margin preserved.',          status: 'ALERT' },
  { id: 4,  time: '', agent: 'Finance',   msg: 'Payment received: ₹96,000 from Meera Nair. Vouchers auto-generated and dispatched.',                  status: 'SUCCESS' },
  { id: 5,  time: '', agent: 'Comms',     msg: 'Follow-up sequence triggered for Sharma Family. 3rd reminder sent via WhatsApp.',                     status: 'IN_PROGRESS' },
  { id: 6,  time: '', agent: 'Triage',    msg: 'Lead from Instagram DM: 4-pax Europe trip, budget ₹8L. Scored 74%. Routed to Itinerary.',            status: 'SUCCESS' },
  { id: 7,  time: '', agent: 'Ops',       msg: 'Maldives speedboat confirmed for Nair booking. All vendor vouchers locked.',                          status: 'SUCCESS' },
  { id: 8,  time: '', agent: 'Bidding',   msg: 'Negotiated Soneva Jani net rate: ₹68,000/night (was ₹74,000). Margin +8.8%.',                       status: 'SUCCESS' },
  { id: 9,  time: '', agent: 'Itinerary', msg: 'Building Rajasthan Royal 7D for new high-value lead. Oberoi Udaivilas availability confirmed.',       status: 'IN_PROGRESS' },
  { id: 10, time: '', agent: 'Finance',   msg: 'WARN: TCS batch invoice ₹18.4L overdue 2 days. Escalation draft queued for human approval.',         status: 'WARN' },
];

const AGENT_TAG_COLOR: Record<string, string> = {
  Triage:    'text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/20',
  Itinerary: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Bidding:   'text-red-400 bg-red-500/10 border-red-500/20',
  Finance:   'text-[#1D9E75] bg-[#1D9E75]/10 border-[#1D9E75]/20',
  Comms:     'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Ops:       'text-orange-400 bg-orange-400/10 border-orange-400/20',
};

const STATUS_COLOR: Record<LogStatus, string> = {
  SUCCESS:     'text-[#1D9E75]',
  IN_PROGRESS: 'text-[#C9A84C]',
  ALERT:       'text-red-400',
  WARN:        'text-orange-400',
};

function timeStr() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Orbital SVG visualization ────────────────────────────────────────────────
function AgentOrbit({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const cx = 180, cy = 180;
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 50); return () => clearInterval(t); }, []);

  function nodePos(node: AgentNode) {
    const rad = (node.angle + tick * 0.3 * (node.state !== 'IDLE' ? 1 : 0.2)) * (Math.PI / 180);
    return { x: cx + node.r * Math.cos(rad), y: cy + node.r * Math.sin(rad) };
  }

  return (
    <svg
      viewBox="0 0 360 360"
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto h-auto w-full max-w-[360px] aspect-square"
    >
      {/* Orbit rings */}
      {[110, 80].map(r => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#C9A84C" strokeWidth="0.5" strokeOpacity="0.08" />
      ))}
      {/* Pulse rings on core */}
      {[30, 50, 70].map((r, i) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#C9A84C"
          strokeWidth="0.5" strokeOpacity={0.04 + i * 0.02}
          style={{ animation: `ping ${2 + i * 0.7}s ease-in-out infinite`, transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      {/* Core NAMA node */}
      <circle cx={cx} cy={cy} r={22} fill="#111111" stroke="#C9A84C" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={18} fill="#C9A84C" fillOpacity="0.08" />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="900"
        fill="#C9A84C" fontFamily="monospace" letterSpacing="1">NAMA</text>
      <text x={cx} y={cy + 11} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fontWeight="700"
        fill="#C9A84C" fontFamily="monospace" letterSpacing="1" fillOpacity="0.6">CORE</text>

      {/* Agent nodes */}
      {NODES.map(node => {
        const pos = nodePos(node);
        const cfg = NODE_CFG[node.state];
        const isSelected = selected === node.id;
        const { Icon } = node;
        return (
          <g key={node.id} onClick={() => onSelect(node.id)} style={{ cursor: 'pointer' }}>
            {/* Connection line */}
            <line x1={cx} y1={cy} x2={pos.x} y2={pos.y} stroke={cfg.ring} strokeWidth="0.5" strokeOpacity="0.3" />
            {/* Glow */}
            <circle cx={pos.x} cy={pos.y} r={isSelected ? 24 : 18} fill={cfg.glow} />
            {/* Node circle */}
            <circle cx={pos.x} cy={pos.y} r={14} fill="#111111" stroke={cfg.ring}
              strokeWidth={isSelected ? 2 : 1} />
            {/* State dot */}
            <circle cx={pos.x + 10} cy={pos.y - 10} r={3.5} fill={cfg.ring} />
            {/* Label */}
            <text x={pos.x} y={pos.y + 26} textAnchor="middle" fontSize="7.5" fontWeight="800"
              fill={isSelected ? '#F5F0E8' : '#B8B0A0'} fontFamily="monospace" letterSpacing="0.5">{node.name}</text>
          </g>
        );
      })}
      <style>{`@keyframes ping { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.1;transform:scale(1.15)} }`}</style>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KineticPage() {
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    SEED_LOGS.map(l => ({ ...l, time: timeStr() }))
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [liveGMV, setLiveGMV] = useState(12450000);
  const [liveLeads, setLiveLeads] = useState(1.2);
  const logsRef = useRef<HTMLDivElement>(null);

  // Simulate live log stream
  useEffect(() => {
    const NEW_MSGS = [
      { agent: 'Triage',    msg: 'Inbound email lead parsed. Intent: Luxury Europe, ₹12L, 2 pax.',          status: 'SUCCESS' as LogStatus },
      { agent: 'Comms',     msg: 'Auto-reply sent to Arjun Mehta via email. Response rate: 2.3s.',           status: 'SUCCESS' as LogStatus },
      { agent: 'Itinerary', msg: 'Switzerland 10D itinerary v2 generated. Cost optimised by 6%.',            status: 'SUCCESS' as LogStatus },
      { agent: 'Finance',   msg: 'Reconciliation complete. ₹4,80,000 settled, zero discrepancies.',          status: 'SUCCESS' as LogStatus },
      { agent: 'Bidding',   msg: 'Counter-offer accepted by Conrad Bali. Net rate locked at ₹52,000.',       status: 'SUCCESS' as LogStatus },
      { agent: 'Ops',       msg: 'Reminder: Priya Krishnan check-in tomorrow. Welcome note dispatched.',     status: 'IN_PROGRESS' as LogStatus },
      { agent: 'Triage',    msg: 'WARN: 3 leads uncontacted >6h. Escalating to Comms agent.',               status: 'WARN' as LogStatus },
    ];
    let idx = 0;
    const t = setInterval(() => {
      const entry = NEW_MSGS[idx % NEW_MSGS.length];
      setLogs(prev => [{ ...entry, id: Date.now(), time: timeStr() }, ...prev.slice(0, 49)]);
      setLiveGMV(v => v + Math.floor(Math.random() * 50000));
      setLiveLeads(v => +(v + (Math.random() - 0.4) * 0.05).toFixed(2));
      idx++;
    }, 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = 0;
  }, [logs]);

  const selectedNode = NODES.find(n => n.id === selected);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8] font-mono flex flex-col overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="min-h-14 border-b border-[#C9A84C]/10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 sm:px-6 py-3 bg-[#0A0A0A]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center justify-between gap-4 w-full md:w-auto">
          <Link href="/dashboard" className="text-[#4A453E] hover:text-[#C9A84C] transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5 min-w-0">
            <Zap size={14} fill="currentColor" className="text-[#C9A84C]" />
            <span className="font-black tracking-[0.2em] text-[10px] sm:text-xs uppercase text-[#C9A84C] truncate">Kinetic Demo OS</span>
            <span className="text-[#4A453E] text-[9px] font-mono">v4.0</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[8px] font-black tracking-widest uppercase">
          <div className="flex items-center gap-1.5 text-[#1D9E75] bg-[#1D9E75]/10 px-3 py-1.5 rounded-full border border-[#1D9E75]/20">
            <ShieldCheck size={11} /> Seeded Health
          </div>
          <div className="flex items-center gap-1.5 text-[#C9A84C] bg-[#C9A84C]/10 px-3 py-1.5 rounded-full border border-[#C9A84C]/20">
            <Cpu size={11} /> Demo Swarm
          </div>
          <div className="flex items-center gap-1.5 text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full border border-blue-400/20">
            <Globe size={11} /> 6 Seeded Nodes
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col xl:flex-row overflow-hidden">

        {/* LEFT: Live log stream */}
        <div className="w-full xl:w-[28%] border-b xl:border-b-0 xl:border-r border-[#C9A84C]/10 flex flex-col bg-[#0A0A0A] max-h-[38vh] xl:max-h-none">
          <div className="px-5 py-4 border-b border-[#C9A84C]/10 flex items-center justify-between bg-[#111111]/50 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={12} className="text-[#C9A84C]" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#B8B0A0]">Seeded Activity Log</span>
            </div>
            <RefreshCw size={11} className="text-[#C9A84C] animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          <div ref={logsRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {logs.map((log, i) => (
              <div key={log.id} className={`space-y-1.5 transition-all ${i === 0 ? 'animate-in fade-in slide-in-from-top-2 duration-500' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#4A453E] font-mono tabular-nums">{log.time}</span>
                  <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border font-mono ${AGENT_TAG_COLOR[log.agent] || 'text-[#B8B0A0] bg-[#1A1A1A] border-[#B8B0A0]/20'}`}>
                    {log.agent}
                  </span>
                  <span className={`text-[7px] font-black ml-auto ${STATUS_COLOR[log.status]}`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-[10px] text-[#B8B0A0] leading-relaxed font-body">{log.msg}</p>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <span className="flex gap-0.5">
                {[0, 0.2, 0.4].map(d => (
                  <span key={d} className="w-1 h-1 rounded-full bg-[#C9A84C] animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </span>
              <span className="text-[8px] font-black text-[#C9A84C] tracking-[0.2em] uppercase">Awaiting signal...</span>
            </div>
          </div>
        </div>

        {/* CENTER: Orbital visualization */}
        <div className="flex-1 flex flex-col bg-[#0A0A0A] relative overflow-hidden min-h-0">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-radial from-[#C9A84C]/3 via-transparent to-transparent pointer-events-none" />

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-b border-[#C9A84C]/10 shrink-0">
            {[
              { label: 'Demo GMV', value: `₹${(liveGMV / 100000).toFixed(1)}L`, color: 'text-[#C9A84C]' },
              { label: 'Seeded Leads', value: `${liveLeads} LPM`, color: 'text-blue-400' },
              { label: 'Review Load', value: 'LOW', color: 'text-[#1D9E75]' },
            ].map((stat, i) => (
              <div key={i} className="py-4 sm:py-5 px-4 sm:px-6 border-b sm:border-b-0 sm:border-r border-[#C9A84C]/10 last:border-r-0">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#4A453E] mb-2">{stat.label}</div>
                <div className={`text-xl sm:text-2xl font-black tracking-tighter tabular-nums ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Orbital canvas */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 xl:p-8 min-h-0">
            <div className="relative w-full max-w-[420px] sm:max-w-[520px] xl:max-w-none">
              <AgentOrbit selected={selected} onSelect={id => setSelected(selected === id ? null : id)} />

              {/* Selected node detail popup */}
              {selectedNode && (
                <div className="absolute left-1/2 top-full mt-4 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 xl:left-auto xl:right-0 xl:top-0 xl:mt-0 xl:ml-4 xl:translate-x-full bg-[#111111] rounded-2xl border border-[#C9A84C]/20 p-4 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#C9A84C] font-mono">{selectedNode.name} Agent</span>
                    <button onClick={() => setSelected(null)} className="text-[#4A453E] hover:text-[#B8B0A0]">
                      <ChevronLeft size={12} />
                    </button>
                  </div>
                  <div className={`text-[8px] font-mono font-black uppercase mb-3 ${NODE_CFG[selectedNode.state].ring === '#1D9E75' ? 'text-[#1D9E75]' : NODE_CFG[selectedNode.state].ring === '#ef4444' ? 'text-red-400' : 'text-[#4A453E]'}`}>
                    ⬤ {selectedNode.state}
                  </div>
                  <div className="text-[9px] text-[#B8B0A0] mb-2 font-body">Tasks today</div>
                  <div className="text-2xl font-black font-mono text-[#F5F0E8] mb-3">{selectedNode.tasks}</div>
                  <Link href="/dashboard/autopilot" className="text-[8px] font-mono text-[#C9A84C] hover:underline flex items-center gap-1">
                    View in Autopilot <ChevronLeft size={8} className="rotate-180" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Revenue forecast bars */}
          <div className="border-t border-[#C9A84C]/10 px-4 sm:px-6 xl:px-8 py-4 sm:py-6 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
              <div>
                <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#4A453E] mb-0.5">Projected Monthly GMV</div>
                <div className="text-lg sm:text-xl font-black text-[#C9A84C] font-mono tracking-tighter">₹1,25,00,000</div>
              </div>
              <div className="text-[8px] font-mono text-[#1D9E75] flex items-center gap-1">
                <TrendingUp size={10} /> Demo forecast from seeded pipeline
              </div>
            </div>
            <div className="h-12 sm:h-14 flex items-end gap-1 sm:gap-1.5">
              {[38, 52, 45, 68, 62, 81, 76, 92, 88, 100, 95, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-[#1A1A1A] rounded-t overflow-hidden relative group">
                  <div
                    className="absolute bottom-0 inset-x-0 rounded-t transition-all duration-700"
                    style={{
                      height: `${h}%`,
                      background: i >= 9 ? `linear-gradient(to top, #C9A84C, #C9A84C80)` : `linear-gradient(to top, #1D9E75, #1D9E7550)`,
                      boxShadow: i >= 9 ? '0 0 8px rgba(201,168,76,0.3)' : '0 0 6px rgba(29,158,117,0.2)',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 sm:flex sm:justify-between mt-2 gap-x-1 gap-y-1 overflow-hidden">
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                <span key={m} className="text-[7px] font-mono text-[#4A453E] tracking-widest text-center sm:text-left">{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: System metrics */}
        <div className="w-full xl:w-[22%] border-t xl:border-t-0 xl:border-l border-[#C9A84C]/10 flex flex-col bg-[#0A0A0A] overflow-y-auto no-scrollbar max-h-[52vh] xl:max-h-none">
          <div className="px-5 py-4 border-b border-[#C9A84C]/10 bg-[#111111]/50 shrink-0">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-[#C9A84C]" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#B8B0A0]">System Metrics</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {/* Agent status grid */}
            <div className="space-y-2.5">
              {NODES.map(node => {
                const cfg = NODE_CFG[node.state];
                return (
                  <div key={node.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${node.state === 'RUNNING' ? 'bg-[#1D9E75] animate-pulse' : node.state === 'ALERT' ? 'bg-red-400 animate-pulse' : 'bg-[#4A453E]'}`} />
                      <span className="text-[9px] font-mono text-[#B8B0A0]">{node.name}</span>
                    </div>
                    <span className={`text-[9px] font-mono font-black tabular-nums ${node.state === 'RUNNING' ? 'text-[#1D9E75]' : node.state === 'ALERT' ? 'text-red-400' : 'text-[#4A453E]'}`}>
                      {node.tasks}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-[#1A1A1A]" />

            {/* Key metrics */}
            <div className="space-y-4">
              {[
                { label: 'Total Tasks Today',    value: '179',  color: 'text-[#F5F0E8]' },
                { label: 'Avg Response Time',    value: '1.8s', color: 'text-[#1D9E75]' },
                { label: 'AI Accuracy Rate',     value: '96.4%',color: 'text-[#C9A84C]' },
                { label: 'Human Interventions',  value: '7',    color: 'text-[#B8B0A0]' },
                { label: 'Revenue Auto-Closed',  value: '₹6.2L',color: 'text-[#C9A84C]' },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-[7px] font-mono uppercase tracking-[0.15em] text-[#4A453E] mb-0.5">{m.label}</div>
                  <div className={`text-lg font-black font-mono ${m.color}`}>{m.value}</div>
                </div>
              ))}
            </div>

            <div className="h-px bg-[#1A1A1A]" />

            {/* Last AI decision */}
            <div>
              <div className="text-[7px] font-mono uppercase tracking-[0.15em] text-[#4A453E] mb-2">Last AI Decision</div>
              <div className="bg-[#111111] rounded-xl border border-[#C9A84C]/10 p-3">
                <div className="text-[9px] text-[#B8B0A0] font-body leading-relaxed">
                  Demo decision card: the Dubai bleisure case stays on the premium hold path, with the fallback option staged if needed.
                </div>
                <div className="text-[7px] font-mono text-[#4A453E] mt-1.5">Confidence: 94% · seeded case</div>
              </div>
            </div>

            {/* CTA back to Autopilot */}
            <Link
              href="/dashboard/autopilot"
              className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] rounded-xl p-3 hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(201,168,76,0.15)] group"
            >
              <Zap size={12} fill="currentColor" />
              <span className="text-[9px] font-black uppercase tracking-widest">Command Center</span>
            </Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .bg-gradient-radial { background: radial-gradient(ellipse at center, var(--tw-gradient-stops)); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
