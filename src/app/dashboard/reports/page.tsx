"use client";

/**
 * M18 — Advanced Reporting & Business Intelligence
 * --------------------------------------------------
 * 4 tabs: Overview · Pipeline · Team Performance · Forecasts
 */

import React, { useState, useEffect } from "react";
import {
  BarChart2, TrendingUp, TrendingDown, Download,
  Users, DollarSign,
  ArrowUp, ArrowDown, Minus, Filter, RefreshCw,
  FileText, Crown, Target,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "overview" | "pipeline" | "team" | "forecasts";

interface AgentPerformance {
  user_id?: number;
  name: string;
  role?: string;
  leads_assigned: number;
  leads_qualified: number;
  quotations_sent: number;
  bookings_closed: number;
  total_revenue: number;
  conversion_rate: number;
}

interface PipelineStage {
  stage: string;
  count: number;
  pct: number;
  color: string;
  avg_days: number;
}

// ── Seed Data ──────────────────────────────────────────────────────────────────
const SEED_TEAM_PERFORMANCE: AgentPerformance[] = [
  { name: "Priya Mehta",  role: "R3_SALES_MANAGER", leads_assigned: 24, leads_qualified: 8,  quotations_sent: 12, bookings_closed: 5, total_revenue: 875000, conversion_rate: 33.3 },
  { name: "Arjun Shah",   role: "R3_SALES_MANAGER", leads_assigned: 18, leads_qualified: 5,  quotations_sent: 8,  bookings_closed: 3, total_revenue: 520000, conversion_rate: 27.8 },
  { name: "Nisha Patel",  role: "R4_OPS_EXECUTIVE", leads_assigned: 12, leads_qualified: 3,  quotations_sent: 5,  bookings_closed: 2, total_revenue: 340000, conversion_rate: 25.0 },
  { name: "Rohit Verma",  role: "R3_SALES_MANAGER", leads_assigned: 15, leads_qualified: 2,  quotations_sent: 4,  bookings_closed: 1, total_revenue: 175000, conversion_rate: 13.3 },
];

const SEED_PIPELINE: PipelineStage[] = [
  { stage: "New Leads", count: 892, pct: 100, color: "#14B8A6", avg_days: 0 },
  { stage: "Qualified",  count: 431, pct: 48,  color: "#0EA5E9", avg_days: 2.1 },
  { stage: "Quoted",     count: 278, pct: 31,  color: "#8B5CF6", avg_days: 4.7 },
  { stage: "Booked",     count: 143, pct: 16,  color: "#10B981", avg_days: 8.3 },
];

const SEED_DESTINATIONS = [
  { name: "Bali, Indonesia",   bookings: 48, revenue: 2840000 },
  { name: "Maldives",          bookings: 31, revenue: 4120000 },
  { name: "Rajasthan, India",  bookings: 67, revenue: 1890000 },
  { name: "Dubai, UAE",        bookings: 53, revenue: 2460000 },
  { name: "Thailand",          bookings: 42, revenue: 1470000 },
  { name: "Europe (Schengen)", bookings: 29, revenue: 3850000 },
];

const MONTHLY_REVENUE = [
  { month: "Nov", revenue: 2850000 },
  { month: "Dec", revenue: 3420000 },
  { month: "Jan", revenue: 2980000 },
  { month: "Feb", revenue: 3760000 },
  { month: "Mar", revenue: 4210000 },
  { month: "Apr", revenue: 4890000 },
];

const FORECAST_DATA = [
  { period: "Next 30d", base: 5200000,  optimistic: 6500000,  conservative: 4100000 },
  { period: "Next 60d", base: 9800000,  optimistic: 12500000, conservative: 7800000 },
  { period: "Next 90d", base: 14200000, optimistic: 18000000, conservative: 11000000 },
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
  const csv  = [keys.join(","), ...rows.map(r => keys.map(k => `"${r[k]}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

// ── SVG Line Chart ─────────────────────────────────────────────────────────────
function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length < 2) return null;
  const W = 700; const H = 180;
  const pad = { top: 16, right: 16, bottom: 28, left: 56 };
  const w = W - pad.left - pad.right;
  const h = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map(d => d.value)) * 1.05;
  const xScale = (i: number) => (i / (data.length - 1)) * w;
  const yScale = (v: number) => h - (v / maxV) * h;
  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d.value).toFixed(1)}`).join(" ");
  const fillPath = `${linePath} L${xScale(data.length - 1)},${h} L0,${h} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: maxV * t, y: h - h * t }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="lgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={0} y1={t.y} x2={w} y2={t.y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={-8} y={t.y + 4} textAnchor="end" fill="#94a3b8" fontSize={10}>{fmtINR(t.v)}</text>
          </g>
        ))}
        <path d={fillPath} fill="url(#lgGrad)" />
        <path d={linePath} fill="none" stroke="#14B8A6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.value)} r={4} fill="#14B8A6" />
            <text x={xScale(i)} y={h + 18} textAnchor="middle" fill="#94a3b8" fontSize={11}>{d.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ── SVG Bar Chart (grouped) ────────────────────────────────────────────────────
function GroupedBarChart({ data }: {
  data: { label: string; base: number; optimistic: number; conservative: number }[];
}) {
  const W = 700; const H = 220;
  const pad = { top: 16, right: 20, bottom: 40, left: 56 };
  const w = W - pad.left - pad.right;
  const h = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.flatMap(d => [d.base, d.optimistic, d.conservative])) * 1.1;
  const yScale = (v: number) => h - (v / maxV) * h;
  const groupW = w / data.length;
  const barW = (groupW * 0.7) / 3;
  const gap = (groupW * 0.3) / 4;
  const COLORS = ["#14B8A6", "#10B981", "#F59E0B"];
  const KEYS = ["base", "optimistic", "conservative"] as const;
  const LABELS = ["At Current Pace", "Optimistic", "Conservative"];
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: maxV * t, y: h - h * t }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <g transform={`translate(${pad.left},${pad.top})`}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={0} y1={t.y} x2={w} y2={t.y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={-8} y={t.y + 4} textAnchor="end" fill="#94a3b8" fontSize={10}>{fmtINR(t.v)}</text>
          </g>
        ))}
        {data.map((d, gi) => {
          const groupX = gi * groupW + gap;
          return (
            <g key={gi}>
              {KEYS.map((key, ki) => {
                const x = groupX + ki * (barW + gap);
                const barH = h - yScale(d[key]);
                const y = yScale(d[key]);
                return (
                  <rect key={key} x={x} y={y} width={barW} height={barH} fill={COLORS[ki]} rx={3} opacity={0.85} />
                );
              })}
              <text x={groupX + (barW * 3 + gap * 2) / 2} y={h + 16} textAnchor="middle" fill="#94a3b8" fontSize={11}>{d.label}</text>
            </g>
          );
        })}
      </g>
      {/* Legend */}
      <g transform={`translate(${pad.left},${H - 4})`}>
        {LABELS.map((lbl, i) => (
          <g key={lbl} transform={`translate(${i * 150},0)`}>
            <rect x={0} y={-8} width={10} height={10} fill={COLORS[i]} rx={2} />
            <text x={14} y={0} fill="#64748b" fontSize={10}>{lbl}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ── Tab definitions ────────────────────────────────────────────────────────────
const REPORT_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",        icon: BarChart2 },
  { id: "pipeline",  label: "Pipeline",         icon: Filter },
  { id: "team",      label: "Team Performance", icon: Users },
  { id: "forecasts", label: "Forecasts",        icon: Target },
];

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ liveKPIs }: { liveKPIs: Record<string, unknown> | null }) {
  const totalRevenue = liveKPIs
    ? ((liveKPIs as { gmv?: { value: number } }).gmv?.value ?? 4890000)
    : 4890000;
  const leadsConverted = 143;
  const avgDealValue = Math.round(totalRevenue / leadsConverted);
  const pipelineValue = totalRevenue * 2.4;

  const overviewKPIs = [
    { label: "Total Revenue (Month)", value: fmtINR(totalRevenue), trend: 18, sub: liveKPIs ? "live from DB" : "est.", icon: TrendingUp, color: "bg-[#14B8A6]" },
    { label: "Leads Converted",        value: String(leadsConverted), trend: 12, sub: "this month", icon: Users, color: "bg-violet-500" },
    { label: "Avg Deal Value",          value: fmtINR(avgDealValue), trend: 7, sub: "per booking", icon: DollarSign, color: "bg-blue-500" },
    { label: "Pipeline Value",          value: fmtINR(pipelineValue), trend: 5, sub: "total open", icon: FileText, color: "bg-amber-500" },
  ];

  const chartData = MONTHLY_REVENUE.map(d => ({ label: d.month, value: d.revenue }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewKPIs.map(k => (
          <StatCard key={k.label} label={k.label} value={k.value} trend={k.trend} sub={k.sub} icon={k.icon} color={k.color} />
        ))}
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-extrabold text-[#0F172A]">Revenue Trend — Last 6 Months</h3>
            <p className="text-xs text-slate-400 mt-0.5">Monthly revenue</p>
          </div>
          <button
            onClick={() => exportCSV(MONTHLY_REVENUE as unknown as Record<string, unknown>[], "nama-revenue-trend.csv")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
        <LineChart data={chartData} />
      </div>

      {/* Top Destinations Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-extrabold text-[#0F172A]">Top Destinations</h3>
          <button
            onClick={() => exportCSV(SEED_DESTINATIONS as unknown as Record<string, unknown>[], "nama-destinations.csv")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Destination", "Bookings", "Revenue"].map(h => (
                  <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...SEED_DESTINATIONS].sort((a, b) => b.revenue - a.revenue).map((dest, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-700">{dest.name}</td>
                  <td className="px-5 py-3 text-slate-600">{dest.bookings}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">{fmtINR(dest.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline Tab ───────────────────────────────────────────────────────────────
function PipelineTab() {
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>(SEED_PIPELINE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("nama_token") : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/v1/analytics/pipeline", { headers })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then((data: PipelineStage[] | null) => {
        if (data && data.length > 0) setPipelineData(data);
        setLoading(false);
      });
  }, []);

  const stageConversions = pipelineData.map((stage, i) => {
    if (i === 0) return null;
    const prev = pipelineData[i - 1];
    return {
      label: `${prev.stage} → ${stage.stage}`,
      rate: Math.round((stage.count / prev.count) * 100),
    };
  }).filter(Boolean) as { label: string; rate: number }[];

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <RefreshCw size={12} className="animate-spin" /> Loading pipeline data...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Visualization */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6">
          <h3 className="font-extrabold text-[#0F172A] mb-5">Pipeline Funnel</h3>
          <div className="space-y-3">
            {pipelineData.map((stage, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 font-semibold">{stage.stage}</span>
                  <span className="font-black text-slate-800">{stage.count.toLocaleString("en-IN")} ({stage.pct}%)</span>
                </div>
                <div className="h-10 bg-slate-50 rounded-xl overflow-hidden">
                  <div
                    className="h-full rounded-xl flex items-center px-3 transition-all duration-500"
                    style={{ width: `${stage.pct}%`, background: stage.color }}
                  >
                    {stage.pct >= 20 && (
                      <span className="text-white text-[11px] font-black">{stage.pct}%</span>
                    )}
                  </div>
                </div>
                {i < pipelineData.length - 1 && (
                  <div className="text-[10px] text-slate-400 mt-0.5 ml-1">
                    → {Math.round((pipelineData[i + 1].count / stage.count) * 100)}% pass-through
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stage Stats */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h3 className="font-extrabold text-[#0F172A] mb-4">Stage Conversion Rates</h3>
            <div className="space-y-4">
              {stageConversions.map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex-1">{row.label}</span>
                  <span className={`text-sm font-black px-3 py-1 rounded-full ${
                    row.rate >= 40 ? "bg-emerald-50 text-emerald-700" :
                    row.rate >= 20 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                  }`}>{row.rate}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h3 className="font-extrabold text-[#0F172A] mb-4">Average Time in Stage</h3>
            <div className="space-y-3">
              {pipelineData.map((stage, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                  <span className="flex-1 text-sm text-slate-600">{stage.stage}</span>
                  <span className="text-sm font-bold text-slate-800">
                    {stage.avg_days === 0 ? "Entry point" : `${stage.avg_days}d avg`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Team Performance Tab ───────────────────────────────────────────────────────
function TeamTab() {
  const [teamPerf, setTeamPerf] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nama_token") : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/v1/analytics/team-performance", { headers })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then((data: AgentPerformance[] | null) => {
        if (data && data.length > 0) setTeamPerf(data);
        else setTeamPerf(SEED_TEAM_PERFORMANCE);
        setLoading(false);
      });
  }, []);

  const displayTeam = teamPerf.length > 0 ? teamPerf : SEED_TEAM_PERFORMANCE;
  const topAgent = [...displayTeam].sort((a, b) => b.total_revenue - a.total_revenue)[0];

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <RefreshCw size={12} className="animate-spin" /> Loading team data...
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={fmtINR(displayTeam.reduce((s, a) => s + a.total_revenue, 0))}
          icon={DollarSign} color="bg-[#14B8A6]"
        />
        <StatCard
          label="Total Leads Assigned"
          value={String(displayTeam.reduce((s, a) => s + a.leads_assigned, 0))}
          icon={Users} color="bg-blue-500"
        />
        <StatCard
          label="Avg Conversion Rate"
          value={`${(displayTeam.reduce((s, a) => s + a.conversion_rate, 0) / Math.max(displayTeam.length, 1)).toFixed(1)}%`}
          icon={ArrowUp} color="bg-violet-500"
        />
        <StatCard
          label="Top Agent"
          value={topAgent?.name ?? "—"}
          sub={topAgent ? fmtINR(topAgent.total_revenue) : ""}
          icon={Crown} color="bg-amber-500"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-extrabold text-[#0F172A]">Agent Performance Leaderboard</h3>
          <button
            onClick={() => exportCSV(displayTeam as unknown as Record<string, unknown>[], "nama-team-performance.csv")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Agent", "Role", "Leads", "Qualified", "Quotes Sent", "Bookings", "Revenue", "Conv. %"].map(h => (
                  <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...displayTeam].sort((a, b) => b.total_revenue - a.total_revenue).map((agent, i) => {
                const conv = agent.conversion_rate;
                const convColor = conv > 20 ? "bg-emerald-50 text-emerald-700" : conv >= 10 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600";
                const isTop = i === 0;
                const roleName = (agent.role || "")
                  .replace("R3_SALES_MANAGER", "Sales")
                  .replace("R4_OPS_EXECUTIVE", "Ops")
                  .replace("R2_ORG_ADMIN", "Admin")
                  .replace("R0_NAMA_OWNER", "Owner")
                  .replace("R1_SUPER_ADMIN", "Super Admin")
                  .replace("R5_FINANCE_ADMIN", "Finance");
                return (
                  <tr key={i} className={`border-t border-slate-50 hover:bg-slate-50/50 ${isTop ? "bg-amber-50/30" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#14B8A6] to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-black">
                            {agent.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          {isTop && (
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                              <Crown size={8} className="text-white" />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-slate-800">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {roleName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
                          {roleName}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{agent.leads_assigned}</td>
                    <td className="px-5 py-4 text-slate-600">{agent.leads_qualified}</td>
                    <td className="px-5 py-4 text-slate-600">{agent.quotations_sent}</td>
                    <td className="px-5 py-4 text-slate-600">{agent.bookings_closed}</td>
                    <td className="px-5 py-4 font-black text-[#0F172A]">₹{agent.total_revenue.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${convColor}`}>
                        {conv.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-5 py-3 font-black text-slate-500 text-xs uppercase" colSpan={2}>Team Total</td>
                <td className="px-5 py-3 font-black text-slate-700">{displayTeam.reduce((s, a) => s + a.leads_assigned, 0)}</td>
                <td className="px-5 py-3 font-black text-slate-700">{displayTeam.reduce((s, a) => s + a.leads_qualified, 0)}</td>
                <td className="px-5 py-3 font-black text-slate-700">{displayTeam.reduce((s, a) => s + a.quotations_sent, 0)}</td>
                <td className="px-5 py-3 font-black text-slate-700">{displayTeam.reduce((s, a) => s + a.bookings_closed, 0)}</td>
                <td className="px-5 py-3 font-black text-[#14B8A6]">
                  ₹{displayTeam.reduce((s, a) => s + a.total_revenue, 0).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-3 font-black text-[#14B8A6]">
                  {(displayTeam.reduce((s, a) => s + a.conversion_rate, 0) / Math.max(displayTeam.length, 1)).toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Forecasts Tab ──────────────────────────────────────────────────────────────
function ForecastsTab() {
  const HISTORICAL_CONV_RATE = 16; // %
  const currentPipelineValue = 4890000 * 2.4;

  const chartData = FORECAST_DATA.map(d => ({
    label: d.period,
    base: d.base,
    optimistic: d.optimistic,
    conservative: d.conservative,
  }));

  return (
    <div className="space-y-6">
      {/* Scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "At Current Pace", key: "base" as const,         color: "bg-[#14B8A6]",   desc: `Pipeline × ${HISTORICAL_CONV_RATE}% historical conv. rate`, icon: TrendingUp },
          { label: "Optimistic",      key: "optimistic" as const,   color: "bg-emerald-500", desc: "+25% conversion boost from active follow-ups", icon: ArrowUp },
          { label: "Conservative",    key: "conservative" as const, color: "bg-amber-500",   desc: "-20% due to seasonality & lead slowdown", icon: TrendingDown },
        ].map(scenario => (
          <div key={scenario.key} className="bg-white border border-slate-100 rounded-2xl p-5">
            <div className={`w-10 h-10 ${scenario.color} rounded-xl flex items-center justify-center mb-3`}>
              <scenario.icon size={18} className="text-white" />
            </div>
            <h3 className="font-extrabold text-[#0F172A] text-sm mb-1">{scenario.label}</h3>
            <p className="text-xs text-slate-400 mb-3">{scenario.desc}</p>
            <div className="space-y-1.5">
              {FORECAST_DATA.map((d, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-slate-500">{d.period}</span>
                  <span className="font-black text-slate-800">{fmtINR(d[scenario.key])}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="mb-5">
          <h3 className="font-extrabold text-[#0F172A]">Revenue Projection by Scenario</h3>
          <p className="text-xs text-slate-400 mt-0.5">Based on current pipeline × conversion rates</p>
        </div>
        <GroupedBarChart data={chartData} />
      </div>

      {/* Assumptions */}
      <div className="bg-gradient-to-r from-[#0F172A] to-slate-800 border border-[#14B8A6]/20 rounded-2xl px-6 py-5">
        <p className="text-xs font-black text-[#14B8A6] uppercase tracking-widest mb-3">Forecast Assumptions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Pipeline Value",        value: fmtINR(currentPipelineValue) },
            { label: "Historical Conv. Rate",  value: `${HISTORICAL_CONV_RATE}%` },
            { label: "Avg Deal Value",         value: fmtINR(34200) },
            { label: "Active Leads",           value: "892" },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="text-white font-black text-sm mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveKPIs, setLiveKPIs] = useState<any | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nama_token") : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/v1/analytics/dashboard", { headers })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => { if (data) setLiveKPIs(data); });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Reports & BI</h1>
          <p className="text-slate-500 mt-2 font-medium">Advanced business intelligence across all modules.</p>
        </div>
        <div className="flex items-center gap-2">
          {liveKPIs && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live data
            </span>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {REPORT_TABS.map(t => (
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

      {/* Tab Content */}
      {activeTab === "overview"  && <OverviewTab liveKPIs={liveKPIs} />}
      {activeTab === "pipeline"  && <PipelineTab />}
      {activeTab === "team"      && <TeamTab />}
      {activeTab === "forecasts" && <ForecastsTab />}
    </div>
  );
}
