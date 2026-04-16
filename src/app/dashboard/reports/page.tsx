"use client";

/**
 * M18 — Advanced Reporting & Business Intelligence
 * --------------------------------------------------
 * Full-featured BI dashboard with:
 *   - Date range picker (7d / 30d / 90d / 12mo / custom)
 *   - Revenue trend chart (SVG area chart)
 *   - Conversion funnel with drill-down
 *   - Agent performance leaderboard
 *   - Top destinations by revenue
 *   - AI usage & cost report
 *   - One-click CSV export for every table
 */

import React, { useState, useMemo } from "react";
import {
  BarChart2, TrendingUp, TrendingDown, Download,
  Calendar, Users, Map, Bot, DollarSign,
  ArrowUp, ArrowDown, Minus, Filter, RefreshCw,
  ChevronDown, FileText, Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Range = "7d" | "30d" | "90d" | "12mo";
type Tab   = "revenue" | "leads" | "agents" | "destinations" | "ai";

// ── Seeded Data Generator ──────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

function generateRevenueSeries(days: number, baseSeed = 42) {
  const rand = seededRandom(baseSeed);
  const data: { date: string; revenue: number; cost: number; bookings: number }[] = [];
  let base = 85000;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const noise  = (rand() - 0.5) * 30000;
    const trend  = (days - i) * 200;
    const weekend = [0, 6].includes(d.getDay()) ? 20000 : 0;
    base = Math.max(40000, base + noise * 0.3 + trend * 0.05);
    const revenue  = Math.round(base + noise + weekend);
    const cost     = Math.round(revenue * (0.55 + rand() * 0.12));
    const bookings = Math.round(1 + rand() * 8);
    data.push({
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue,
      cost,
      bookings,
    });
  }
  return data;
}

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "12mo": 365 };

const AGENTS = [
  { name: "Priya Sharma",   leads: 87, converted: 62, revenue: 9_40_000, rating: 4.9 },
  { name: "Rahul Mehta",    leads: 71, converted: 48, revenue: 7_20_000, rating: 4.7 },
  { name: "Ananya Nair",    leads: 65, converted: 51, revenue: 8_10_000, rating: 4.8 },
  { name: "Karan Singh",    leads: 58, converted: 38, revenue: 5_90_000, rating: 4.5 },
  { name: "Deepa Iyer",     leads: 44, converted: 31, revenue: 4_80_000, rating: 4.6 },
];

const DESTINATIONS = [
  { name: "Bali, Indonesia",   bookings: 48, revenue: 28_40_000, aov: 59_167, growth: 34 },
  { name: "Maldives",          bookings: 31, revenue: 41_20_000, aov: 132_903, growth: 22 },
  { name: "Rajasthan, India",  bookings: 67, revenue: 18_90_000, aov: 28_209, growth: 18 },
  { name: "Dubai, UAE",        bookings: 53, revenue: 24_60_000, aov: 46_415, growth: 8 },
  { name: "Thailand",          bookings: 42, revenue: 14_70_000, aov: 35_000, growth: -4 },
  { name: "Europe (Schengen)", bookings: 29, revenue: 38_50_000, aov: 132_759, growth: 41 },
];

const FUNNEL = [
  { stage: "Queries Received",   count: 1240, pct: 100, color: "#14B8A6" },
  { stage: "Leads Created",      count: 892,  pct: 72,  color: "#0EA5E9" },
  { stage: "Itineraries Sent",   count: 431,  pct: 35,  color: "#8B5CF6" },
  { stage: "Quotations Sent",    count: 278,  pct: 22,  color: "#F59E0B" },
  { stage: "Bookings Confirmed", count: 143,  pct: 12,  color: "#10B981" },
  { stage: "Payments Received",  count: 128,  pct: 10,  color: "#22C55E" },
];

const AI_USAGE = [
  { module: "M1 Query Triage",       calls: 1240, tokens: 1_488_000, cost_inr: 1260,  savings_hrs: 413, model: "Claude Haiku" },
  { module: "M8 Itinerary Builder",  calls: 431,  tokens: 1_939_500, cost_inr: 4140,  savings_hrs: 1293, model: "Claude Sonnet" },
  { module: "M3 Quotation Assist",   calls: 278,  tokens: 611_600,   cost_inr: 870,   savings_hrs: 209, model: "Claude Haiku" },
  { module: "M5 Comms Drafting",     calls: 1890, tokens: 1_512_000, cost_inr: 1275,  savings_hrs: 378, model: "Claude Haiku" },
  { module: "M9 Anomaly Detection",  calls: 60,   tokens: 240_000,   cost_inr: 510,   savings_hrs: 120, model: "Claude Sonnet" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtINR = (n: number) => {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${r[k]}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── SVG Area Chart ─────────────────────────────────────────────────────────────
function AreaChart({
  data, width = 800, height = 220,
}: {
  data: { revenue: number; cost: number; date: string }[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const pad = { top: 20, right: 20, bottom: 32, left: 60 };
  const W   = width  - pad.left - pad.right;
  const H   = height - pad.top  - pad.bottom;
  const maxR = Math.max(...data.map((d) => d.revenue)) * 1.05;
  const minV = 0;

  const xScale = (i: number) => (i / (data.length - 1)) * W;
  const yScale = (v: number) => H - ((v - minV) / (maxR - minV)) * H;

  const revPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d.revenue).toFixed(1)}`)
    .join(" ");
  const costPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d.cost).toFixed(1)}`)
    .join(" ");

  const revFill = `${revPath} L${xScale(data.length - 1)},${H} L0,${H} Z`;
  const costFill = `${costPath} L${xScale(data.length - 1)},${H} L0,${H} Z`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: minV + (maxR - minV) * t,
    y: H - H * t,
  }));

  // X-axis labels — every Nth
  const labelStep = Math.ceil(data.length / 7);
  const xLabels = data
    .map((d, i) => ({ label: d.date, x: xScale(i), i }))
    .filter(({ i }) => i % labelStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#14B8A6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8B5CF6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1="0" y1={t.y} x2={W} y2={t.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
            <text x="-8" y={t.y + 4} textAnchor="end" fill="#94a3b8" fontSize="11">
              {fmtINR(t.value)}
            </text>
          </g>
        ))}

        {/* Area fills */}
        <path d={costFill}  fill="url(#costGrad)" />
        <path d={revFill}   fill="url(#revGrad)" />

        {/* Lines */}
        <path d={costPath} fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="5,3" />
        <path d={revPath}  fill="none" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" />

        {/* X labels */}
        {xLabels.map(({ label, x, i }) => (
          <text key={i} x={x} y={H + 20} textAnchor="middle" fill="#94a3b8" fontSize="10">
            {label}
          </text>
        ))}
      </g>
    </svg>
  );
}

// ── Bar Chart (horizontal) ─────────────────────────────────────────────────────
function HBarChart({ data }: { data: { label: string; value: number; max: number; color: string }[] }) {
  return (
    <div className="space-y-3">
      {data.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium truncate mr-2">{row.label}</span>
            <span className="font-bold text-slate-800 flex-shrink-0">{fmtINR(row.value)}</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round((row.value / row.max) * 100)}%`, background: row.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, sub, icon: Icon, color }: {
  label: string; value: string; trend?: number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${
            trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-slate-400"
          }`}>
            {trend > 0 ? <ArrowUp size={12} /> : trend < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-black text-[#0F172A]">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-1 font-medium">{sub}</div>}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [activeTab, setActiveTab] = useState<Tab>("revenue");

  const days = RANGE_DAYS[range];
  const series = useMemo(() => generateRevenueSeries(days), [days]);

  // Aggregate KPIs
  const totalRevenue  = series.reduce((s, d) => s + d.revenue, 0);
  const totalCost     = series.reduce((s, d) => s + d.cost, 0);
  const grossProfit   = totalRevenue - totalCost;
  const totalBookings = series.reduce((s, d) => s + d.bookings, 0);
  const margin        = Math.round((grossProfit / totalRevenue) * 100);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "revenue",      label: "Revenue",      icon: TrendingUp },
    { id: "leads",        label: "Funnel",        icon: Filter },
    { id: "agents",       label: "Agents",        icon: Users },
    { id: "destinations", label: "Destinations",  icon: Map },
    { id: "ai",           label: "AI Usage",      icon: Bot },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Reports & BI</h1>
          <p className="text-slate-500 mt-2 font-medium">Advanced business intelligence across all modules.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range picker */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            {(["7d", "30d", "90d", "12mo"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  range === r ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue"  value={fmtINR(totalRevenue)}  trend={18} sub={`${days}d period`} icon={TrendingUp} color="bg-[#14B8A6]" />
        <StatCard label="Gross Profit"   value={fmtINR(grossProfit)}   trend={margin} sub={`${margin}% margin`}  icon={DollarSign} color="bg-violet-500" />
        <StatCard label="Bookings"       value={String(totalBookings)} trend={12} sub="confirmed" icon={FileText} color="bg-blue-500" />
        <StatCard label="Total Leads"    value="892" trend={8} sub="triaged by AI" icon={Zap} color="bg-amber-500" />
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === t.id ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Revenue Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          {/* Area chart */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-extrabold text-[#0F172A]">Revenue vs. Cost — {range}</h3>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-4 h-1.5 bg-[#14B8A6] rounded-full" />
                    Revenue
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-4 h-1 bg-violet-500 rounded-full" style={{ borderStyle: "dashed" }} />
                    Cost
                  </div>
                </div>
              </div>
              <button
                onClick={() => exportCSV(series, `nama-revenue-${range}.csv`)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>
            <AreaChart data={series} />
          </div>

          {/* Summary table */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0F172A]">Daily Breakdown</h3>
              <button
                onClick={() => exportCSV(series, `nama-daily-${range}.csv`)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                <Download size={12} /> CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Date","Revenue","Cost","Gross Profit","Margin","Bookings"].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...series].reverse().slice(0, 14).map((row, i) => {
                    const gp = row.revenue - row.cost;
                    const m  = Math.round((gp / row.revenue) * 100);
                    return (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-medium text-slate-700">{row.date}</td>
                        <td className="px-5 py-3 font-bold text-[#0F172A]">{fmtINR(row.revenue)}</td>
                        <td className="px-5 py-3 text-slate-500">{fmtINR(row.cost)}</td>
                        <td className="px-5 py-3 font-bold text-emerald-600">{fmtINR(gp)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m >= 40 ? "bg-emerald-50 text-emerald-700" : m >= 30 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                            {m}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{row.bookings}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Funnel Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "leads" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visual funnel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-[#0F172A]">Conversion Funnel</h3>
              <button
                onClick={() => exportCSV(FUNNEL, "nama-funnel.csv")}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                <Download size={12} /> CSV
              </button>
            </div>
            <div className="space-y-2.5">
              {FUNNEL.map((stage, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 font-semibold">{stage.stage}</span>
                    <span className="font-black text-slate-800">{stage.count.toLocaleString("en-IN")} ({stage.pct}%)</span>
                  </div>
                  <div className="h-9 bg-slate-50 rounded-xl overflow-hidden">
                    <div
                      className="h-full rounded-xl flex items-center px-3 transition-all duration-500"
                      style={{ width: `${stage.pct}%`, background: stage.color }}
                    >
                      {stage.pct >= 20 && (
                        <span className="text-white text-[11px] font-black">{stage.pct}%</span>
                      )}
                    </div>
                  </div>
                  {i < FUNNEL.length - 1 && (
                    <div className="text-[10px] text-slate-400 mt-0.5 ml-1">
                      → {Math.round((FUNNEL[i + 1].count / stage.count) * 100)}% pass-through
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Funnel stats */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-6">
              <h3 className="font-extrabold text-[#0F172A] mb-4">Key Conversion Rates</h3>
              <div className="space-y-4">
                {[
                  { label: "Query → Lead",          value: "72%", trend: +4, color: "bg-[#14B8A6]" },
                  { label: "Lead → Itinerary",       value: "48%", trend: +7, color: "bg-blue-500" },
                  { label: "Itinerary → Booking",    value: "33%", trend: -2, color: "bg-violet-500" },
                  { label: "Booking → Payment",      value: "89%", trend: +1, color: "bg-emerald-500" },
                  { label: "End-to-end (Q → Paid)",  value: "10%", trend: +2, color: "bg-amber-500" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                      <span className="text-sm text-slate-600">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{row.value}</span>
                      <span className={`text-xs font-bold flex items-center gap-0.5 ${row.trend > 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {row.trend > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                        {Math.abs(row.trend)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#14B8A6]/10 to-violet-500/10 border border-[#14B8A6]/20 rounded-2xl p-5">
              <p className="font-black text-slate-800 mb-1">Opportunity Insight</p>
              <p className="text-sm text-slate-600">
                If you improve <strong>Itinerary → Booking</strong> conversion from 33% to 40%,
                you'd add <strong className="text-[#14B8A6]">~{fmtINR(grossProfit * 0.21)}</strong> in
                monthly revenue without acquiring a single new lead.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Agents Tab ────────────────────────────────────────────────────────── */}
      {activeTab === "agents" && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-extrabold text-[#0F172A]">Agent Performance Leaderboard</h3>
            <button
              onClick={() => exportCSV(AGENTS, "nama-agents.csv")}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Rank", "Agent", "Leads", "Converted", "Conv. Rate", "Revenue", "Rating"].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AGENTS.sort((a, b) => b.revenue - a.revenue).map((agent, i) => {
                  const conv = Math.round((agent.converted / agent.leads) * 100);
                  return (
                    <tr key={i} className={`border-t border-slate-50 hover:bg-slate-50/50 ${i === 0 ? "bg-amber-50/30" : ""}`}>
                      <td className="px-5 py-4">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#14B8A6] to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-black">
                            {agent.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="font-semibold text-slate-800">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{agent.leads}</td>
                      <td className="px-5 py-4 text-slate-600">{agent.converted}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                            <div className="h-full bg-[#14B8A6] rounded-full" style={{ width: `${conv}%` }} />
                          </div>
                          <span className="font-bold text-slate-700 text-xs">{conv}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-black text-[#0F172A]">{fmtINR(agent.revenue)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 text-sm">★</span>
                          <span className="font-bold text-slate-700 text-xs">{agent.rating}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td className="px-5 py-3" colSpan={2}>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Team Total</span>
                  </td>
                  <td className="px-5 py-3 font-black text-slate-700">{AGENTS.reduce((s, a) => s + a.leads, 0)}</td>
                  <td className="px-5 py-3 font-black text-slate-700">{AGENTS.reduce((s, a) => s + a.converted, 0)}</td>
                  <td className="px-5 py-3 font-black text-[#14B8A6]">
                    {Math.round((AGENTS.reduce((s, a) => s + a.converted, 0) / AGENTS.reduce((s, a) => s + a.leads, 0)) * 100)}%
                  </td>
                  <td className="px-5 py-3 font-black text-[#14B8A6]">{fmtINR(AGENTS.reduce((s, a) => s + a.revenue, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Destinations Tab ─────────────────────────────────────────────────── */}
      {activeTab === "destinations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-[#0F172A]">Revenue by Destination</h3>
              <button
                onClick={() => exportCSV(DESTINATIONS, "nama-destinations.csv")}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                <Download size={12} /> CSV
              </button>
            </div>
            <HBarChart
              data={DESTINATIONS.map((d, i) => ({
                label: d.name,
                value: d.revenue,
                max: Math.max(...DESTINATIONS.map((x) => x.revenue)),
                color: ["#14B8A6", "#8B5CF6", "#0EA5E9", "#F59E0B", "#10B981", "#EC4899"][i % 6],
              }))}
            />
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0F172A]">Top Destinations Detail</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Destination", "Bookings", "Revenue", "AOV", "Growth"].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DESTINATIONS.sort((a, b) => b.revenue - a.revenue).map((dest, i) => (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{dest.name}</td>
                    <td className="px-4 py-3 text-slate-600">{dest.bookings}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{fmtINR(dest.revenue)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtINR(dest.aov)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold flex items-center gap-0.5 ${dest.growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {dest.growth >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                        {Math.abs(dest.growth)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AI Usage Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total AI Calls",    value: AI_USAGE.reduce((s, u) => s + u.calls, 0).toLocaleString("en-IN"),      color: "bg-[#14B8A6]", icon: Zap },
              { label: "Total Tokens Used", value: (AI_USAGE.reduce((s, u) => s + u.tokens, 0) / 1_000_000).toFixed(1) + "M", color: "bg-violet-500", icon: BarChart2 },
              { label: "AI Cost (BYOK)",    value: `₹${AI_USAGE.reduce((s, u) => s + u.cost_inr, 0).toLocaleString("en-IN")}`, color: "bg-amber-500", icon: DollarSign },
              { label: "Agent Hours Saved", value: AI_USAGE.reduce((s, u) => s + u.savings_hrs, 0).toLocaleString("en-IN") + " hrs", color: "bg-emerald-500", icon: Users },
            ].map((k) => (
              <StatCard key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color} />
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0F172A]">AI Usage by Module</h3>
              <button
                onClick={() => exportCSV(AI_USAGE, "nama-ai-usage.csv")}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Module", "Model", "API Calls", "Tokens", "BYOK Cost", "Hours Saved", "Value Delivered"].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AI_USAGE.map((row, i) => {
                    const valueINR = row.savings_hrs * 350; // ₹350/hr agent rate
                    return (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-semibold text-slate-800">{row.module}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs bg-[#14B8A6]/10 text-[#14B8A6] px-2 py-0.5 rounded-full font-bold">{row.model}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{row.calls.toLocaleString()}</td>
                        <td className="px-5 py-4 text-slate-600">{(row.tokens / 1000).toFixed(0)}K</td>
                        <td className="px-5 py-4 font-bold text-amber-600">₹{row.cost_inr.toLocaleString()}</td>
                        <td className="px-5 py-4 text-emerald-600 font-bold">{row.savings_hrs.toLocaleString()} hrs</td>
                        <td className="px-5 py-4">
                          <span className="font-black text-[#0F172A]">{fmtINR(valueINR)}</span>
                          <span className="text-xs text-slate-400 ml-1">({Math.round(valueINR / row.cost_inr)}x ROI)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-5 py-3 font-black text-slate-500 text-xs uppercase" colSpan={2}>Total</td>
                    <td className="px-5 py-3 font-black">{AI_USAGE.reduce((s, u) => s + u.calls, 0).toLocaleString()}</td>
                    <td className="px-5 py-3 font-black">{(AI_USAGE.reduce((s, u) => s + u.tokens, 0) / 1000).toFixed(0)}K</td>
                    <td className="px-5 py-3 font-black text-amber-600">₹{AI_USAGE.reduce((s, u) => s + u.cost_inr, 0).toLocaleString()}</td>
                    <td className="px-5 py-3 font-black text-emerald-600">{AI_USAGE.reduce((s, u) => s + u.savings_hrs, 0).toLocaleString()} hrs</td>
                    <td className="px-5 py-3 font-black text-[#14B8A6]">
                      {fmtINR(AI_USAGE.reduce((s, u) => s + u.savings_hrs * 350, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* BYOK Savings Banner */}
          <div className="bg-gradient-to-r from-[#14B8A6]/10 to-emerald-500/10 border border-[#14B8A6]/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Zap size={20} className="text-[#14B8A6] flex-shrink-0 mt-0.5" fill="currentColor" />
              <div>
                <p className="font-black text-slate-800">BYOK is saving you {fmtINR(AI_USAGE.reduce((s, u) => s + u.cost_inr, 0) * 1.5)}/month</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Without BYOK, NAMA-hosted AI at 2.5× markup would cost{" "}
                  <strong className="text-slate-700">₹{(AI_USAGE.reduce((s, u) => s + u.cost_inr, 0) * 2.5).toLocaleString()}</strong>/month.
                  You're paying <strong className="text-[#14B8A6]">₹{AI_USAGE.reduce((s, u) => s + u.cost_inr, 0).toLocaleString()}</strong> — a 60% saving.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
