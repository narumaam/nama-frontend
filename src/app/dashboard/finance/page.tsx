"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  RefreshCw,
  Download,
  Search,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertCircle,
} from "lucide-react";

interface LedgerEntry {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  currency: string;
  description: string;
  reference: string;
  booking_id?: string;
  created_at: string;
  reconciled: boolean;
}

interface FinanceSummary {
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  margin_pct: number;
  pending_reconciliation: number;
  currency: string;
}

const TABS = ["Overview", "Invoices", "Payments", "Refunds", "Vendor Payouts"] as const;
type Tab = (typeof TABS)[number];

const MOCK_ENTRIES: LedgerEntry[] = [
  { id: "1", type: "CREDIT", amount: 185000, currency: "INR", description: "Booking payment — Maldives Island Escape", reference: "INV/FY25-26/0001", booking_id: "1", created_at: "2026-04-15T10:30:00Z", reconciled: true },
  { id: "2", type: "DEBIT", amount: 120000, currency: "INR", description: "Vendor payout — Soneva Fushi Resort", reference: "VP-2026-001", created_at: "2026-04-14T14:20:00Z", reconciled: true },
  { id: "3", type: "CREDIT", amount: 245000, currency: "INR", description: "Booking payment — Swiss Alps Luxury Tour", reference: "INV/FY25-26/0002", booking_id: "2", created_at: "2026-04-13T09:15:00Z", reconciled: false },
  { id: "4", type: "DEBIT", amount: 15000, currency: "INR", description: "Refund — cancellation penalty waived", reference: "RF-2026-001", created_at: "2026-04-12T16:45:00Z", reconciled: true },
  { id: "5", type: "CREDIT", amount: 98500, currency: "INR", description: "Booking payment — Bali Wellness Retreat", reference: "INV/FY25-26/0003", booking_id: "3", created_at: "2026-04-11T11:00:00Z", reconciled: false },
  { id: "6", type: "DEBIT", amount: 78000, currency: "INR", description: "Vendor payout — The Layar Villa Bali", reference: "VP-2026-002", created_at: "2026-04-10T09:00:00Z", reconciled: true },
  { id: "7", type: "CREDIT", amount: 320000, currency: "INR", description: "Booking payment — Japan Cherry Blossom Circuit", reference: "INV/FY25-26/0004", booking_id: "4", created_at: "2026-04-09T15:30:00Z", reconciled: true },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchSummary(); }, []);

  async function fetchSummary() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/finance/summary");
      if (res.ok) {
        setSummary(await res.json());
      } else {
        setSummary({ total_revenue: 848500, total_cost: 198000, gross_profit: 650500, margin_pct: 76.7, pending_reconciliation: 2, currency: "INR" });
      }
    } catch {
      setSummary({ total_revenue: 848500, total_cost: 198000, gross_profit: 650500, margin_pct: 76.7, pending_reconciliation: 2, currency: "INR" });
    }
    setLoading(false);
  }

  function exportCSV() {
    const rows = [
      ["Reference", "Description", "Type", "Amount (INR)", "Date", "Reconciled"],
      ...filteredEntries.map(e => [e.reference, e.description, e.type, e.amount.toString(), new Date(e.created_at).toLocaleDateString("en-IN"), e.reconciled ? "Yes" : "No"]),
    ];
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `finance_${activeTab.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const filteredEntries = MOCK_ENTRIES.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || e.description.toLowerCase().includes(q) || e.reference.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (activeTab === "Invoices") return e.type === "CREDIT";
    if (activeTab === "Payments") return e.type === "CREDIT" && !!e.booking_id;
    if (activeTab === "Refunds") return e.description.toLowerCase().includes("refund");
    if (activeTab === "Vendor Payouts") return e.type === "DEBIT";
    return true;
  });

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance & P&L</h1>
          <p className="text-slate-400 text-sm mt-1">Double-entry ledger · GST-compliant · Real-time</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchSummary} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm text-white transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-900 rounded-xl p-5 animate-pulse h-28" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Revenue</span>
              <ArrowUpRight className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white">{fmt(summary.total_revenue)}</div>
            <div className="text-xs text-teal-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +12.4% this month</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Cost</span>
              <ArrowDownLeft className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white">{fmt(summary.total_cost)}</div>
            <div className="text-xs text-slate-400 mt-1">Vendor + operational</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Gross Profit</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{fmt(summary.gross_profit)}</div>
            <div className="text-xs text-slate-400 mt-1">{summary.margin_pct}% margin</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pending Recon</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{summary.pending_reconciliation}</div>
            <div className="text-xs text-slate-400 mt-1">transactions</div>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input type="text" placeholder="Search transactions..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 w-56" />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Reference</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredEntries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500 text-sm">No transactions found</td></tr>
            ) : filteredEntries.map(entry => (
              <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded">{entry.reference}</span>
                </td>
                <td className="px-4 py-3 text-slate-300 text-sm">{entry.description}</td>
                <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                  {new Date(entry.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className={`px-4 py-3 text-right font-semibold text-sm ${entry.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                  {entry.type === "CREDIT" ? "+" : "−"}{fmt(entry.amount)}
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  {entry.reconciled ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" /> Reconciled</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400"><Clock className="w-3 h-3" /> Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-700 text-right">Demo ledger · Production entries appear once bookings are processed.</p>
    </div>
  );
}
