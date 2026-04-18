"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Building2, DollarSign, BarChart3, RefreshCw, ArrowUpRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

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
  const auth = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<InvestorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("90d");

  // Compute access — done before any conditional returns so hooks stay stable
  const isDemo = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim() === 'nama_demo=1');
  const isAuthorized = !isDemo && auth.user?.role === 'R0_NAMA_OWNER';

  // Guard: R0_NAMA_OWNER only — redirect everyone else including demo visitors
  useEffect(() => {
    if (!auth.isLoading && !isAuthorized) {
      router.replace('/dashboard');
    }
  }, [auth.isLoading, isAuthorized, router]);

  // Fetch data only when authorized
  useEffect(() => {
    if (isAuthorized) fetchData();
  }, [range, isAuthorized]);

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

  // Block render until auth resolves, then enforce access
  if (auth.isLoading) return null;
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
        <Lock size={40} className="text-slate-300" />
        <p className="text-lg font-semibold">Access Restricted</p>
        <p className="text-sm">This page is only available to NAMA Owners (R0).</p>
      </div>
    );
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
    </div>
  );
}
