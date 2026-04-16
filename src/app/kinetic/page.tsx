'use client'

/**
 * NAMA OS — Kinetic Mode (Command Center)
 * ─────────────────────────────────────────
 * Dark-mode mission control for power users and ops leads.
 * Real-time agent activity stream, live KPIs, anomaly alerts,
 * P&L forecast chart, and system health panels.
 *
 * Design: Full-black background (#060A14), teal (#14B8A6) and
 * orange (#F97316) accent, monospace fonts, CRT-style glows.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Zap, Activity, Terminal, ShieldCheck, Globe, ChevronLeft,
  Cpu, RefreshCw, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  MessageSquare, Map, Users, CreditCard, Server, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, Eye,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const AGENT_POOL = [
  { id: 'TRIAGE',    label: 'Triage Agent',    color: '#14B8A6' },
  { id: 'ITINERARY', label: 'Itinerary Agent', color: '#818CF8' },
  { id: 'BIDDING',   label: 'Bid Agent',       color: '#F97316' },
  { id: 'FINANCE',   label: 'Finance Agent',   color: '#34D399' },
  { id: 'COMMS',     label: 'Comms Agent',     color: '#60A5FA' },
  { id: 'BOOKING',   label: 'Booking Agent',   color: '#F472B6' },
]

const LOG_TEMPLATES = [
  (a: string) => `Lead #${1000 + Math.floor(Math.random()*99)} routed → ${a}`,
  ()          => `WhatsApp msg triaged: Bali 7-day luxury, ₹${(Math.random()*3+2).toFixed(1)}L`,
  ()          => `Itinerary generated: ${['Dubai', 'Maldives', 'Bali', 'Europe', 'Japan'][Math.floor(Math.random()*5)]} ${Math.floor(Math.random()*7+3)}-day`,
  ()          => `Vendor bid received: ${Math.floor(Math.random()*3+2)} bids for hotel block`,
  (a: string) => `Settlement reconciled: ₹${(Math.random()*50+10).toFixed(0)}K via ${a}`,
  ()          => `Quote #Q-${1000+Math.floor(Math.random()*99)} sent to client`,
  ()          => `Booking #${500+Math.floor(Math.random()*99)} confirmed — ₹${(Math.random()*2+1).toFixed(1)}L`,
  ()          => `BYOK key rotated — switching to Gemini Flash`,
  ()          => `Anomaly: Lead conversion rate +${Math.floor(Math.random()*20+5)}% above baseline`,
]

const STATUS_POOL = ['OK', 'OK', 'OK', 'OK', 'WARN', 'OK', 'OK', 'ERR'] as const
type LogStatus = typeof STATUS_POOL[number]

interface LogEntry {
  id: string
  time: string
  agent: string
  agentColor: string
  message: string
  status: LogStatus
}

interface KpiData {
  activeLeads:   number
  quotesToday:   number
  revenueMonth:  number
  avgMargin:     number
  systemLatency: number
  backendUp:     boolean
}

interface Alert {
  id: string
  severity: 'high' | 'medium' | 'low'
  message: string
  time: string
  acknowledged: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const now = () => new Date().toTimeString().slice(0, 8)

const randAgent = () => AGENT_POOL[Math.floor(Math.random() * AGENT_POOL.length)]

const makeLog = (): LogEntry => {
  const ag = randAgent()
  const tmpl = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)]
  const status: LogStatus = STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)]
  return {
    id:         Math.random().toString(36).slice(2),
    time:       now(),
    agent:      ag.label,
    agentColor: ag.color,
    message:    tmpl(ag.label),
    status,
  }
}

const INITIAL_LOGS: LogEntry[] = Array.from({ length: 12 }, makeLog).map((l, i) => {
  // Give them staggered "past" times for initial render
  const offset = (12 - i) * 4
  const t = new Date(Date.now() - offset * 1000)
  return { ...l, time: t.toTimeString().slice(0, 8) }
})

const INITIAL_ALERTS: Alert[] = [
  { id: '1', severity: 'medium', message: 'Lead response latency 2.1s (target <1.5s)', time: now(), acknowledged: false },
  { id: '2', severity: 'low',    message: 'BYOK key last used >6h ago — consider rotation',  time: now(), acknowledged: false },
]

// ── Status colors ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<LogStatus, string> = {
  OK:   'text-emerald-400',
  WARN: 'text-amber-400',
  ERR:  'text-red-400',
}

const SEVERITY_STYLE: Record<Alert['severity'], string> = {
  high:   'border-red-500/40   bg-red-500/8   text-red-400',
  medium: 'border-amber-500/40 bg-amber-500/8 text-amber-400',
  low:    'border-slate-600/40 bg-slate-800   text-slate-400',
}

// ── SVG Mini Sparkline ────────────────────────────────────────────────────────
function MiniChart({ data, color = '#14B8A6' }: { data: number[]; color?: string }) {
  const h = 40, w = 120
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 6) - 3
    return `${x},${y}`
  })
  const d = `M ${pts.join(' L ')}`
  const area = `${d} L ${w},${h} L 0,${h} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`kg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#kg-${color.slice(1)})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={pts[pts.length-1].split(',')[0]}
        cy={pts[pts.length-1].split(',')[1]}
        r="2.5" fill={color}
      />
    </svg>
  )
}

// ── Forecast bar chart ────────────────────────────────────────────────────────
function ForecastBars({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const labels = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr*']
  return (
    <div className="flex items-end gap-2 h-28 mt-2">
      {data.map((v, i) => {
        const pct = (v / max) * 100
        const isCurrent = i === data.length - 1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex items-end" style={{ height: '88px' }}>
              <div
                className={`w-full rounded-t transition-all duration-1000 ${
                  isCurrent ? 'bg-[#14B8A6]' : 'bg-white/10'
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isCurrent ? 'text-[#14B8A6]' : 'text-slate-600'}`}>
              {labels[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KineticPage() {
  const [logs,    setLogs]    = useState<LogEntry[]>(INITIAL_LOGS)
  const [alerts,  setAlerts]  = useState<Alert[]>(INITIAL_ALERTS)
  const [paused,  setPaused]  = useState(false)
  const [kpi,     setKpi]     = useState<KpiData>({
    activeLeads: 47, quotesToday: 12, revenueMonth: 12500000,
    avgMargin: 34.2, systemLatency: 142, backendUp: true,
  })
  const [sparkData] = useState({
    leads:   [22,25,28,31,35,38,41,45,47],
    revenue: [800,950,1050,1100,1150,1200,1250,1200,1250],
    margin:  [28,30,31,33,34,33,35,34,34],
    latency: [180,165,155,148,145,150,142,140,142],
  })
  const [forecast] = useState([65, 72, 85, 78, 88, 92, 100])
  const logEndRef = useRef<HTMLDivElement>(null)

  // Live log stream
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => {
      setLogs(prev => [...prev.slice(-80), makeLog()])
    }, 2800)
    return () => clearInterval(t)
  }, [paused])

  // Auto-scroll log
  useEffect(() => {
    if (!paused) logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, paused])

  // Backend health poll
  useEffect(() => {
    const check = async () => {
      const t0 = performance.now()
      try {
        const r = await fetch('/api/v1/health', { cache: 'no-store' })
        const ms = Math.round(performance.now() - t0)
        setKpi(k => ({ ...k, backendUp: r.ok, systemLatency: ms }))
      } catch {
        setKpi(k => ({ ...k, backendUp: false }))
      }
    }
    check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [])

  const ackAlert = (id: string) =>
    setAlerts(a => a.map(x => x.id === id ? { ...x, acknowledged: true } : x))

  const unacked = alerts.filter(a => !a.acknowledged)

  const fmtCurrency = (v: number) =>
    v >= 10000000 ? `₹${(v/10000000).toFixed(1)}Cr` :
    v >= 100000   ? `₹${(v/100000).toFixed(1)}L` :
    v >= 1000     ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`

  return (
    <div className="min-h-screen bg-[#060A14] text-white font-mono overflow-hidden flex flex-col select-none">

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#060A14]/95 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="p-1.5 text-slate-600 hover:text-[#14B8A6] transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <Zap size={16} fill="#14B8A6" className="text-[#14B8A6]" />
            <span className="font-black tracking-[0.25em] text-sm text-white uppercase">KINETIC ENGINE</span>
            <span className="text-[10px] font-black text-[#14B8A6] bg-[#14B8A6]/10 border border-[#14B8A6]/20 px-2 py-0.5 rounded-full">v3.0</span>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${kpi.backendUp ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/25' : 'text-red-400 bg-red-500/8 border-red-500/25'}`}>
            {kpi.backendUp ? <Wifi size={11} /> : <WifiOff size={11} />}
            {kpi.backendUp ? 'API LIVE' : 'API DOWN'}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[#14B8A6] bg-[#14B8A6]/8 border-[#14B8A6]/25">
            <Cpu size={11} />
            {kpi.systemLatency}ms
          </div>
          {unacked.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-amber-400 bg-amber-500/8 border-amber-500/25 animate-pulse">
              <AlertTriangle size={11} />
              {unacked.length} ALERT{unacked.length > 1 ? 'S' : ''}
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-violet-400 bg-violet-500/8 border-violet-500/25">
            <Globe size={11} />
            {AGENT_POOL.length} AGENTS
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused(p => !p)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all border ${
              paused
                ? 'bg-[#14B8A6]/10 border-[#14B8A6]/30 text-[#14B8A6]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            {paused ? <><Activity size={12} /> RESUME</> : <><Eye size={12} /> PAUSE</>}
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            Exit Kinetic
          </Link>
        </div>
      </header>

      {/* ── MAIN GRID ───────────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-px bg-white/3 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── LEFT: Activity log (4 cols) ──────────────────────────────────── */}
        <div className="col-span-4 bg-[#060A14] flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Agentic Activity Stream</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span className="text-[9px] font-bold text-slate-600 uppercase">{paused ? 'PAUSED' : 'LIVE'}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {logs.map(log => (
              <div key={log.id} className="flex gap-3 group animate-fade-in">
                <span className="text-[9px] font-bold text-slate-700 mt-0.5 flex-shrink-0 tabular-nums">{log.time}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter flex-shrink-0"
                      style={{ color: log.agentColor, backgroundColor: `${log.agentColor}15`, borderColor: `${log.agentColor}30` }}
                    >
                      {log.agent.split(' ')[0]}
                    </span>
                    <span className={`text-[9px] font-black ${STATUS_STYLE[log.status]}`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-snug truncate group-hover:text-slate-200 transition-colors">
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
            {!paused && (
              <div className="text-[10px] font-black text-[#14B8A6] tracking-[0.2em] uppercase animate-pulse py-2">
                _ AWAITING SIGNAL…
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER + RIGHT: KPIs + Forecast + Alerts (8 cols) ───────────── */}
        <div className="col-span-8 bg-[#080D1A] flex flex-col overflow-y-auto">

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-px border-b border-white/5 flex-shrink-0">
            {[
              {
                label: 'Active Leads', value: kpi.activeLeads,
                format: (v: number) => String(v),
                icon: Users, color: '#14B8A6', spark: sparkData.leads,
                delta: '+8%', up: true,
              },
              {
                label: 'Quotes Today', value: kpi.quotesToday,
                format: (v: number) => String(v),
                icon: Map, color: '#818CF8', spark: sparkData.revenue,
                delta: '+3', up: true,
              },
              {
                label: 'Monthly GMV', value: kpi.revenueMonth,
                format: fmtCurrency,
                icon: CreditCard, color: '#34D399', spark: sparkData.revenue,
                delta: '+12%', up: true,
              },
              {
                label: 'Avg Margin', value: kpi.avgMargin,
                format: (v: number) => `${v.toFixed(1)}%`,
                icon: TrendingUp, color: '#F97316', spark: sparkData.margin,
                delta: '+2.1pp', up: true,
              },
            ].map(k => (
              <div key={k.label} className="px-6 py-5 bg-[#060A14] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{k.label}</span>
                  <k.icon size={13} style={{ color: k.color }} />
                </div>
                <div className="text-2xl font-black text-white tabular-nums" style={{ textShadow: `0 0 20px ${k.color}40` }}>
                  {k.format(k.value)}
                </div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1 text-[10px] font-bold ${k.up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {k.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {k.delta}
                  </div>
                  <MiniChart data={k.spark} color={k.color} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-2 gap-px">

            {/* Revenue Forecast */}
            <div className="bg-[#060A14] p-6 border-r border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Revenue Forecast</p>
                  <p className="text-2xl font-black text-white">₹1.25Cr <span className="text-[#14B8A6] text-sm">April</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">vs Last Month</p>
                  <p className="text-sm font-black text-emerald-400">+8.7%</p>
                </div>
              </div>
              <ForecastBars data={forecast} />
              <p className="text-[9px] text-slate-700 font-bold mt-3">* Apr forecast based on current lead velocity</p>
            </div>

            {/* Alerts + System Health */}
            <div className="bg-[#060A14] p-6 flex flex-col gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-2">
                  <AlertTriangle size={10} className="text-amber-500" />
                  Active Alerts ({unacked.length})
                </p>
                <div className="space-y-2">
                  {alerts.length === 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold">
                      <CheckCircle2 size={12} /> All systems nominal
                    </div>
                  )}
                  {alerts.map(a => (
                    <div
                      key={a.id}
                      className={`px-3 py-2.5 rounded-lg border flex items-start justify-between gap-3 transition-all ${
                        a.acknowledged ? 'opacity-30' : SEVERITY_STYLE[a.severity]
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-[10px] font-bold leading-snug">{a.message}</p>
                        <p className="text-[9px] mt-0.5 opacity-60">{a.time}</p>
                      </div>
                      {!a.acknowledged && (
                        <button
                          onClick={() => ackAlert(a.id)}
                          className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex-shrink-0 mt-0.5"
                        >
                          ACK
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent health grid */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3">Agent Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_POOL.map(ag => (
                    <div key={ag.id} className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: ag.color, boxShadow: `0 0 6px ${ag.color}80` }} />
                      <span className="text-[10px] font-bold text-slate-400 truncate">{ag.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* System vitals */}
              <div className="border-t border-white/5 pt-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3">Infrastructure</p>
                <div className="space-y-2">
                  {[
                    { label: 'Railway Backend', status: kpi.backendUp, detail: `${kpi.systemLatency}ms` },
                    { label: 'Neon PostgreSQL', status: kpi.backendUp, detail: 'Connected' },
                    { label: 'Redis Cache',     status: true,          detail: 'fakeredis' },
                    { label: 'Vercel Edge',     status: true,          detail: 'Online' },
                  ].map(v => (
                    <div key={v.label} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${v.status ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-slate-500 font-medium">{v.label}</span>
                      </div>
                      <span className={`font-bold ${v.status ? 'text-emerald-400' : 'text-red-400'}`}>{v.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────────────────────────────── */}
      <div className="h-8 border-t border-white/5 bg-[#040710] flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-700">
          <span>NAMA OS v0.3.0</span>
          <span>·</span>
          <span>19 MODULES ACTIVE</span>
          <span>·</span>
          <Clock size={9} className="inline" />
          <span id="clock">{now()}</span>
        </div>
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-700">
          <span className="text-[#14B8A6]">HS-1 ✓</span>
          <span className="text-[#14B8A6]">HS-2 ✓</span>
          <span className="text-[#14B8A6]">HS-3 ✓</span>
          <span className="text-[#14B8A6]">HS-4 ✓</span>
        </div>
      </div>

    </div>
  )
}
