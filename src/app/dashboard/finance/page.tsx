"use client";

import React from "react";
import { Activity, ArrowDownRight, ArrowUpRight, BadgeIndianRupee, ChevronRight, Download, Filter, Info, Sparkles, Target, TrendingUp } from "lucide-react";

type FinanceCase = {
  slug: string;
  guest: string;
  destination: string;
  quote_total: number;
  cost_total: number;
  gross_profit: number;
  margin_percent: number;
  deposit_due: number;
  status: string;
  payment_state: string;
};

const FINANCE_CASES: FinanceCase[] = [
  {
    slug: "maldives-honeymoon",
    guest: "Meera Nair",
    destination: "Maldives",
    quote_total: 486000,
    cost_total: 391500,
    gross_profit: 94500,
    margin_percent: 19.44,
    deposit_due: 180000,
    status: "Deposit pending within 24 hours",
    payment_state: "Awaiting hold confirmation",
  },
  {
    slug: "dubai-bleisure",
    guest: "Arjun Mehta",
    destination: "Dubai",
    quote_total: 212000,
    cost_total: 169500,
    gross_profit: 42500,
    margin_percent: 20.05,
    deposit_due: 85000,
    status: "Quote approved and ready to send",
    payment_state: "Quote approval stage",
  },
  {
    slug: "kerala-family",
    guest: "Sharma Family",
    destination: "Kerala",
    quote_total: 124000,
    cost_total: 98750,
    gross_profit: 25250,
    margin_percent: 20.36,
    deposit_due: 45000,
    status: "Payment reminder queued",
    payment_state: "Deposit reminder stage",
  },
];

const LEDGER_ROWS = [
  {
    date: "02 Apr 2026",
    entity: "Meera Nair - Maldives honeymoon",
    reference: "DEAL-MAL-001",
    category: "Quote value",
    amount: "+ ₹ 4,86,000",
    amountClass: "text-[#C9A84C]",
    status: "Pipeline",
    statusClass: "text-[#C9A84C]",
  },
  {
    date: "02 Apr 2026",
    entity: "Arjun Mehta - Dubai bleisure",
    reference: "DEAL-DXB-003",
    category: "Quote value",
    amount: "+ ₹ 2,12,000",
    amountClass: "text-[#F5F0E8]",
    status: "Pipeline",
    statusClass: "text-[#1D9E75]",
  },
  {
    date: "02 Apr 2026",
    entity: "Sharma Family - Kerala trip",
    reference: "DEAL-KER-002",
    category: "Quote value",
    amount: "+ ₹ 1,24,000",
    amountClass: "text-[#F5F0E8]",
    status: "Reminder",
    statusClass: "text-[#1D9E75]",
  },
  {
    date: "02 Apr 2026",
    entity: "Demo overhead bucket",
    reference: "OPS-DEMO-001",
    category: "Demo operation",
    amount: "- ₹ 1,25,000",
    amountClass: "text-[#B8B0A0]",
    status: "Seeded",
    statusClass: "text-[#B8B0A0]",
  },
];

export default function FinancePage() {
  const totalQuote = FINANCE_CASES.reduce((sum, item) => sum + item.quote_total, 0);
  const totalCost = FINANCE_CASES.reduce((sum, item) => sum + item.cost_total, 0);
  const totalProfit = FINANCE_CASES.reduce((sum, item) => sum + item.gross_profit, 0);
  const avgMargin = totalProfit / totalQuote * 100;
  const totalDeposit = FINANCE_CASES.reduce((sum, item) => sum + item.deposit_due, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Financial Ledger</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Seeded deal economics</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter font-headline text-[#F5F0E8]">Financial Ledger</h1>
          <p className="mt-2 max-w-3xl text-xs uppercase tracking-wide font-mono text-[#B8B0A0]">
            This screen shows demo-safe quote economics for the Maldives, Dubai, and Kerala cases without implying payment rails are live.
          </p>
        </div>
        <div className="rounded-2xl border border-[#C9A84C]/15 bg-[#111111] p-4 shadow-xl">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Base currency</div>
          <div className="mt-1 text-lg font-black text-[#C9A84C]">INR (₹)</div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Quote Volume" value={`₹${totalQuote.toLocaleString("en-IN")}`} sub="Across 3 seeded cases" icon={BadgeIndianRupee} />
        <MetricCard label="Gross Profit" value={`₹${totalProfit.toLocaleString("en-IN")}`} sub="Commercial surplus shown in demo" icon={Target} />
        <MetricCard label="Deposit Pipeline" value={`₹${totalDeposit.toLocaleString("en-IN")}`} sub="Pending collection across cases" icon={TrendingUp} />
        <MetricCard label="Average Margin" value={`${avgMargin.toFixed(1)}%`} sub="Weighted across the demo set" icon={Sparkles} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#F5F0E8] uppercase tracking-tight font-headline">Performance Vector</h2>
              <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.25em] text-[#4A453E]">Deterministic case economics for the Monday demo</p>
            </div>
            <div className="flex gap-6">
              <LegendItem color="bg-[#C9A84C]" label="Quote value" />
              <LegendItem color="bg-[#1D9E75]" label="Profit" />
            </div>
          </div>
          <div className="flex h-64 items-end gap-3 px-2">
            {FINANCE_CASES.map((item) => {
              const quoteHeight = `${Math.max(40, (item.quote_total / totalQuote) * 100)}%`;
              const profitHeight = `${Math.max(30, (item.gross_profit / totalProfit) * 100)}%`;
              return (
                <div key={item.slug} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex w-full items-end justify-center gap-2">
                    <div className="w-6 rounded-t-sm bg-[#C9A84C] shadow-[0_0_16px_rgba(201,168,76,0.18)]" style={{ height: quoteHeight }} />
                    <div className="w-6 rounded-t-sm bg-[#1D9E75]" style={{ height: profitHeight }} />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#F5F0E8]">{item.destination}</div>
                    <div className="mt-1 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{item.guest}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6 lg:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#F5F0E8]">Flow Snapshot</h2>
            <Activity size={18} className="text-[#C9A84C] opacity-50" />
          </div>
          <div className="space-y-6">
            <FlowItem label="Seeded inflow" value={`₹${totalQuote.toLocaleString("en-IN")}`} color="text-[#1D9E75]" icon={<ArrowUpRight size={20} />} />
            <FlowItem label="Seeded cost base" value={`₹${totalCost.toLocaleString("en-IN")}`} color="text-[#C9A84C]" icon={<ArrowDownRight size={20} />} />
            <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E] mb-2">Narrative</div>
              <p className="text-sm leading-relaxed text-[#B8B0A0]">
                The ledger mirrors the same seeded deals used in leads, comms, and deals so the commercial story stays continuous.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {FINANCE_CASES.map((item) => (
          <article key={item.slug} className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
            <div className="mb-4 flex items-center gap-2">
              <BadgeIndianRupee size={14} className="text-[#C9A84C]" />
              <h3 className="text-lg font-black text-[#F5F0E8]">{item.guest}</h3>
            </div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">{item.destination}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="Quote" value={`₹${item.quote_total.toLocaleString("en-IN")}`} />
              <Stat label="Profit" value={`₹${item.gross_profit.toLocaleString("en-IN")}`} />
              <Stat label="Margin" value={`${item.margin_percent}%`} />
              <Stat label="Deposit" value={`₹${item.deposit_due.toLocaleString("en-IN")}`} />
            </div>
            <div className="mt-5 rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">State</div>
              <p className="text-sm leading-relaxed text-[#F5F0E8]">{item.status}</p>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{item.payment_state}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#C9A84C]/10 bg-[#151515] px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-[#F5F0E8] uppercase tracking-tight font-headline">Intelligence Ledger</h2>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.25em] text-[#4A453E]">Recent seeded transmissions</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-[#C9A84C]/10 bg-[#0A0A0A] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0] transition-all hover:border-[#C9A84C]/30">
              <Filter size={12} className="text-[#C9A84C]" />
              Filter
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-[#C9A84C] bg-[#C9A84C] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#0A0A0A] transition-all hover:bg-[#B89840]">
              <Download size={12} />
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#C9A84C]/5 bg-[#0A0A0A] text-[9px] font-black uppercase tracking-widest text-[#4A453E]">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A84C]/5">
              {LEDGER_ROWS.map((row) => (
                <tr key={row.reference} className="group hover:bg-[#1A1A1A] transition-colors">
                  <td className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{row.date}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black uppercase tracking-tighter text-[#F5F0E8] group-hover:text-[#C9A84C] transition-colors">{row.entity}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">{row.reference}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#B8B0A0]">{row.category}</td>
                  <td className={`px-6 py-4 font-mono text-sm font-black tracking-tighter ${row.amountClass}`}>{row.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${row.statusClass} border-current/20 bg-current/10`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
        <Icon size={16} />
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
      <div className="mt-1 text-xs text-[#4A453E]">{sub}</div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-sm ${color}`} />
      <span className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E] font-black">{label}</span>
    </div>
  );
}

function FlowItem({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group flex items-center justify-between">
      <div>
        <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] font-mono text-[#4A453E] group-hover:text-[#B8B0A0] transition-colors">{label}</p>
        <p className={`font-mono text-2xl font-black tracking-tighter ${color}`}>{value}</p>
      </div>
      <div className={`rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3 ${color}`}>{icon}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#F5F0E8]">{value}</div>
    </div>
  );
}
