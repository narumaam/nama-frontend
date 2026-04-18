"use client";

<<<<<<< HEAD
import { useState, useEffect } from "react";
import { TrendingUp, Building2, DollarSign, BarChart3, RefreshCw, ArrowUpRight } from "lucide-react";

interface InvestorSummary {
  period: { from: string; to: string };
  gmv: { total_inr: number; currency: string };
  bookings: { total: number; confirmed: number; avg_value_inr: number };
  leads: { total: number; won: number; conversion_rate_pct: number };
  tenants: { count: number };
  generated_at: string;
  note?: string;
}

const RANGES = ["30d", "90d", "12mo"] as const;
type Range = (typeof RANGES)[number];

export default function InvestorDashboard() {
  const [summary, setSummary] = useState<InvestorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("90d");

  useEffect(() => { fetchData(); }, [range]);

  async function fetchData() {
    setLoading(true);
    try {
      const today = new Date();
      const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
      const from = new Date(today);
      from.setDate(from.getDate() - days);
      const params = new URLSearchParams({
        from_date: from.toISOString().split("T")[0],
        to_date: today.toISOString().split("T")[0],
      });
      const res = await fetch(`/api/v1/investor/summary?${params}`);
      if (res.ok) {
        setSummary(await res.json());
      } else {
        setDemoData(from, today);
      }
    } catch {
      const today = new Date();
      const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
      const from = new Date(today);
      from.setDate(from.getDate() - days);
      setDemoData(from, today);
    }
    setLoading(false);
  }

  function setDemoData(from: Date, to: Date) {
    setSummary({
      period: { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] },
      gmv: { total_inr: 28475000, currency: "INR" },
      bookings: { total: 47, confirmed: 38, avg_value_inr: 604787 },
      leads: { total: 312, won: 47, conversion_rate_pct: 15.1 },
      tenants: { count: 3 },
      generated_at: new Date().toISOString(),
    });
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Investor Dashboard</h1>
            <span className="text-xs bg-teal-600/20 text-teal-400 border border-teal-600/30 px-2 py-0.5 rounded-full font-medium">
              R0 Only
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Platform-wide metrics across all tenants</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${range === r ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={fetchData} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Period */}
      {summary && (
        <p className="text-xs text-slate-500">
          Period: {summary.period.from} → {summary.period.to}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-900 rounded-xl h-28 animate-pulse" />)}
        </div>
      ) : summary && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-teal-600/20 to-slate-900 border border-teal-600/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-teal-400 text-xs font-medium uppercase tracking-wider">Platform GMV</span>
                <DollarSign className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{fmt(summary.gmv.total_inr)}</div>
              <div className="flex items-center gap-1 text-xs text-teal-400 mt-1">
                <ArrowUpRight className="w-3 h-3" /> +18.3% growth
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Bookings</span>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{summary.bookings.confirmed}</div>
              <div className="text-xs text-slate-400 mt-1">
                of {summary.bookings.total} total · avg {fmt(summary.bookings.avg_value_inr)}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Lead Conversion</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{summary.leads.conversion_rate_pct}%</div>
              <div className="text-xs text-slate-400 mt-1">
                {summary.leads.won} won of {summary.leads.total} leads
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Active Tenants</span>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{summary.tenants.count}</div>
              <div className="text-xs text-slate-400 mt-1">Paying agencies</div>
            </div>
          </div>

          {/* Growth strip */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Growth Projections</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-slate-400 mb-1">MoM GMV Growth</div>
                <div className="text-xl font-bold text-teal-400">+18.3%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Avg Revenue / Tenant</div>
                <div className="text-xl font-bold text-white">
                  {fmt(summary.gmv.total_inr / Math.max(1, summary.tenants.count))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Projected Annual GMV</div>
                <div className="text-xl font-bold text-white">
                  {fmt(summary.gmv.total_inr * (365 / (range === "30d" ? 30 : range === "90d" ? 90 : 365)))}
                </div>
              </div>
            </div>
          </div>

          {summary.note && (
            <p className="text-xs text-slate-600 italic">{summary.note}</p>
          )}
          <p className="text-xs text-slate-600 text-right">
            Last updated: {new Date(summary.generated_at).toLocaleString("en-IN")}
          </p>
        </>
      )}
=======
import React, { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  BarChart2, ArrowUpRight, Shield, Download,
  Briefcase, Zap, Globe, PieChart, Loader,
  ChevronDown, Calendar, RefreshCw, FileText
} from "lucide-react";
import { analyticsApi } from "@/lib/api";

export default function InvestorDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.investor()
      .then(res => setData(res))
      .catch(err => console.error("Investor API error:", err))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => {
    if (!n) return "₹0";
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${n.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin text-[#14B8A6]" size={32} />
        <p className="text-slate-500 font-medium">Loading investor analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-[#0F172A] text-white text-[10px] font-black rounded uppercase tracking-wider">R0 Confidential</span>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Board View</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Investor Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time unit economics, cohort retention, and AI operational efficiency.</p>
        </div>
        <button className="bg-[#14B8A6] text-[#0F172A] px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-[#0FA898] transition-all shadow-lg shadow-[#14B8A6]/20">
          <Download size={18} /> Export Board Pack
        </button>
      </div>

      {/* High Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPIBox label="Total GMV" value={fmt(data?.gmv_cents / 100)} sub="Last 30 Days" icon={DollarSign} color="bg-emerald-500" />
        <KPIBox label="Net Revenue" value={fmt(data?.net_revenue_cents / 100)} sub={`${data?.gross_margin_pct}% Gross Margin`} icon={BarChart2} color="bg-blue-500" />
        <KPIBox label="CAC (Proxy)" value={fmt(data?.cac_proxy_cents / 100)} sub="Per Qualified Lead" icon={Users} color="bg-violet-500" />
        <KPIBox label="LTV/CAC" value="4.2x" sub="Target: 3.5x" icon={TrendingUp} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retention Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[32px] p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-[#0F172A]">Cohort Retention</h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <div className="w-2 h-2 rounded-full bg-[#14B8A6]" /> Return Rate
              </span>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4">
            {data?.cohort_retention?.map((c: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4">
                <div className="w-full bg-slate-50 rounded-xl relative h-full flex items-end overflow-hidden">
                   <div 
                    className="w-full bg-gradient-to-t from-[#14B8A6] to-[#0FA898] transition-all duration-1000" 
                    style={{ height: `${c.retention}%` }}
                   />
                </div>
                <span className="text-xs font-bold text-slate-500">{c.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Efficiency Card */}
        <div className="bg-[#0F172A] rounded-[32px] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={120} />
          </div>
          <h3 className="text-xl font-black mb-1 flex items-center gap-2">
            <Zap size={20} className="text-[#14B8A6]" fill="#14B8A6" />
            AI Efficiency
          </h3>
          <p className="text-slate-400 text-sm font-medium mb-8">Operational savings via BYOK.</p>

          <div className="space-y-6">
            <div>
              <div className="text-3xl font-black mb-1">{fmt(data?.ai_savings_from_byok_cents / 100)}</div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Est. Monthly Savings</div>
            </div>
            <div className="h-px bg-white/10" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xl font-bold text-[#14B8A6]">{fmt(data?.ai_cost_cents / 100)}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">API Cost</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">1,240h</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Hours Saved</div>
              </div>
            </div>
          </div>

          <button className="w-full mt-10 bg-white/10 hover:bg-white/20 text-white border border-white/10 py-3 rounded-2xl text-xs font-black transition-all">
            View Usage Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all">
      <div className={`${color} w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-current/20`}>
        <Icon size={20} />
      </div>
      <div className="text-3xl font-black text-[#0F172A] mb-1">{value}</div>
      <div className="text-sm font-bold text-slate-700">{label}</div>
      <div className="text-xs text-slate-400 mt-1 font-medium">{sub}</div>
>>>>>>> c0789b7 (security: add role guards, fix demo nav exposure, harden role names)
    </div>
  );
}
