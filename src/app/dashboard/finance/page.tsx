"use client";

import React from "react";
import Link from "next/link";
import { DEMO_CASE_ROUTES, getPrimaryDemoCase } from "@/lib/demo-cases";
import { DEFAULT_DEMO_PROFILE, readDemoProfile } from "@/lib/demo-profile";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeIndianRupee,
  CheckCircle2,
  ChevronRight,
  Download,
  Filter,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

type FinanceCase = {
  slug: string;
  guest: string;
  case_name: string;
  destination: string;
  quote_total: number;
  cost_total: number;
  gross_profit: number;
  margin_percent: number;
  deposit_due: number;
  status: string;
  payment_state: string;
};

const PRIMARY_CASE = getPrimaryDemoCase();

const FINANCE_CASE_DETAILS: Record<
  string,
  { cost_total: number; gross_profit: number; margin_percent: number; ledger_reference: string; ledger_status: string; ledger_status_class: string; amount_class: string }
> = {
  "maldives-honeymoon": {
    cost_total: 391500,
    gross_profit: 94500,
    margin_percent: 19.44,
    ledger_reference: "DEAL-MAL-001",
    ledger_status: "Pipeline",
    ledger_status_class: "text-[#C9A84C]",
    amount_class: "text-[#C9A84C]",
  },
  "dubai-bleisure": {
    cost_total: 169500,
    gross_profit: 42500,
    margin_percent: 20.05,
    ledger_reference: "DEAL-DXB-003",
    ledger_status: "Pipeline",
    ledger_status_class: "text-[#1D9E75]",
    amount_class: "text-[#F5F0E8]",
  },
  "kerala-family": {
    cost_total: 98750,
    gross_profit: 25250,
    margin_percent: 20.36,
    ledger_reference: "DEAL-KER-002",
    ledger_status: "Reminder",
    ledger_status_class: "text-[#1D9E75]",
    amount_class: "text-[#F5F0E8]",
  },
};

const FINANCE_CASES: FinanceCase[] = DEMO_CASE_ROUTES.map((item) => ({
  slug: item.slug,
  guest: item.guest,
  case_name: item.caseName,
  destination: item.destination,
  quote_total: item.quoteTotal,
  cost_total: FINANCE_CASE_DETAILS[item.slug].cost_total,
  gross_profit: FINANCE_CASE_DETAILS[item.slug].gross_profit,
  margin_percent: FINANCE_CASE_DETAILS[item.slug].margin_percent,
  deposit_due: item.depositDue,
  status: item.financeStatus,
  payment_state: item.paymentState,
}));

const LEDGER_ROWS = FINANCE_CASES.map((item) => ({
  date: "02 Apr 2026",
  entity: `${item.guest} - ${item.case_name}`,
  reference: FINANCE_CASE_DETAILS[item.slug].ledger_reference,
  category: "Quote value",
  amount: `+ ₹ ${item.quote_total.toLocaleString("en-IN")}`,
  amountClass: FINANCE_CASE_DETAILS[item.slug].amount_class,
  status: FINANCE_CASE_DETAILS[item.slug].ledger_status,
  statusClass: FINANCE_CASE_DETAILS[item.slug].ledger_status_class,
})).concat([
  {
    date: "02 Apr 2026",
    entity: "Preview overhead bucket",
    reference: "OPS-ALPHA-001",
    category: "Operating layer",
    amount: "- ₹ 1,25,000",
    amountClass: "text-[#B8B0A0]",
    status: "Seeded",
    statusClass: "text-[#B8B0A0]",
  },
]);

const COLLECTION_QUEUE = DEMO_CASE_ROUTES.map((item) => ({
  title: `${item.destination} ${item.slug === PRIMARY_CASE.slug ? "deposit hold" : item.slug === "dubai-bleisure" ? "quote release" : "reminder pacing"}`,
  owner: item.collectionOwner,
  amount: `₹${item.depositDue.toLocaleString("en-IN")}`,
  risk: item.collectionRisk,
  note: item.collectionNote,
  href: `/dashboard/deals?case=${item.slug}`,
}));

const FINANCE_GUARDRAILS = [
  {
    title: "Margin floor",
    state: "Protected",
    detail: "All three preview cases stay above the visible commercial floor, so finance reads as controlled instead of reactive.",
  },
  {
    title: "Deposit timing",
    state: "Needs attention",
    detail: `The ${PRIMARY_CASE.destination} case is the cash-pressure moment and should be the finance highlight during the walkthrough.`,
  },
  {
    title: "Execution release",
    state: "Ready",
    detail: "Bookings is presented as a consequence of finance clearance rather than a disconnected ops jump.",
  },
];

export default function FinancePage() {
  const profile = readDemoProfile();
  const totalQuote = FINANCE_CASES.reduce((sum, item) => sum + item.quote_total, 0);
  const totalCost = FINANCE_CASES.reduce((sum, item) => sum + item.cost_total, 0);
  const totalProfit = FINANCE_CASES.reduce((sum, item) => sum + item.gross_profit, 0);
  const avgMargin = (totalProfit / totalQuote) * 100;
  const totalDeposit = FINANCE_CASES.reduce((sum, item) => sum + item.deposit_due, 0);
  const atRiskCount = FINANCE_CASES.filter((item) => item.status.includes("pending") || item.status.includes("queued")).length;
  const depositCoverage = Math.round((totalDeposit / totalQuote) * 100);
  const visibleCompany = profile.company || DEFAULT_DEMO_PROFILE.company;
  const visibleRoles = profile.roles.length ? profile.roles.join(" + ") : DEFAULT_DEMO_PROFILE.roles.join(" + ");

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Finance-lite</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Collections & Margin Control</span>
          </div>
          <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-[#F5F0E8]">Finance Control</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            This is the alpha finance layer for the same live cases: margin visibility, deposit pressure, release readiness, and commercial control before execution starts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[#C9A84C]">{visibleCompany}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">{visibleRoles}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              {profile.market.country} · {profile.baseCurrency}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href={`/dashboard/deals?case=${PRIMARY_CASE.slug}`}
            className="w-full rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10 sm:w-auto"
          >
            Return to {PRIMARY_CASE.destination} deal
          </Link>
          <Link
            href="/dashboard/bookings"
            className="w-full rounded-xl bg-[#C9A84C] px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_20px_rgba(201,168,76,0.2)] transition-all hover:scale-105 active:scale-95 sm:w-auto"
          >
            Continue into bookings
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Quote Volume" value={`₹${totalQuote.toLocaleString("en-IN")}`} sub="Across 3 preview cases" icon={BadgeIndianRupee} />
        <MetricCard label="Gross Profit" value={`₹${totalProfit.toLocaleString("en-IN")}`} sub="Commercial surplus in view" icon={Target} />
        <MetricCard label="Deposit Pipeline" value={`₹${totalDeposit.toLocaleString("en-IN")}`} sub="Pending collection across cases" icon={TrendingUp} />
        <MetricCard label="Average Margin" value={`${avgMargin.toFixed(1)}%`} sub="Weighted across the active set" icon={Sparkles} />
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#C9A84C]">Finance Continuity</div>
            <h2 className="text-lg font-black text-[#F5F0E8] sm:text-xl">The commercial checkpoint between deal approval and execution</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
              Use this screen to show that finance is not a back-office afterthought. It protects margin, controls deposit timing, and decides when a case is truly ready for bookings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-1.5 text-[#C9A84C]">{depositCoverage}% deposit coverage</span>
            <span className="rounded-full border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-[#B8B0A0]">{atRiskCount} cases need cash action</span>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SignalCard
            label="Priority collection"
            value={`${PRIMARY_CASE.destination} hold`}
            note="Lead with the most time-sensitive deposit case."
            icon={<AlertTriangle size={16} />}
          />
          <SignalCard label="Release gate" value="Finance clears bookings" note="Execution is shown as a consequence of approval." icon={<Shield size={16} />} />
          <SignalCard label="Cash pacing" value="Three stages visible" note="Approved, pending, and reminder states sit side by side." icon={<Wallet size={16} />} />
          <SignalCard label="Commercial confidence" value="Margins protected" note="Each case stays above the visible floor." icon={<CheckCircle2 size={16} />} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-lg font-black uppercase tracking-tight text-[#F5F0E8]">Performance Vector</h2>
              <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.25em] text-[#4A453E]">Case economics across the April preview set</p>
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
            <FlowItem label="Visible inflow" value={`₹${totalQuote.toLocaleString("en-IN")}`} color="text-[#1D9E75]" icon={<ArrowUpRight size={20} />} />
            <FlowItem label="Cost base" value={`₹${totalCost.toLocaleString("en-IN")}`} color="text-[#C9A84C]" icon={<ArrowDownRight size={20} />} />
            <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E]">Narrative</div>
              <p className="text-sm leading-relaxed text-[#B8B0A0]">
                The finance layer mirrors the same cases used in leads, deals, DMC, and bookings so the commercial story stays continuous.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <Wallet size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Collection Priority Queue</h2>
          </div>
          <div className="space-y-3">
            {COLLECTION_QUEUE.map((item) => (
              <Link key={item.title} href={item.href} className="block rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 transition-colors hover:border-[#C9A84C]/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{item.title}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{item.owner}</div>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                      item.risk === "High"
                        ? "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]"
                        : item.risk === "Medium"
                          ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#1D9E75]"
                          : "border-white/10 bg-[#111111] text-[#B8B0A0]"
                    }`}
                  >
                    {item.risk}
                  </span>
                </div>
                <div className="mt-3 text-xl font-black text-[#C9A84C]">{item.amount}</div>
                <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{item.note}</div>
                <div className="mt-3 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#4A453E]">
                  Open case from queue <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
            <div className="mb-5 flex items-center gap-2">
              <Shield size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Finance Guardrails</h2>
            </div>
            <div className="space-y-3">
              {FINANCE_GUARDRAILS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-[#F5F0E8]">{item.title}</div>
                    <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                      {item.state}
                    </span>
                  </div>
                  <div className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">How to frame this in the preview</h2>
            </div>
            <div className="grid gap-3">
              <PositioningCard
                title="What this proves"
                detail="Finance is a visible operator layer in NAMA, not a spreadsheet after the fact. It sees margin, deposits, and release timing inside the same case flow."
              />
              <PositioningCard
                title="Safe wording"
                detail="Call this a preview-safe finance control layer. It shows commercial logic and collections workflow without claiming live reconciliation rails are fully wired end to end."
              />
              <PositioningCard
                title="Walkthrough handoff"
                detail="Use Finance between the deal page and bookings so execution feels earned through a release checkpoint, not jumped to for convenience."
              />
            </div>
          </div>
        </div>
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
              <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">State</div>
              <p className="text-sm leading-relaxed text-[#F5F0E8]">{item.status}</p>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{item.payment_state}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/dashboard/deals?case=${item.slug}`}
                className="flex-1 rounded-xl border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-[#C9A84C]"
              >
                Open Case
              </Link>
              <Link
                href="/dashboard/bookings"
                className="flex-1 rounded-xl border border-white/10 bg-[#111111] px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-[#B8B0A0]"
              >
                Open Bookings
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#C9A84C]/10 bg-[#111111]">
        <div className="flex items-center justify-between gap-4 border-b border-[#C9A84C]/10 bg-[#151515] px-6 py-5">
          <div>
            <h2 className="font-headline text-lg font-black uppercase tracking-tight text-[#F5F0E8]">Intelligence Ledger</h2>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.25em] text-[#4A453E]">Recent preview transmissions</p>
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
                <tr key={row.reference} className="group transition-colors hover:bg-[#1A1A1A]">
                  <td className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{row.date}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black uppercase tracking-tighter text-[#F5F0E8] transition-colors group-hover:text-[#C9A84C]">{row.entity}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">{row.reference}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#B8B0A0]">{row.category}</td>
                  <td className={`px-6 py-4 font-mono text-sm font-black tracking-tighter ${row.amountClass}`}>{row.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full border border-current/20 bg-current/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest ${row.statusClass}`}>
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

function SignalCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-sm font-black text-[#F5F0E8]">{value}</div>
      <div className="mt-2 text-xs leading-relaxed text-[#B8B0A0]">{note}</div>
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
      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#4A453E]">{label}</span>
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
        <p className="mb-1 text-[9px] font-mono font-black uppercase tracking-[0.2em] text-[#4A453E] transition-colors group-hover:text-[#B8B0A0]">{label}</p>
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

function PositioningCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{title}</div>
      <div className="text-sm leading-relaxed text-[#B8B0A0]">{detail}</div>
    </div>
  );
}
