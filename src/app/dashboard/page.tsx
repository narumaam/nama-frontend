"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Map,
  FileQuestion,
  Briefcase,
  Bell,
  Shield,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Info,
  UserPlus,
  CheckCircle,
  CreditCard,
  FileText,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { bookingsApi, leadsApi } from "@/lib/api";

// ── Seed data ──────────────────────────────────────────────────────────────

const SEED_KPI = {
  totalRevenue: "₹18.4L",
  revenueTrend: "+12%",
  activeBookings: 23,
  departingThisWeek: 4,
  leadsInPipeline: 47,
  leadsHot: 12,
  leadsWarm: 18,
  leadsCold: 17,
  conversionRate: 34,
  conversionSparkline: [22, 25, 28, 26, 30, 31, 34],
};

const SEED_FUNNEL = [
  { stage: "Leads", count: 47, pct: null as number | null },
  { stage: "Qualified", count: 26, pct: 78 },
  { stage: "Proposals", count: 17, pct: 65 },
  { stage: "Booked", count: 14, pct: 82 },
  { stage: "Completed", count: 13, pct: 92 },
];

const SEED_REVENUE = [
  { month: "Jan", value: 380000 },
  { month: "Feb", value: 420000 },
  { month: "Mar", value: 510000 },
  { month: "Apr", value: 480000 },
  { month: "May", value: 620000 },
  { month: "Jun", value: 580000 },
  { month: "Jul", value: 710000 },
  { month: "Aug", value: 690000 },
  { month: "Sep", value: 820000 },
  { month: "Oct", value: 780000 },
  { month: "Nov", value: 960000 },
  { month: "Dec", value: 1840000 },
];

const SEED_ALERTS = [
  {
    id: 1,
    severity: "HIGH" as const,
    text: "3 leads overdue for follow-up",
    action: "View Leads",
    href: "/dashboard/leads",
  },
  {
    id: 2,
    severity: "HIGH" as const,
    text: "2 bookings pending confirmation",
    action: "Review",
    href: "/dashboard/bookings",
  },
  {
    id: 3,
    severity: "MED" as const,
    text: "Ravi Mehta departs in 2 days — pre-departure checklist pending",
    action: "Open",
    href: "/dashboard/bookings",
  },
  {
    id: 4,
    severity: "MED" as const,
    text: "Invoice #INV-1004 unpaid (15 days)",
    action: "Send Reminder",
    href: "/dashboard/finance",
  },
  {
    id: 5,
    severity: "LOW" as const,
    text: "WhatsApp webhook disconnected",
    action: "Reconnect",
    href: "/dashboard/integrations",
  },
];

const SEED_ACTIVITY = [
  {
    id: 1,
    icon: "user-plus",
    text: "New lead: Ananya Sharma — Dubai Family Package",
    time: "5 min ago",
  },
  {
    id: 2,
    icon: "check-circle",
    text: "Booking confirmed: Mehta Family — Maldives (May 12)",
    time: "32 min ago",
  },
  {
    id: 3,
    icon: "file-text",
    text: "Quote accepted: Ravi & Priya — Europe Tour ₹8.4L",
    time: "1 hr ago",
  },
  {
    id: 4,
    icon: "credit-card",
    text: "Payment received: ₹1,25,000 from Kapoor Group",
    time: "2 hr ago",
  },
  {
    id: 5,
    icon: "message-square",
    text: "WhatsApp reply from Vikram Singh — follow-up scheduled",
    time: "3 hr ago",
  },
  {
    id: 6,
    icon: "user-plus",
    text: "New lead: Corporate group — Thailand MICE 42 pax",
    time: "4 hr ago",
  },
  {
    id: 7,
    icon: "check-circle",
    text: "Itinerary finalised: Bali Honeymoon — Priya & Rahul",
    time: "5 hr ago",
  },
  {
    id: 8,
    icon: "credit-card",
    text: "Deposit link sent to Sharma Family — Dubai ₹45,000",
    time: "6 hr ago",
  },
];

const SEED_DESTINATIONS = [
  { flag: "🇦🇪", name: "Dubai", bookings: 8, revenue: 420000, maxRevenue: 840000 },
  { flag: "🇮🇩", name: "Bali", bookings: 6, revenue: 280000, maxRevenue: 840000 },
  { flag: "🇲🇻", name: "Maldives", bookings: 4, revenue: 610000, maxRevenue: 840000 },
  { flag: "🇹🇭", name: "Thailand", bookings: 3, revenue: 150000, maxRevenue: 840000 },
  { flag: "🇪🇺", name: "Europe", bookings: 2, revenue: 840000, maxRevenue: 840000 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRevenue(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function funnelBoxClass(pct: number | null): string {
  if (pct === null) return "bg-[#1B2E5E] dark:bg-[#2a4080]";
  if (pct >= 80) return "bg-[#14B8A6]";
  if (pct >= 65) return "bg-amber-500";
  return "bg-red-500";
}

function funnelBadgeClass(pct: number | null): string {
  if (pct === null)
    return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
  if (pct >= 80)
    return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
  if (pct >= 65)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
}

function alertStyles(severity: "HIGH" | "MED" | "LOW") {
  if (severity === "HIGH")
    return {
      border: "border-l-red-500",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      icon: <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />,
    };
  if (severity === "MED")
    return {
      border: "border-l-amber-500",
      badge:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      icon: (
        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      ),
    };
  return {
    border: "border-l-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />,
  };
}

function ActivityIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";
  if (type === "user-plus") return <UserPlus className={`${cls} text-teal-500`} />;
  if (type === "check-circle")
    return <CheckCircle className={`${cls} text-green-500`} />;
  if (type === "file-text") return <FileText className={`${cls} text-blue-500`} />;
  if (type === "credit-card")
    return <CreditCard className={`${cls} text-purple-500`} />;
  if (type === "message-square")
    return <MessageSquare className={`${cls} text-amber-500`} />;
  return <Bell className={`${cls} text-slate-400`} />;
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [kpi, setKpi] = useState(SEED_KPI);
  const [alertsSpinning, setAlertsSpinning] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  const maxBarValue = Math.max(...SEED_REVENUE.map((d) => d.value));
  // Current month = Dec (index 11) in our 12-month seed
  const currentMonthIndex = 11;

  // Welcome banner — show once after onboarding completion
  useEffect(() => {
    try {
      const seeded = localStorage.getItem("nama_workspace_seeded");
      const seen = localStorage.getItem("nama_first_visit_seen");
      if (seeded === "1" && seen !== "1") setShowWelcomeBanner(true);
    } catch {
      /* ignore SSR / restricted contexts */
    }
  }, []);

  function dismissWelcomeBanner() {
    setShowWelcomeBanner(false);
    try {
      localStorage.setItem("nama_first_visit_seen", "1");
      localStorage.removeItem("nama_workspace_seeded");
    } catch {
      /* ignore */
    }
  }

  // Attempt to enrich KPI from live API; fall back to seed silently
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [leadsRes, bookingsRes] = await Promise.allSettled([
          leadsApi.list({ size: 200 }).catch(() => null),
          bookingsApi.list().catch(() => null),
        ]);

        if (cancelled) return;

        const updates: Partial<typeof SEED_KPI> = {};

        if (leadsRes.status === "fulfilled" && leadsRes.value) {
          const raw = leadsRes.value as { items?: Array<{ status?: string }>; total?: number } | null;
          const items = raw?.items ?? (Array.isArray(raw) ? (raw as Array<{ status?: string }>) : []);
          if (items.length > 0) {
            updates.leadsInPipeline = raw?.total ?? items.length;
            updates.leadsHot =
              items.filter((l) => l.status === "HOT").length || SEED_KPI.leadsHot;
            updates.leadsWarm =
              items.filter((l) => l.status === "WARM").length || SEED_KPI.leadsWarm;
            updates.leadsCold =
              items.filter((l) => l.status === "COLD").length || SEED_KPI.leadsCold;
          }
        }

        if (bookingsRes.status === "fulfilled" && bookingsRes.value) {
          const bookings = bookingsRes.value as Array<{ status?: string }>;
          if (bookings.length > 0) {
            updates.activeBookings =
              bookings.filter(
                (b) => b.status === "CONFIRMED" || b.status === "ACTIVE"
              ).length || SEED_KPI.activeBookings;
          }
        }

        setKpi((prev) => ({ ...prev, ...updates }));
      } catch {
        /* keep seed */
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleRefreshAlerts() {
    setAlertsSpinning(true);
    setTimeout(() => setAlertsSpinning(false), 1200);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] p-6 space-y-6">
      {/* Welcome banner */}
      {showWelcomeBanner && (
        <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/40 rounded-2xl p-4 text-teal-800 dark:text-teal-300">
          <span className="text-xl leading-none">🎉</span>
          <p className="flex-1 text-sm font-medium">
            <span className="font-bold">Your workspace is ready!</span> We added
            2 sample leads and a Maldives itinerary to help you explore NAMA.
          </p>
          <button
            onClick={dismissWelcomeBanner}
            className="text-teal-500 hover:text-teal-700 font-bold text-xl leading-none px-1"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2E5E] dark:text-slate-100">
            Agency Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            April 2026 · All figures in INR
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-full font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Total Revenue
          </p>
          <p className="text-2xl font-bold text-[#1B2E5E] dark:text-slate-100 mt-1">
            {kpi.totalRevenue}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-semibold text-green-500">
              {kpi.revenueTrend}
            </span>
            <span className="text-xs text-slate-400">vs last month</span>
          </div>
        </div>

        {/* Active Bookings */}
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Active Bookings
          </p>
          <p className="text-2xl font-bold text-[#1B2E5E] dark:text-slate-100 mt-1">
            {kpi.activeBookings}
          </p>
          <p className="text-xs text-amber-500 font-medium mt-2">
            {kpi.departingThisWeek} departing this week
          </p>
        </div>

        {/* Leads in Pipeline */}
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Leads in Pipeline
          </p>
          <p className="text-2xl font-bold text-[#1B2E5E] dark:text-slate-100 mt-1">
            {kpi.leadsInPipeline}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs font-semibold text-red-500">
              {kpi.leadsHot} HOT
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-semibold text-amber-500">
              {kpi.leadsWarm} WARM
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-semibold text-slate-400">
              {kpi.leadsCold} COLD
            </span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Conversion Rate
          </p>
          <p className="text-2xl font-bold text-[#1B2E5E] dark:text-slate-100 mt-1">
            {kpi.conversionRate}%
          </p>
          {/* CSS sparkline bars */}
          <div className="flex items-end gap-0.5 mt-2 h-6">
            {kpi.conversionSparkline.map((val, i) => {
              const maxVal = Math.max(...kpi.conversionSparkline);
              const heightPct = Math.round((val / maxVal) * 100);
              const isLast = i === kpi.conversionSparkline.length - 1;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-all ${
                    isLast
                      ? "bg-[#14B8A6]"
                      : "bg-slate-200 dark:bg-white/10"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-1">Last 7 months</p>
        </div>
      </div>

      {/* ── Sales Funnel ── */}
      <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-[#1B2E5E] dark:text-slate-100 mb-5">
          Sales Funnel — This Month
        </h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {SEED_FUNNEL.map((stage, i) => (
            <div
              key={stage.stage}
              className="flex items-center gap-1 flex-shrink-0"
            >
              {/* Stage box */}
              <div
                className={`${funnelBoxClass(stage.pct)} rounded-xl px-4 py-3 text-center min-w-[90px]`}
              >
                <p className="text-xs font-medium text-white/80">
                  {stage.stage}
                </p>
                <p className="text-xl font-bold text-white">{stage.count}</p>
                {stage.pct !== null && (
                  <span
                    className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${funnelBadgeClass(stage.pct)}`}
                  >
                    {stage.pct}%
                  </span>
                )}
              </div>
              {/* Arrow */}
              {i < SEED_FUNNEL.length - 1 && (
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <ArrowRight className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                  <span className="text-xs text-slate-400">
                    {SEED_FUNNEL[i + 1].pct}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column grid: main (2/3) + sidebar (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Revenue Chart + Quick Actions + Destinations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#1B2E5E] dark:text-slate-100 mb-5">
              Revenue — Last 12 Months
            </h2>
            <div className="flex gap-3">
              {/* Y-axis labels */}
              <div
                className="flex flex-col justify-between text-right pb-6"
                style={{ minWidth: 40 }}
              >
                {["₹20L", "₹15L", "₹10L", "₹5L", "₹0"].map((label) => (
                  <span
                    key={label}
                    className="text-xs text-slate-400 leading-none"
                  >
                    {label}
                  </span>
                ))}
              </div>
              {/* Bars */}
              <div className="flex-1 min-w-0">
                <div className="flex items-end gap-1 h-40">
                  {SEED_REVENUE.map((d, i) => {
                    const heightPct = (d.value / maxBarValue) * 100;
                    const isCurrent = i === currentMonthIndex;
                    return (
                      <div
                        key={d.month}
                        className="flex-1 flex flex-col items-center h-full group"
                        title={formatRevenue(d.value)}
                      >
                        <div className="flex-1 w-full flex items-end">
                          <div
                            className={`w-full rounded-t-md transition-all ${
                              isCurrent
                                ? "bg-[#14B8A6]"
                                : "bg-[#1B2E5E] dark:bg-[#2a4080] group-hover:opacity-80"
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Month labels */}
                <div className="flex gap-1 mt-1.5">
                  {SEED_REVENUE.map((d, i) => (
                    <div key={d.month} className="flex-1 text-center">
                      <span
                        className={`text-[10px] font-medium ${
                          i === currentMonthIndex
                            ? "text-[#14B8A6] font-bold"
                            : "text-slate-400"
                        }`}
                      >
                        {d.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#1B2E5E] dark:text-slate-100 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                {
                  label: "New Lead",
                  icon: Users,
                  href: "/dashboard/leads",
                },
                {
                  label: "New Itinerary",
                  icon: Map,
                  href: "/dashboard/itineraries",
                },
                {
                  label: "New Quote",
                  icon: FileQuestion,
                  href: "/dashboard/quotations",
                },
                {
                  label: "View Bookings",
                  icon: Briefcase,
                  href: "/dashboard/bookings",
                },
                {
                  label: "Run Reminders",
                  icon: Bell,
                  href: "/dashboard/automations",
                },
                {
                  label: "Sentinel",
                  icon: Shield,
                  href: "/dashboard/sentinel",
                },
              ].map(({ label, icon: Icon, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-[#14B8A6]/50 dark:hover:border-[#14B8A6]/30 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div className="h-9 w-9 rounded-xl bg-[#1B2E5E]/5 dark:bg-white/5 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[#1B2E5E] dark:text-[#14B8A6]" />
                  </div>
                  <span className="text-xs font-medium text-center text-slate-600 dark:text-slate-300 leading-tight">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Destinations */}
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#1B2E5E] dark:text-slate-100 mb-4">
              Top Destinations — This Month
            </h2>
            <div className="space-y-3">
              {SEED_DESTINATIONS.map((dest) => {
                const barWidth = Math.round(
                  (dest.revenue / dest.maxRevenue) * 100
                );
                return (
                  <div key={dest.name} className="flex items-center gap-3">
                    <span className="text-xl leading-none flex-shrink-0">
                      {dest.flag}
                    </span>
                    <div className="w-20 flex-shrink-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {dest.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {dest.bookings} bookings
                      </p>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14B8A6] rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-14 text-right flex-shrink-0">
                      {formatRevenue(dest.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">
          {/* Operations Alerts */}
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#1B2E5E] dark:text-slate-100">
                Operations Alerts
              </h2>
              <button
                onClick={handleRefreshAlerts}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                title="Refresh alerts"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                    alertsSpinning ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
            <div className="space-y-2.5">
              {SEED_ALERTS.map((alert) => {
                const styles = alertStyles(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={`border-l-4 ${styles.border} bg-slate-50 dark:bg-white/[0.03] rounded-r-xl pl-3 pr-3 py-2.5`}
                  >
                    <div className="flex items-start gap-2">
                      {styles.icon}
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${styles.badge}`}
                        >
                          {alert.severity}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                          {alert.text}
                        </p>
                        <Link
                          href={alert.href}
                          className="text-xs font-semibold text-[#14B8A6] hover:underline mt-1 inline-block"
                        >
                          {alert.action} →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#1B2E5E] dark:text-slate-100 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {SEED_ACTIVITY.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ActivityIcon type={event.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                      {event.text}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
