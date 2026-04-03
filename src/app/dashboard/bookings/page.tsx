"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ScreenInfoTip from "@/components/screen-info-tip";
import { DEMO_DEAL_CASES, DEMO_LEAD_PROFILE_META, PRIMARY_DEMO_DEAL_CASE } from "@/lib/demo-case-profiles";
import { DEFAULT_DEMO_PROFILE, readDemoProfile } from "@/lib/demo-profile";
import { dealHrefFromSlug, getDemoCaseRoute, normalizeDemoCaseSlug } from "@/lib/demo-cases";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Landmark,
  MapPin,
  Receipt,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

const EXECUTION_STEPS = [
  {
    label: "Deposit",
    detail: "Deposit verified and finance release approved.",
    state: "Ready",
  },
  {
    label: "Supplier",
    detail: "Primary vendor accepted and fallback vendor staged.",
    state: "Confirmed",
  },
  {
    label: "Documents",
    detail: "Voucher pack and guest-facing PDFs ready to issue.",
    state: "Queued",
  },
  {
    label: "Handoff",
    detail: "Ops owner assigned with supplier and guest thread context.",
    state: "In Progress",
  },
];

const EXECUTION_TABS = ["Overview", "Travel", "Documents", "Payments", "Operations"] as const;

const FLIGHT_SEGMENTS_BY_SLUG = {
  "maldives-honeymoon": [
    { route: "DEL → MLE", airline: "Vistara + Maldivian", departure: "15 Apr · 07:45", arrival: "15 Apr · 14:10", status: "Ticketed", reference: "VT-82QF" },
    { route: "MLE → DEL", airline: "Maldivian + Vistara", departure: "21 Apr · 18:15", arrival: "22 Apr · 02:05", status: "Held", reference: "ML-73PK" },
  ],
  "dubai-bleisure": [
    { route: "DEL → DXB", airline: "Emirates", departure: "12 May · 09:10", arrival: "12 May · 11:20", status: "Held", reference: "EK-44QX" },
    { route: "DXB → DEL", airline: "Emirates", departure: "16 May · 22:40", arrival: "17 May · 03:15", status: "Queued", reference: "EK-91LT" },
  ],
  "kerala-family": [
    { route: "DEL → COK", airline: "Air India", departure: "08 Jun · 06:30", arrival: "08 Jun · 09:35", status: "Held", reference: "AI-31KM" },
    { route: "COK → DEL", airline: "Air India", departure: "13 Jun · 19:20", arrival: "13 Jun · 22:30", status: "Queued", reference: "AI-62PR" },
  ],
} as const;

const EXECUTION_OWNERS = [
  { lane: "Sales", owner: "Aisha Khan", note: "Client promise keeper and final commercial owner." },
  { lane: "Operations", owner: "Rohan Iyer", note: "Owns confirmations, supplier checks, and guest pack release." },
  { lane: "Finance", owner: "Meera Shah", note: "Verifies deposits, balance due, and payout readiness." },
  { lane: "Supplier", owner: "Primary supplier desk", note: "Hotel and transfer confirmations aligned to the guest profile." },
];

const DOCUMENT_STACK = [
  { title: "Guest Voucher Pack", status: "Ready", note: "Itinerary summary, inclusions, and on-ground numbers." },
  { title: "Deposit Receipt", status: "Issued", note: "Finance confirmation attached to the case." },
  { title: "Arrival Brief", status: "Queued", note: "Guest-facing arrival note and transfer instructions." },
];

const PAYMENT_STACK = [
  { label: "Quote Total", value: "₹4,86,000" },
  { label: "Deposit Received", value: "₹1,80,000" },
  { label: "Balance Pending", value: "₹3,06,000" },
  { label: "Gross Profit", value: "₹94,500" },
];

const EXECUTION_EXCEPTIONS = [
  { title: "Return flight still on hold", tone: "watch", detail: "Ops needs to convert the held return segment into a ticketed segment before final traveler release." },
  { title: "Arrival brief queued", tone: "queued", detail: "Guest-facing arrival guidance still needs the final supplier phone number merge." },
  { title: "Deposit reconciled", tone: "good", detail: "Finance has already cleared the deposit and released the booking into execution." },
];

const DISPATCH_CHECKLIST = [
  { label: "Voucher pack generated", state: "Done" },
  { label: "Supplier confirmations attached", state: "Done" },
  { label: "Arrival WhatsApp draft prepared", state: "Pending" },
  { label: "Balance reminder staged", state: "Pending" },
];

function resolveFlightSegments(slug: string) {
  return FLIGHT_SEGMENTS_BY_SLUG[
    (slug in FLIGHT_SEGMENTS_BY_SLUG ? slug : PRIMARY_DEMO_DEAL_CASE.slug) as keyof typeof FLIGHT_SEGMENTS_BY_SLUG
  ];
}

export default function BookingsPage() {
  const profile = useMemo(() => readDemoProfile(), []);
  const [activeTab, setActiveTab] = useState<(typeof EXECUTION_TABS)[number]>("Overview");
  const [selectedStep, setSelectedStep] = useState(EXECUTION_STEPS[0]);
  const [activeSlug, setActiveSlug] = useState(PRIMARY_DEMO_DEAL_CASE.slug);
  const visibleCompany = profile.company || DEFAULT_DEMO_PROFILE.company;
  const visibleRoles = profile.roles.length ? profile.roles.join(" + ") : DEFAULT_DEMO_PROFILE.roles.join(" + ");
  const visibleBank = profile.bankDetails;
  const activeCase = getDemoCaseRoute(activeSlug);
  const activeDeal = DEMO_DEAL_CASES[activeSlug] ?? PRIMARY_DEMO_DEAL_CASE;
  const paymentMeta = DEMO_LEAD_PROFILE_META[activeSlug] ?? DEMO_LEAD_PROFILE_META[PRIMARY_DEMO_DEAL_CASE.slug];
  const flightSegments = resolveFlightSegments(activeSlug);
  const paymentStack = [
    { label: "Quote Total", value: `₹${activeDeal.finance.quote_total.toLocaleString("en-IN")}` },
    { label: "Deposit Due", value: `₹${activeDeal.finance.deposit_due.toLocaleString("en-IN")}` },
    { label: "Status", value: activeDeal.finance.status },
    { label: "Gross Profit", value: `₹${activeDeal.finance.gross_profit.toLocaleString("en-IN")}` },
  ];
  const executionOwners = [
    { lane: "Sales", owner: paymentMeta.owner, note: "Client promise keeper and final commercial owner." },
    { lane: "Operations", owner: "Rohan Iyer", note: "Owns confirmations, supplier checks, and guest pack release." },
    { lane: "Finance", owner: "Meera Shah", note: "Verifies deposits, balance due, and payout readiness." },
    { lane: "Supplier", owner: activeDeal.bidding.vendor, note: "Primary supplier aligned to the current case profile." },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setActiveSlug(normalizeDemoCaseSlug(params.get("case")));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Execution Workspace</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Bookings & Handoffs</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] sm:text-4xl font-black uppercase tracking-tighter text-[#F5F0E8] font-headline">Booking Execution Hub</h1>
            <ScreenInfoTip content={SCREEN_HELP.bookings} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            This is the post-sale operating layer: confirmations, documents, payments, and responsibility handoff once a case moves beyond quoting.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[#C9A84C]">{visibleCompany}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">{visibleRoles}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              {profile.market.country} · {profile.baseCurrency}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <Link
            href={dealHrefFromSlug(activeCase.slug)}
            className="w-full sm:w-auto text-center rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10"
          >
            Back to Deal
          </Link>
          <button className="w-full sm:w-auto rounded-xl bg-[#C9A84C] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_20px_rgba(201,168,76,0.2)] transition-all hover:scale-105 active:scale-95">
            Release Guest Pack
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Execution State" value="Operational" sub={`${activeCase.destination} case is ready for handoff`} icon={<ShieldCheck size={16} />} />
        <MetricCard label="Deposit" value={activeDeal.finance.status.includes("pending") ? "Pending" : "In motion"} sub="Finance checkpoint is visible" icon={<BadgeIndianRupee size={16} />} />
        <MetricCard label="Documents" value="3 staged" sub="Voucher, receipt, arrival brief" icon={<FileText size={16} />} />
        <MetricCard label="Ops Owner" value="Rohan Iyer" sub={`Live owner for ${activeCase.guest}`} icon={<Users size={16} />} />
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#C9A84C] mb-2">Active Execution Case</div>
            <h2 className="text-lg font-black text-[#F5F0E8]">{activeCase.guest} · {activeCase.caseName} · post-quote handoff</h2>
            <p className="mt-2 text-sm text-[#B8B0A0] leading-relaxed max-w-3xl">
              This is the execution consequence of the deal approval: deposit verified, supplier confirmed, documents queued, and ops ownership made explicit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-1.5 text-[#C9A84C]">Backed by deal #{String(activeCase.leadId)}</span>
            <span className="rounded-full border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-[#B8B0A0]">Ready for guest pack release</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#C9A84C] mb-2">Execution Continuity</div>
            <h2 className="text-lg sm:text-xl font-black text-[#F5F0E8]">From quote approval to traveler-ready delivery</h2>
          </div>
          <span className="rounded-full border border-[#1D9E75]/20 bg-[#1D9E75]/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#1D9E75]">
            Alpha workflow
          </span>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {EXECUTION_STEPS.map((step) => (
            <button
              key={step.label}
              type="button"
              onClick={() => setSelectedStep(step)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                selectedStep.label === step.label ? "border-[#C9A84C]/30 bg-[#0A0A0A]" : "border-[#C9A84C]/10 bg-[#111111] hover:border-[#C9A84C]/20"
              }`}
            >
              <div className="text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">{step.label}</div>
              <div className="mt-2 text-sm font-semibold text-[#F5F0E8] leading-relaxed">{step.detail}</div>
              <div className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{step.state}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Selected checkpoint</div>
              <div className="mt-1 text-sm font-black text-[#F5F0E8]">{selectedStep.label}</div>
            </div>
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
              {selectedStep.state}
            </span>
          </div>
          <div className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{selectedStep.detail}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Execution Risk Strip</h2>
          </div>
          <div className="space-y-3">
            {EXECUTION_EXCEPTIONS.map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl border p-4 ${
                  item.tone === "good"
                    ? "border-[#1D9E75]/20 bg-[#1D9E75]/10"
                    : item.tone === "watch"
                      ? "border-[#C9A84C]/20 bg-[#C9A84C]/10"
                      : "border-white/10 bg-[#0A0A0A]"
                }`}
              >
                <div className="text-sm font-black text-[#F5F0E8]">{item.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Dispatch Checklist</h2>
          </div>
          <div className="space-y-3">
            {DISPATCH_CHECKLIST.map((item) => (
              <div key={item.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[#F5F0E8]">{item.label}</div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                      item.state === "Done"
                        ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#1D9E75]"
                        : "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]"
                    }`}
                  >
                    {item.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-2">
        {EXECUTION_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === tab ? "bg-[#C9A84C] text-[#0A0A0A]" : "text-[#B8B0A0] hover:text-[#F5F0E8]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="xl:col-span-7 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Ticket size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">
              {activeTab === "Overview" && "Travel Readiness"}
              {activeTab === "Travel" && "Travel Segments"}
              {activeTab === "Documents" && "Document Release"}
              {activeTab === "Payments" && "Payment Readiness"}
              {activeTab === "Operations" && "Ownership & Handoff"}
            </h2>
          </div>

          {activeTab === "Overview" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadinessCard icon={<MapPin size={16} />} title="Flights + transfers" detail="Outbound ticketed, return held, airport transfer instructions staged." />
              <ReadinessCard icon={<Landmark size={16} />} title="Supplier confirmation" detail="Hotel and transfer vendors aligned to the same guest profile and arrival window." />
              <ReadinessCard icon={<Receipt size={16} />} title="Finance release" detail="Deposit confirmed, balance due visible, and payout timing protected." />
              <ReadinessCard icon={<FileText size={16} />} title="Guest pack" detail="Voucher set, receipt, and arrival brief ready for the customer-facing release." />
            </div>
          )}

          {activeTab === "Travel" && (
            <div className="space-y-3">
              {flightSegments.map((segment) => (
                <div key={segment.route} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-[#F5F0E8]">{segment.route}</div>
                      <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{segment.airline}</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                        <span className="text-[#B8B0A0]">Depart: {segment.departure}</span>
                        <span className="text-[#B8B0A0]">Arrive: {segment.arrival}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                        {segment.status}
                      </span>
                      <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{segment.reference}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Documents" && (
            <div className="space-y-4">
              {DOCUMENT_STACK.map((doc) => (
                <div key={doc.title} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-[#F5F0E8]">{doc.title}</div>
                      <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{doc.note}</div>
                    </div>
                    <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#0A0A0A] p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Invoice footer source</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <BookingDetail label="Beneficiary" value={visibleBank.beneficiaryName} />
                  <BookingDetail label="Bank" value={visibleBank.bankName} />
                  <BookingDetail label="Routing" value={visibleBank.routingCode} />
                  <BookingDetail label="Billing Address" value={visibleBank.billingAddress} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "Payments" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="space-y-3">
                  {paymentStack.map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-[#C9A84C]/5 pb-2">
                      <span className="text-sm text-[#B8B0A0]">{item.label}</span>
                      <span className="text-sm font-semibold text-[#F5F0E8]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
                  <Landmark size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Settlement Instructions</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <BookingDetail label="Beneficiary" value={visibleBank.beneficiaryName} />
                  <BookingDetail label="Account Number" value={visibleBank.accountNumber} />
                  <BookingDetail label="Bank / Branch" value={`${visibleBank.bankName} · ${visibleBank.branchName}`} />
                  <BookingDetail label="Account Type" value={visibleBank.accountType} />
                  <BookingDetail label="Routing" value={visibleBank.routingCode} />
                  <BookingDetail label="Billing Address" value={visibleBank.billingAddress} />
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4 text-sm leading-relaxed text-[#B8B0A0]">
                  Payment reminders, invoice footers, and remittance guidance now inherit the same bank profile captured during onboarding.
                </div>
              </div>
            </div>
          )}

          {activeTab === "Operations" && (
            <div className="space-y-3">
              {executionOwners.map((owner) => (
                <div key={owner.lane} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{owner.lane}</div>
                      <div className="mt-1 text-sm font-black text-[#F5F0E8]">{owner.owner}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{owner.note}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="xl:col-span-5 space-y-6">
          <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Execution Notes</h2>
            </div>
            <div className="space-y-3">
              <WorkspaceNote tone="neutral" text={`Guest profile stays attached to ${activeDeal.capture.phone.toLowerCase()} and final arrival brief release.`} />
              <WorkspaceNote tone="success" text={`${activeDeal.finance.status} and execution control is visible on the same case.`} />
              <WorkspaceNote tone="neutral" text="DMC supplier thread is already linked so ops does not need to re-collect supplier terms." />
            </div>
          </section>

          <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Next Actions</h2>
            </div>
            <div className="space-y-3">
              <ActionLink href="/dashboard/comms" label="Release guest pack in Comms" />
              <ActionLink href="/dashboard/dmc" label="Review supplier confirmation in DMC" />
              <ActionLink href="/dashboard/finance" label="Check balance due in Finance" />
              <ActionLink href={`/dashboard/traveler-pdf/${activeDeal.slug}`} label="Open traveler PDF route" />
              <ActionLink href={`/dashboard/invoices/${activeDeal.slug}`} label="Open branded invoice route" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
      <div className="mt-1 text-xs text-[#4A453E]">{sub}</div>
    </div>
  );
}

function ReadinessCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{detail}</p>
    </div>
  );
}

function WorkspaceNote({ text, tone }: { text: string; tone: "neutral" | "success" }) {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm leading-relaxed ${
        tone === "success"
          ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#F5F0E8]"
          : "border-[#C9A84C]/10 bg-[#0A0A0A] text-[#B8B0A0]"
      }`}
    >
      {text}
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#F5F0E8] hover:border-[#C9A84C]/20 transition-colors"
    >
      <span>{label}</span>
      <ArrowRight size={14} className="text-[#C9A84C]" />
    </Link>
  );
}

function BookingDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#F5F0E8]">{value}</div>
    </div>
  );
}
