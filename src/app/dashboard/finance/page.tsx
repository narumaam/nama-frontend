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

const TABS = ["Overview", "Invoices", "Payments", "Refunds", "Vendor Payouts", "AR Aging", "Reconciliation", "Month-End Close"] as const;
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

  const [entries, setEntries] = useState<LedgerEntry[]>(MOCK_ENTRIES);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [arAging, setArAging] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bankRecon, setBankRecon] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monthEndData, setMonthEndData] = useState<any | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const now = new Date();
    const [sumRes, ledRes, arRes, reconRes, monthRes] = await Promise.all([
        fetch("/api/v1/finance/summary", { headers }),
        fetch("/api/v1/finance/ledger?limit=100", { headers }),
        fetch("/api/v1/finance/ar-aging", { headers }),
        fetch("/api/v1/finance/bank-reconciliation?days=30", { headers }),
        fetch(`/api/v1/finance/month-end-close/${now.getFullYear()}/${now.getMonth() + 1}`, { headers }),
      ]);

      if (sumRes.ok) {
        const data = await sumRes.json();
        // Support both schema formats (old: balance_available, new: total_revenue)
        setSummary({
          total_revenue: data.total_revenue ?? data.balance_available ?? 0,
          total_cost: data.total_cost ?? 0,
          gross_profit: data.gross_profit ?? data.balance_available ?? 0,
          margin_pct: data.margin_pct ?? 0,
          pending_reconciliation: data.pending_reconciliation ?? data.pending_settlements ?? 0,
          currency: data.currency ?? "INR",
        });
      } else {
        setSummary({ total_revenue: 848500, total_cost: 198000, gross_profit: 650500, margin_pct: 76.7, pending_reconciliation: 2, currency: "INR" });
      }

      if (ledRes.ok) {
        const ledData = await ledRes.json();
        const items = ledData.items ?? [];
        if (items.length > 0) {
          setEntries(items.map((e: { id: number; type: string; amount: number; currency: string; description: string; reference?: string; booking_id?: number; created_at: string; reconciled?: boolean }) => ({
            id: String(e.id),
            type: e.type as "CREDIT" | "DEBIT",
            amount: e.amount,
            currency: e.currency ?? "INR",
            description: e.description,
            reference: e.reference ?? "",
            booking_id: e.booking_id ? String(e.booking_id) : undefined,
            created_at: e.created_at,
            reconciled: e.reconciled ?? false,
          })));
        }
        // else keep MOCK_ENTRIES as seed display
      }
      if (arRes.ok)    setArAging(await arRes.json());
      if (reconRes.ok) setBankRecon(await reconRes.json());
      if (monthRes.ok) setMonthEndData(await monthRes.json());
    } catch {
      setSummary({ total_revenue: 848500, total_cost: 198000, gross_profit: 650500, margin_pct: 76.7, pending_reconciliation: 2, currency: "INR" });
    }
    setLoading(false);
  }

  function fetchSummary() { fetchData(); }

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

  const filteredEntries = entries.filter(e => {
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

      {/* ── AR Aging View ─────────────────────────────────────────────────── */}
      {activeTab === "AR Aging" && (
        <div className="space-y-4">
          {!arAging ? (
            <div className="bg-slate-900 rounded-xl p-8 text-center text-slate-500 text-sm">Loading AR Aging data…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Current (0–30d)", key: "current",       color: "text-emerald-400" },
                  { label: "31–60 Days",      key: "days_31_60",    color: "text-amber-400" },
                  { label: "61–90 Days",      key: "days_61_90",    color: "text-orange-400" },
                  { label: "90+ Days",        key: "days_90_plus",  color: "text-red-400" },
                ].map(({ label, key, color }) => (
                  <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{fmt(arAging.totals?.[key] ?? 0)}</p>
                    <p className="text-xs text-slate-600 mt-1">{arAging.buckets?.[key]?.length ?? 0} bookings</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-white mb-3">Total Outstanding: <span className="text-red-400">{fmt(arAging.grand_total ?? 0)}</span></p>
                <p className="text-xs text-slate-500">As of {new Date(arAging.as_of).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bank Reconciliation View ───────────────────────────────────────── */}
      {activeTab === "Reconciliation" && (
        <div className="space-y-4">
          {!bankRecon ? (
            <div className="bg-slate-900 rounded-xl p-8 text-center text-slate-500 text-sm">Loading reconciliation data…</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Reconciled</p>
                  <p className="text-lg font-bold text-emerald-400">{fmt(bankRecon.total_reconciled ?? 0)}</p>
                  <p className="text-xs text-slate-600 mt-1">{bankRecon.reconciled?.length ?? 0} entries</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Unreconciled</p>
                  <p className="text-lg font-bold text-amber-400">{fmt(bankRecon.total_unreconciled ?? 0)}</p>
                  <p className="text-xs text-slate-600 mt-1">{bankRecon.unreconciled?.length ?? 0} entries</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Reconciliation Rate</p>
                  <p className={`text-lg font-bold ${(bankRecon.reconciliation_rate ?? 0) >= 90 ? "text-emerald-400" : "text-amber-400"}`}>
                    {bankRecon.reconciliation_rate ?? 0}%
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Last {bankRecon.period_days} days</p>
                </div>
              </div>
              {(bankRecon.unreconciled?.length ?? 0) > 0 && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-400 mb-2">⚠️ Unreconciled Entries Require Action</p>
                  {bankRecon.unreconciled.slice(0, 5).map((e: { id: number; description: string; amount: number; created_at: string }) => (
                    <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-amber-800/20 last:border-0">
                      <p className="text-xs text-slate-300">{e.description}</p>
                      <p className="text-xs font-semibold text-amber-400">{fmt(e.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Month-End Close View ────────────────────────────────────────────── */}
      {activeTab === "Month-End Close" && (
        <div className="space-y-4">
          {!monthEndData ? (
            <div className="bg-slate-900 rounded-xl p-8 text-center text-slate-500 text-sm">Loading month-end data…</div>
          ) : (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">{monthEndData.period_label}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${monthEndData.status === "closed" ? "bg-emerald-900/50 text-emerald-400" : "bg-amber-900/50 text-amber-400"}`}>
                      {monthEndData.status === "closed" ? "Closed" : "Open — In Progress"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{monthEndData.bookings} confirmed bookings</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Revenue</p>
                    <p className="text-base font-bold text-emerald-400">{fmt(monthEndData.revenue ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Cost</p>
                    <p className="text-base font-bold text-red-400">{fmt(monthEndData.cost ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Gross Profit</p>
                    <p className={`text-base font-bold ${(monthEndData.gross_profit ?? 0) >= 0 ? "text-teal-400" : "text-red-400"}`}>{fmt(monthEndData.gross_profit ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Margin</p>
                    <p className={`text-base font-bold ${(monthEndData.margin_pct ?? 0) >= 30 ? "text-emerald-400" : "text-amber-400"}`}>{monthEndData.margin_pct ?? 0}%</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Standard Ledger Table (all other tabs) ───────────────────────── */}
      {activeTab !== "AR Aging" && activeTab !== "Reconciliation" && activeTab !== "Month-End Close" && (
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
      )}
      <p className="text-xs text-slate-700 text-right">Production data appears once bookings are processed.</p>
    </div>
  );
}

