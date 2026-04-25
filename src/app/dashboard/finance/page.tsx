"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  BarChart2,
  Send,
  Download,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CreditCard,
  FileText,
  DollarSign,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
type InvoiceStatus = "PAID" | "UNPAID" | "OVERDUE";
type PaymentMethod = "Bank Transfer" | "Razorpay" | "Cash";
type LineItemStatus = "CONFIRMED" | "PENDING" | "ESTIMATED";

interface LineItem {
  component: string;
  description: string;
  netCost: number;
  grossPrice: number;
  margin: number;
  status: LineItemStatus;
}

interface Quotation {
  id: string;
  client: string;
  from: string;
  to: string;
  amount: number;
  margin: number;
  createdDate: string;
  status: QuoteStatus;
  lineItems: LineItem[];
}

interface Invoice {
  id: string;
  bookingId: string;
  client: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
}

interface Payment {
  date: string;
  client: string;
  amount: number;
  method: PaymentMethod;
  bookingRef: string;
  status: "Received" | "Pending" | "Failed";
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_QUOTATIONS: Quotation[] = [
  {
    id: "Q-2026-001",
    client: "Priya Mehta",
    from: "Mumbai",
    to: "Bali",
    amount: 185000,
    margin: 22,
    createdDate: "2026-04-01",
    status: "ACCEPTED",
    lineItems: [
      { component: "Flight", description: "BOM-DPS Return (Economy)", netCost: 42000, grossPrice: 52000, margin: 23.8, status: "CONFIRMED" },
      { component: "Hotel", description: "Ubud Resort 5N", netCost: 60000, grossPrice: 75000, margin: 25, status: "CONFIRMED" },
      { component: "Transport", description: "Airport transfers + day trips", netCost: 12000, grossPrice: 15000, margin: 25, status: "CONFIRMED" },
      { component: "Activity", description: "Tanah Lot + Kecak show", netCost: 8000, grossPrice: 10000, margin: 25, status: "ESTIMATED" },
      { component: "Activity", description: "Cooking class + spa day", netCost: 18000, grossPrice: 22000, margin: 22.2, status: "PENDING" },
    ],
  },
  {
    id: "Q-2026-002",
    client: "Arjun Singh",
    from: "Delhi",
    to: "Maldives",
    amount: 420000,
    margin: 18,
    createdDate: "2026-04-03",
    status: "SENT",
    lineItems: [
      { component: "Flight", description: "DEL-MLE Return (Business)", netCost: 95000, grossPrice: 115000, margin: 21, status: "CONFIRMED" },
      { component: "Hotel", description: "Overwater Villa 7N", netCost: 200000, grossPrice: 245000, margin: 22.5, status: "CONFIRMED" },
      { component: "Activity", description: "Diving + snorkelling package", netCost: 28000, grossPrice: 35000, margin: 25, status: "ESTIMATED" },
      { component: "Transport", description: "Speedboat transfers", netCost: 10000, grossPrice: 12000, margin: 20, status: "PENDING" },
    ],
  },
  {
    id: "Q-2026-003",
    client: "Deepika Rao",
    from: "Mumbai",
    to: "Dubai",
    amount: 95000,
    margin: 25,
    createdDate: "2026-04-05",
    status: "DRAFT",
    lineItems: [
      { component: "Flight", description: "BOM-DXB Return", netCost: 22000, grossPrice: 28000, margin: 27.3, status: "ESTIMATED" },
      { component: "Hotel", description: "Marina Hotel 4N", netCost: 32000, grossPrice: 40000, margin: 25, status: "ESTIMATED" },
      { component: "Activity", description: "Desert safari + Burj Khalifa", netCost: 11000, grossPrice: 14000, margin: 27.3, status: "ESTIMATED" },
    ],
  },
  {
    id: "Q-2026-004",
    client: "Rohan Kumar",
    from: "Kolkata",
    to: "Thailand",
    amount: 125000,
    margin: 20,
    createdDate: "2026-04-06",
    status: "ACCEPTED",
    lineItems: [
      { component: "Flight", description: "CCU-BKK Return", netCost: 28000, grossPrice: 35000, margin: 25, status: "CONFIRMED" },
      { component: "Hotel", description: "Bangkok + Phuket 6N", netCost: 42000, grossPrice: 52000, margin: 23.8, status: "CONFIRMED" },
      { component: "Transport", description: "Ferry + local transport", netCost: 8000, grossPrice: 10000, margin: 25, status: "CONFIRMED" },
      { component: "Activity", description: "Grand Palace + Phi Phi islands", netCost: 10000, grossPrice: 12500, margin: 25, status: "PENDING" },
    ],
  },
  {
    id: "Q-2026-005",
    client: "Anjali Sharma",
    from: "Mumbai",
    to: "Europe (Paris+Rome)",
    amount: 650000,
    margin: 15,
    createdDate: "2026-04-08",
    status: "SENT",
    lineItems: [
      { component: "Flight", description: "BOM-CDG-FCO-BOM (Business)", netCost: 180000, grossPrice: 215000, margin: 19.4, status: "CONFIRMED" },
      { component: "Hotel", description: "Paris Boutique 4N + Rome Central 4N", netCost: 180000, grossPrice: 220000, margin: 22.2, status: "CONFIRMED" },
      { component: "Transport", description: "Eurostar Paris-Rome + transfers", netCost: 35000, grossPrice: 42000, margin: 20, status: "CONFIRMED" },
      { component: "Activity", description: "Louvre, Eiffel, Colosseum guided", netCost: 48000, grossPrice: 58000, margin: 20.8, status: "ESTIMATED" },
      { component: "Activity", description: "Seine dinner cruise + Vatican tour", netCost: 55000, grossPrice: 65000, margin: 18.2, status: "PENDING" },
    ],
  },
  {
    id: "Q-2026-006",
    client: "Karan Nair",
    from: "Chennai",
    to: "Sri Lanka",
    amount: 210000,
    margin: 28,
    createdDate: "2026-04-09",
    status: "ACCEPTED",
    lineItems: [
      { component: "Flight", description: "MAA-CMB Return", netCost: 18000, grossPrice: 24000, margin: 33.3, status: "CONFIRMED" },
      { component: "Hotel", description: "Colombo + Kandy + Sigiriya 7N", netCost: 65000, grossPrice: 88000, margin: 35.4, status: "CONFIRMED" },
      { component: "Transport", description: "Private car entire trip", netCost: 25000, grossPrice: 34000, margin: 36, status: "CONFIRMED" },
      { component: "Activity", description: "Sigiriya Rock + cultural show", netCost: 15000, grossPrice: 20000, margin: 33.3, status: "CONFIRMED" },
      { component: "Activity", description: "Whale watching in Mirissa", netCost: 12000, grossPrice: 16000, margin: 33.3, status: "PENDING" },
    ],
  },
  {
    id: "Q-2026-007",
    client: "Sneha Joshi",
    from: "Mumbai",
    to: "Kenya Safari",
    amount: 380000,
    margin: 0,
    createdDate: "2026-04-10",
    status: "REJECTED",
    lineItems: [
      { component: "Flight", description: "BOM-NBO Return", netCost: 95000, grossPrice: 112000, margin: 17.9, status: "CONFIRMED" },
      { component: "Hotel", description: "Masai Mara Camp 5N", netCost: 160000, grossPrice: 190000, margin: 18.8, status: "CONFIRMED" },
      { component: "Activity", description: "Game drives 3x full day", netCost: 45000, grossPrice: 52000, margin: 15.6, status: "CONFIRMED" },
    ],
  },
  {
    id: "Q-2026-008",
    client: "Vikram Patel",
    from: "Delhi",
    to: "Himachal Pradesh",
    amount: 78000,
    margin: 30,
    createdDate: "2026-03-15",
    status: "EXPIRED",
    lineItems: [
      { component: "Transport", description: "Delhi-Manali-Delhi private SUV", netCost: 18000, grossPrice: 24000, margin: 33.3, status: "ESTIMATED" },
      { component: "Hotel", description: "Shimla + Manali cottage 5N", netCost: 22000, grossPrice: 30000, margin: 36.4, status: "ESTIMATED" },
      { component: "Activity", description: "Snow activities + Rohtang pass", netCost: 8000, grossPrice: 11000, margin: 37.5, status: "ESTIMATED" },
    ],
  },
  {
    id: "Q-2026-009",
    client: "Meera Gupta",
    from: "Mumbai",
    to: "Goa",
    amount: 45000,
    margin: 35,
    createdDate: "2026-04-12",
    status: "DRAFT",
    lineItems: [
      { component: "Flight", description: "BOM-GOI Return", netCost: 6000, grossPrice: 8500, margin: 41.7, status: "ESTIMATED" },
      { component: "Hotel", description: "North Goa Beach Resort 3N", netCost: 15000, grossPrice: 21000, margin: 40, status: "ESTIMATED" },
      { component: "Activity", description: "Watersports package", netCost: 5000, grossPrice: 7000, margin: 40, status: "ESTIMATED" },
    ],
  },
  {
    id: "Q-2026-010",
    client: "Rahul Verma",
    from: "Bangalore",
    to: "Japan",
    amount: 310000,
    margin: 17,
    createdDate: "2026-04-14",
    status: "SENT",
    lineItems: [
      { component: "Flight", description: "BLR-NRT Return (Economy)", netCost: 72000, grossPrice: 88000, margin: 22.2, status: "CONFIRMED" },
      { component: "Hotel", description: "Tokyo + Kyoto + Osaka 8N", netCost: 95000, grossPrice: 115000, margin: 21.1, status: "CONFIRMED" },
      { component: "Transport", description: "JR Pass 14-day", netCost: 25000, grossPrice: 30000, margin: 20, status: "CONFIRMED" },
      { component: "Activity", description: "Mt Fuji day trip + tea ceremony", netCost: 28000, grossPrice: 34000, margin: 21.4, status: "PENDING" },
      { component: "Activity", description: "Osaka street food + Dotonbori tour", netCost: 18000, grossPrice: 22000, margin: 22.2, status: "ESTIMATED" },
    ],
  },
];

const MONTHLY_REVENUE = [380000, 420000, 510000, 480000, 620000, 580000, 710000, 690000, 820000, 780000, 960000, 1840000];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SEED_INVOICES: Invoice[] = [
  { id: "INV-2026-001", bookingId: "BK-2026-001", client: "Priya Mehta", amount: 185000, issueDate: "2026-04-02", dueDate: "2026-04-16", status: "PAID" },
  { id: "INV-2026-002", bookingId: "BK-2026-004", client: "Rohan Kumar", amount: 125000, issueDate: "2026-04-07", dueDate: "2026-04-21", status: "UNPAID" },
  { id: "INV-2026-003", bookingId: "BK-2026-006", client: "Karan Nair", amount: 210000, issueDate: "2026-04-10", dueDate: "2026-04-24", status: "PAID" },
  { id: "INV-2026-004", bookingId: "BK-2026-003", client: "Deepika Rao", amount: 95000, issueDate: "2026-03-20", dueDate: "2026-04-03", status: "OVERDUE" },
  { id: "INV-2026-005", bookingId: "BK-2026-002", client: "Arjun Singh", amount: 420000, issueDate: "2026-04-04", dueDate: "2026-04-18", status: "UNPAID" },
  { id: "INV-2026-006", bookingId: "BK-2026-009", client: "Meera Gupta", amount: 45000, issueDate: "2026-03-10", dueDate: "2026-03-24", status: "OVERDUE" },
];

const SEED_PAYMENTS: Payment[] = [
  { date: "2026-04-15", client: "Priya Mehta", amount: 185000, method: "Razorpay", bookingRef: "BK-2026-001", status: "Received" },
  { date: "2026-04-12", client: "Karan Nair", amount: 105000, method: "Bank Transfer", bookingRef: "BK-2026-006", status: "Received" },
  { date: "2026-04-10", client: "Anjali Sharma", amount: 162500, method: "Bank Transfer", bookingRef: "BK-2026-005", status: "Received" },
  { date: "2026-04-08", client: "Rahul Verma", amount: 77500, method: "Razorpay", bookingRef: "BK-2026-010", status: "Pending" },
  { date: "2026-04-05", client: "Arjun Singh", amount: 210000, method: "Bank Transfer", bookingRef: "BK-2026-002", status: "Pending" },
  { date: "2026-04-01", client: "Vikram Patel", amount: 39000, method: "Cash", bookingRef: "BK-2026-008", status: "Received" },
  { date: "2026-03-28", client: "Deepika Rao", amount: 47500, method: "Razorpay", bookingRef: "BK-2026-003", status: "Pending" },
  { date: "2026-03-22", client: "Meera Gupta", amount: 22500, method: "Cash", bookingRef: "BK-2026-009", status: "Received" },
];

const TOP_DESTINATIONS = [
  { destination: "Maldives", bookings: 12, revenue: 5040000, margin: 21 },
  { destination: "Bali", bookings: 18, revenue: 3330000, margin: 23 },
  { destination: "Europe", bookings: 8, revenue: 5200000, margin: 16 },
  { destination: "Japan", bookings: 10, revenue: 3100000, margin: 18 },
  { destination: "Dubai", bookings: 22, revenue: 2090000, margin: 26 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatINRFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function statusPillClass(status: QuoteStatus): string {
  switch (status) {
    case "DRAFT": return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    case "SENT": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "ACCEPTED": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "REJECTED": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    case "EXPIRED": return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }
}

function invoiceStatusClass(status: InvoiceStatus): string {
  switch (status) {
    case "PAID": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "UNPAID": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "OVERDUE": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  }
}

function lineItemStatusClass(status: LineItemStatus): string {
  switch (status) {
    case "CONFIRMED": return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
    case "PENDING": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "ESTIMATED": return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
}

function marginColor(margin: number): string {
  if (margin > 20) return "text-emerald-600 dark:text-emerald-400";
  if (margin >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "quotations" | "invoices" | "payments">("overview");
  const [quotations, setQuotations] = useState<Quotation[]>(SEED_QUOTATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "ALL">("ALL");
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  // Live finance ledger summary from backend (total_revenue, total_cost,
  // gross_profit, currency). Null until the first fetch lands; falls back
  // to derived-from-seed numbers in the rendering layer when null.
  const [ledgerSummary, setLedgerSummary] = useState<{
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Quotations API returns paginated shape: { items: [], total, page, size }
        const quotationsRes = await api
          .get<{ items: Array<{
            id: number; lead_name: string; destination: string;
            total_price: number; margin_pct: number; created_at: string;
            status: QuoteStatus;
          }>; total: number }>("/api/v1/quotations/?size=100")
          .catch(() => null);

        if (quotationsRes && Array.isArray(quotationsRes.items) && quotationsRes.items.length > 0) {
          const mapped: Quotation[] = quotationsRes.items.map((q) => ({
            id: `Q-${q.id}`,
            client: q.lead_name,
            from: "—",
            to: q.destination,
            amount: q.total_price,
            margin: q.margin_pct,
            createdDate: q.created_at ? q.created_at.slice(0, 10) : "—",
            status: q.status,
            lineItems: [],
          }));
          setQuotations(mapped);
        }

        // Finance summary (KPIs) — GET /api/v1/finance/summary returns the
        // tenant-scoped LedgerSummary. Failure is non-blocking; the Overview
        // tab will fall back to numbers derived from seed quotations.
        try {
          const sum = await api.get<{
            total_revenue: number;
            total_cost: number;
            gross_profit: number;
            currency: string;
          }>("/api/v1/finance/summary");
          if (sum && typeof sum.total_revenue === 'number') {
            setLedgerSummary(sum);
          }
        } catch {
          /* keep ledgerSummary null → fall-back rendering */
        }
      } catch {
        // fallback to seed data already set in initial state
      }
    }
    fetchData();
  }, []);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        !searchQuery ||
        q.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.to.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchQuery, statusFilter]);

  const maxRevenue = Math.max(...MONTHLY_REVENUE);
  const currentMonthIndex = 11; // December highlighted as current for seed data

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart2 },
    { id: "quotations" as const, label: "Quotations", icon: FileText },
    { id: "invoices" as const, label: "Invoices", icon: CreditCard },
    { id: "payments" as const, label: "Payments", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Finance & Quotations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Revenue tracking, quotes, invoices, and payments</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-white/10 mb-8">
          <nav className="flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "border-[#14B8A6] text-[#14B8A6]"
                    : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-8">

            {/* KPI Cards — backed by /api/v1/finance/summary when available.
                Outstanding / Collected / Avg deal cards stay illustrative until
                their dedicated endpoints (AR aging, monthly collected, average
                deal size) ship in a follow-up release. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const fmt = (n: number, currency = 'INR') => {
                  if (currency === 'INR') {
                    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
                    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
                    return `₹${Math.round(n).toLocaleString('en-IN')}`;
                  }
                  return `${currency} ${Math.round(n).toLocaleString()}`;
                };
                const liveRevenue = ledgerSummary?.total_revenue;
                const liveGP = ledgerSummary?.gross_profit;
                const cur = ledgerSummary?.currency ?? 'INR';
                return [
                  {
                    label: "Total Revenue",
                    value: liveRevenue !== undefined ? fmt(liveRevenue, cur) : "—",
                    sub: liveRevenue !== undefined ? "Live ledger" : "Awaiting first booking",
                    icon: TrendingUp, color: "text-[#14B8A6]", bg: "bg-teal-50 dark:bg-teal-900/20",
                  },
                  {
                    label: "Gross Profit",
                    value: liveGP !== undefined ? fmt(liveGP, cur) : "—",
                    sub: ledgerSummary && ledgerSummary.total_revenue > 0
                      ? `${((ledgerSummary.gross_profit / ledgerSummary.total_revenue) * 100).toFixed(1)}% margin`
                      : "Computed from real bookings",
                    icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20",
                  },
                  {
                    label: "Outstanding",
                    value: "—",
                    sub: "AR-aging in V6 reporting",
                    icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20",
                  },
                  {
                    label: "Avg Deal Size",
                    value: "—",
                    sub: "Average-deal endpoint in V6",
                    icon: BarChart2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20",
                  },
                ];
              })().map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</span>
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* Revenue Chart */}
            <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Monthly Revenue</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Illustrative — historical monthly breakdown ships with V6 reporting
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#1B2E5E] dark:bg-slate-600 inline-block" />
                    <span className="text-slate-500 dark:text-slate-400">Past months</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#14B8A6] inline-block" />
                    <span className="text-slate-500 dark:text-slate-400">Current month</span>
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-2 h-48">
                {MONTHLY_REVENUE.map((rev, i) => {
                  const heightPct = (rev / maxRevenue) * 100;
                  const isCurrent = i === currentMonthIndex;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {formatINR(rev)}
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${
                          isCurrent ? "bg-[#14B8A6]" : "bg-[#1B2E5E] dark:bg-slate-600"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{MONTH_LABELS[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* P&L Summary + Top Destinations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-6">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-5">P&L Summary</h2>
                <div className="space-y-4">
                  {[
                    { label: "Total Revenue", value: 18400000, pct: 100, color: "bg-[#14B8A6]" },
                    { label: "Total Cost", value: 14306000, pct: 77.7, color: "bg-red-400" },
                    { label: "Gross Margin", value: 4094000, pct: 22.3, color: "bg-emerald-400" },
                  ].map(({ label, value, pct, color }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatINR(value)}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-6">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-5">Top Destinations</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      <th className="text-left pb-3 font-medium">Destination</th>
                      <th className="text-right pb-3 font-medium">Bookings</th>
                      <th className="text-right pb-3 font-medium">Revenue</th>
                      <th className="text-right pb-3 font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_DESTINATIONS.map((dest) => (
                      <tr key={dest.destination} className="border-t border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{dest.destination}</td>
                        <td className="py-2.5 text-right text-slate-500 dark:text-slate-400">{dest.bookings}</td>
                        <td className="py-2.5 text-right text-slate-700 dark:text-slate-200">{formatINR(dest.revenue)}</td>
                        <td className={`py-2.5 text-right font-semibold ${marginColor(dest.margin)}`}>{dest.margin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Quotations Tab ───────────────────────────────────────────────── */}
        {activeTab === "quotations" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search quotes, clients, destinations…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#0F1B35] border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | "ALL")}
                  className="pl-9 pr-8 py-2.5 text-sm bg-white dark:bg-[#0F1B35] border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50 appearance-none cursor-pointer"
                >
                  {(["ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quotations Table */}
            <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-white/5">
                      <th className="text-left px-5 py-3.5 font-medium">Quote #</th>
                      <th className="text-left px-4 py-3.5 font-medium">Client</th>
                      <th className="text-left px-4 py-3.5 font-medium">Route</th>
                      <th className="text-right px-4 py-3.5 font-medium">Amount</th>
                      <th className="text-right px-4 py-3.5 font-medium">Margin</th>
                      <th className="text-left px-4 py-3.5 font-medium">Date</th>
                      <th className="text-left px-4 py-3.5 font-medium">Status</th>
                      <th className="text-right px-5 py-3.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotations.map((q) => (
                      <>
                        <tr
                          key={q.id}
                          className="border-t border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => setExpandedQuote(expandedQuote === q.id ? null : q.id)}
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-bold text-[#1B2E5E] dark:text-[#14B8A6] text-xs">{q.id}</span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">{q.client}</td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className="text-xs whitespace-nowrap">{q.from}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="text-xs">{q.to}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                            {formatINRFull(q.amount)}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-semibold ${marginColor(q.margin)}`}>
                            {q.margin}%
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{q.createdDate}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusPillClass(q.status)}`}>
                              {q.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button title="Send" className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button title="Download PDF" className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-white/10">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button title="Create Booking" className="p-1.5 text-slate-400 hover:text-[#14B8A6] transition-colors rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/20">
                                <PlusCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-white/10"
                                onClick={(e) => { e.stopPropagation(); setExpandedQuote(expandedQuote === q.id ? null : q.id); }}
                              >
                                {expandedQuote === q.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedQuote === q.id && (
                          <tr key={`${q.id}-expand`} className="bg-slate-50 dark:bg-[#0A0F1E]/60 border-t border-slate-100 dark:border-white/5">
                            <td colSpan={8} className="px-5 py-4">
                              <div className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                      <th className="text-left px-4 py-2.5 font-medium">Component</th>
                                      <th className="text-left px-4 py-2.5 font-medium">Description</th>
                                      <th className="text-right px-4 py-2.5 font-medium">Net Cost</th>
                                      <th className="text-right px-4 py-2.5 font-medium">Gross Price</th>
                                      <th className="text-right px-4 py-2.5 font-medium">Margin</th>
                                      <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {q.lineItems.map((item, idx) => (
                                      <tr key={idx} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{item.component}</td>
                                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{item.description}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{formatINRFull(item.netCost)}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200">{formatINRFull(item.grossPrice)}</td>
                                        <td className={`px-4 py-2.5 text-right font-semibold ${marginColor(item.margin)}`}>{item.margin.toFixed(1)}%</td>
                                        <td className="px-4 py-2.5">
                                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${lineItemStatusClass(item.status)}`}>
                                            {item.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="border-t-2 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 font-semibold">
                                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200" colSpan={2}>Total</td>
                                      <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-200">
                                        {formatINRFull(q.lineItems.reduce((s, i) => s + i.netCost, 0))}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-slate-800 dark:text-slate-100">
                                        {formatINRFull(q.lineItems.reduce((s, i) => s + i.grossPrice, 0))}
                                      </td>
                                      <td className={`px-4 py-2.5 text-right ${marginColor(q.margin)}`}>{q.margin}%</td>
                                      <td className="px-4 py-2.5" />
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}

                    {filteredQuotations.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                          No quotations found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Invoices Tab ─────────────────────────────────────────────────── */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-white/5">
                      <th className="text-left px-5 py-3.5 font-medium">Invoice #</th>
                      <th className="text-left px-4 py-3.5 font-medium">Booking #</th>
                      <th className="text-left px-4 py-3.5 font-medium">Client</th>
                      <th className="text-right px-4 py-3.5 font-medium">Amount</th>
                      <th className="text-left px-4 py-3.5 font-medium">Issue Date</th>
                      <th className="text-left px-4 py-3.5 font-medium">Due Date</th>
                      <th className="text-left px-4 py-3.5 font-medium">Status</th>
                      <th className="text-right px-5 py-3.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SEED_INVOICES.map((inv) => (
                      <tr
                        key={inv.id}
                        className={`border-t border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                          inv.status === "OVERDUE" ? "border-l-2 border-l-red-400" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-[#1B2E5E] dark:text-[#14B8A6] text-xs">{inv.id}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{inv.bookingId}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200 font-medium">{inv.client}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-100">{formatINRFull(inv.amount)}</td>
                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{inv.issueDate}</td>
                        <td className="px-4 py-3.5 text-xs">
                          <span className={inv.status === "OVERDUE" ? "text-red-500 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"}>
                            {inv.dueDate}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${invoiceStatusClass(inv.status)}`}>
                            {inv.status === "OVERDUE" && <AlertCircle className="w-3 h-3" />}
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button title="Download" className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-white/10">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button title="Send" className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            {inv.status !== "PAID" && (
                              <button title="Mark Paid" className="p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Payments Tab ─────────────────────────────────────────────────── */}
        {activeTab === "payments" && (
          <div className="space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Total Received",
                  value: formatINR(SEED_PAYMENTS.filter(p => p.status === "Received").reduce((s, p) => s + p.amount, 0)),
                  icon: CheckCircle,
                  color: "text-emerald-500",
                  bg: "bg-emerald-50 dark:bg-emerald-900/20",
                },
                {
                  label: "Pending",
                  value: formatINR(SEED_PAYMENTS.filter(p => p.status === "Pending").reduce((s, p) => s + p.amount, 0)),
                  icon: Clock,
                  color: "text-amber-500",
                  bg: "bg-amber-50 dark:bg-amber-900/20",
                },
                {
                  label: "Overdue Invoices",
                  value: formatINR(SEED_INVOICES.filter(i => i.status === "OVERDUE").reduce((s, i) => s + i.amount, 0)),
                  icon: AlertCircle,
                  color: "text-red-500",
                  bg: "bg-red-50 dark:bg-red-900/20",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Log */}
            <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Payment Log</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-white/5">
                      <th className="text-left px-5 py-3.5 font-medium">Date</th>
                      <th className="text-left px-4 py-3.5 font-medium">Client</th>
                      <th className="text-right px-4 py-3.5 font-medium">Amount</th>
                      <th className="text-left px-4 py-3.5 font-medium">Method</th>
                      <th className="text-left px-4 py-3.5 font-medium">Booking Ref</th>
                      <th className="text-left px-4 py-3.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SEED_PAYMENTS.map((pay, idx) => (
                      <tr key={idx} className="border-t border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{pay.date}</td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200 font-medium">{pay.client}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-100">{formatINRFull(pay.amount)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            pay.method === "Razorpay"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              : pay.method === "Bank Transfer"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}>
                            {pay.method}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{pay.bookingRef}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            pay.status === "Received"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : pay.status === "Pending"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          }`}>
                            {pay.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
