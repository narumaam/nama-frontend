"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import ScreenInfoTip from "@/components/screen-info-tip";
import { DEMO_CASE_ROUTES, getPrimaryDemoCase } from "@/lib/demo-cases";
import { getDemoBrandTheme, getDemoDomainMode, getDemoWorkspaceDomain } from "@/lib/demo-profile";
import { SCREEN_HELP } from "@/lib/screen-help";
import { useDemoProfile } from "@/lib/use-demo-profile";
import { BadgeIndianRupee, Bot, ChevronRight, Clock3, Sparkles, Target, Users, Wallet } from "lucide-react";

type DemoCase = {
  slug: string;
  lead_id: number;
  guest_name: string;
  priority: string;
  query: string;
  destination: string;
  quote_total: number;
  status: string;
};

type CaptureSignal = {
  channel: string;
  source: string;
  lead: string;
  note: string;
  tone: string;
};

const PRIMARY_CASE = getPrimaryDemoCase();

const FALLBACK_CASES: DemoCase[] = DEMO_CASE_ROUTES.map((item) => ({
  slug: item.slug,
  lead_id: item.leadId,
  guest_name: item.guest,
  priority: item.priority,
  query: item.query,
  destination: item.destination,
  quote_total: item.quoteTotal,
  status: item.financeStatus,
}));

const CAPTURE_SIGNALS: CaptureSignal[] = [
  ...DEMO_CASE_ROUTES.map((item) => ({
    channel: item.intakeChannel,
    source: item.intakeSource,
    lead: item.guest,
    note: item.intakeNote,
    tone: item.intakeTone,
  })),
  {
    channel: "Phone",
    source: "Call transcript capture",
    lead: "Corporate lead",
    note: "Call notes are stored in the same workspace so no one asks the traveler to repeat themselves.",
    tone: "Call-to-CRM",
  },
];

const WALKTHROUGH_GUIDE = [
  {
    title: "1. Onboarding fit",
    body: "Start with the configured business profile, market defaults, and operating identity so the workspace feels tailored from the first screen.",
    href: "/register",
    cta: "Click into onboarding",
  },
  {
    title: "2. CRM urgency",
    body: "Move into Leads to show omnichannel capture, fit scoring, owner load, and urgency control before opening a case.",
    href: "/dashboard/leads",
    cta: "Click into leads",
  },
  {
    title: "3. Deal conversion",
    body: `Use the ${PRIMARY_CASE.destination} case for triage, itinerary logic, quote framing, vendor position, and the conversion story.`,
    href: `/dashboard/deals?case=${PRIMARY_CASE.slug}`,
    cta: `Open ${PRIMARY_CASE.destination} deal`,
  },
  {
    title: "4. Finance-lite",
    body: "Show margin visibility, deposit pressure, and release readiness as a dedicated control layer instead of a hidden spreadsheet step.",
    href: "/dashboard/finance",
    cta: "Open finance control",
  },
  {
    title: "5. Supplier to execution",
    body: "Close on DMC normalization and bookings handoff to prove the alpha runs as one operating system.",
    href: "/dashboard/bookings",
    cta: "Open booking execution",
  },
];

const PREVIEW_JOURNEY = [
  { label: "Capture", href: "/dashboard/leads", detail: "Website, WhatsApp, email, and phone" },
  { label: "Convert", href: `/dashboard/deals?case=${PRIMARY_CASE.slug}`, detail: "Triage, itinerary, quote, and close logic" },
  { label: "Control", href: "/dashboard/finance", detail: "Margin, deposits, and release checks" },
  { label: "Normalize", href: "/dashboard/dmc", detail: "Contracts, suppliers, and DMC ops" },
  { label: "Execute", href: "/dashboard/bookings", detail: "Documents, payments, and handoff" },
];

export default function DashboardPage() {
  const profile = useDemoProfile();
  const [cases, setCases] = useState<DemoCase[]>(FALLBACK_CASES);
  const [loading, setLoading] = useState(true);
  const demoCompany = profile.company;
  const demoOperator = profile.operator;
  const businessRoles = profile.roles;
  const demoMarket = profile.market;
  const enabledCurrencies = profile.enabledCurrencies;
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const domainMode = getDemoDomainMode(brandTheme);
  const accentHex = brandTheme.enabled ? brandTheme.accentHex : "#C9A84C";
  const accentSoft = `${accentHex}14`;
  const accentBorder = `${accentHex}33`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(apiUrl("/demo/cases"));
        const data = await response.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setCases(data);
        }
      } catch {
        if (!cancelled) setCases(FALLBACK_CASES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalQuote = cases.reduce((sum, item) => sum + item.quote_total, 0);
  const avgQuote = Math.round(totalQuote / Math.max(cases.length, 1));
  const criticalCount = cases.filter((item) => item.priority === "CRITICAL").length;
  const depositExposure = DEMO_CASE_ROUTES.reduce((sum, item) => sum + item.depositDue, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Alpha Preview</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Walkthrough Spine</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-[#F5F0E8]">Operations Overview</h1>
            <ScreenInfoTip content={SCREEN_HELP.overview} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            This overview is the April 6 preview spine: one configured workspace, one coherent case set, and one guided path from capture through finance, supplier control, and execution.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-[#111111] px-4 py-3" style={{ borderColor: accentBorder }}>
          <Sparkles size={16} style={{ color: accentHex }} />
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Preview Status</div>
            <div className="text-sm font-black text-[#F5F0E8]">{loading ? "Syncing preview cases..." : "Preview cases ready"}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pipeline Value" value={`₹${totalQuote.toLocaleString("en-IN")}`} sub="Across 3 preview cases" icon={<BadgeIndianRupee size={16} />} />
        <MetricCard label="Avg Deal Size" value={`₹${avgQuote.toLocaleString("en-IN")}`} sub="Mean quote value" icon={<Target size={16} />} />
        <MetricCard label="Active Cases" value={`${cases.length}`} sub={`${criticalCount} marked critical`} icon={<Users size={16} />} />
        <MetricCard label="Deposit Exposure" value={`₹${depositExposure.toLocaleString("en-IN")}`} sub="Needs finance follow-through" icon={<Wallet size={16} />} />
      </div>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#C9A84C]">Canonical Preview Journey</div>
            <h2 className="text-lg font-black text-[#F5F0E8] sm:text-xl">One lead, one journey, five operating layers</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
              Use this strip as the walkthrough anchor: capture demand, convert it into a structured deal, show finance control, normalize supplier input, then move into execution.
            </p>
          </div>
          <Link
            href={`/dashboard/deals?case=${PRIMARY_CASE.slug}`}
            className="w-full rounded-full border bg-[#0A0A0A] px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest transition-colors md:w-auto"
            style={{ borderColor: accentBorder, color: accentHex, backgroundColor: accentSoft }}
          >
            Start walkthrough with {PRIMARY_CASE.destination}
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {PREVIEW_JOURNEY.map((step, index) => (
            <Link key={step.label} href={step.href} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 transition-colors hover:border-[#C9A84C]/20">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                {String(index + 1).padStart(2, "0")} · {step.label}
              </div>
              <div className="mt-2 text-sm font-semibold text-[#F5F0E8]">{step.detail}</div>
              <div className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Next click</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Bot size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Onboarding Snapshot</h2>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
              The workspace carries forward the operating choices made in onboarding: company identity, operator, hybrid business roles, market defaults, base currency, selling currencies, and gateway route.
            </p>
          </div>
          <Link href="/register" className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#C9A84C]">
            Review onboarding <ChevronRight size={14} />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SnapshotCard label="Company" value={demoCompany} sub={`Run by ${demoOperator}`} />
          <SnapshotCard label="Business Roles" value={businessRoles.join(" + ")} sub="One entity can operate as all three" />
          <SnapshotCard label="Operating Market" value={demoMarket.country} sub={demoMarket.language} />
          <SnapshotCard label="Base Currency" value={demoMarket.currency} sub={`${enabledCurrencies.filter((item) => item !== demoMarket.currency).join(", ") || "No extras"} enabled`} />
          <SnapshotCard label="Gateway Route" value={demoMarket.gateway} sub="Market-aware billing and checkout" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SnapshotCard
            label="Workspace Brand"
            value={brandTheme.enabled ? brandTheme.workspaceName : "NAMA OS"}
            sub={brandTheme.enabled ? `Badge ${brandTheme.badgeGlyph} · Accent ${brandTheme.accentHex}` : "Platform default branding"}
            borderColor={accentBorder}
          />
          <SnapshotCard
            label="Workspace Domain"
            value={workspaceDomain}
            sub={domainMode === "nama-subdomain" ? "Customer gets a NAMA-hosted subdomain" : "Customer connects their own domain"}
            borderColor={accentBorder}
          />
          <SnapshotCard
            label="Support Route"
            value={brandTheme.supportEmail}
            sub="Tenant-facing inbox used across the workspace"
            borderColor={accentBorder}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6 lg:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Omnichannel Capture</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            Website forms, WhatsApp, email, and call transcripts all land in one CRM lane so the team sees one continuous traveler story before it becomes a deal.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {CAPTURE_SIGNALS.map((signal) => (
              <div key={signal.channel} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{signal.channel}</span>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{signal.tone}</span>
                </div>
                <div className="mb-1 text-sm font-black text-[#F5F0E8]">{signal.lead}</div>
                <div className="text-xs leading-relaxed text-[#B8B0A0]">{signal.note}</div>
                <div className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#1D9E75]">{signal.source}</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Walkthrough Guide</h2>
          </div>
          <div className="space-y-4">
            {WALKTHROUGH_GUIDE.map((step) => (
              <Link key={step.title} href={step.href} className="block rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 transition-colors hover:border-[#C9A84C]/20">
                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{step.title}</div>
                <div className="text-sm leading-relaxed text-[#B8B0A0]">{step.body}</div>
                <div className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{step.cta}</div>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#F5F0E8]">Priority Cases</h2>
              <p className="mt-1 text-sm text-[#B8B0A0]">Open any case to walk the same alpha through CRM, deal conversion, finance, supplier control, and execution.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/finance" className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                Finance checkpoint <ChevronRight size={14} />
              </Link>
              <Link href="/dashboard/autopilot" className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                Autopilot sidebar <ChevronRight size={14} />
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            {cases.map((item) => (
              <Link key={item.slug} href={`/dashboard/deals?case=${item.slug}`} className="block rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5 transition-all hover:border-[#C9A84C]/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-[8px] font-mono font-black uppercase tracking-widest ${
                          item.priority === "CRITICAL"
                            ? "border-red-400/20 bg-red-400/10 text-red-400"
                            : "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]"
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{item.destination}</span>
                    </div>
                    <h3 className="text-lg font-black text-[#F5F0E8]">{item.guest_name}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#B8B0A0]">{item.query}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Quote</div>
                    <div className="text-xl font-black text-[#C9A84C]">₹{item.quote_total.toLocaleString("en-IN")}</div>
                    <div className="mt-2 max-w-[160px] text-[10px] text-[#1D9E75]">{item.status}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Wallet size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Preview Focus</h2>
          </div>
          <div className="space-y-3">
            <FocusCard
              title={PRIMARY_CASE.destination}
              note="Use this as the primary case because it spans urgency, margin, supplier fit, and deposit timing."
            />
            <FocusCard title="Finance-lite" note="Show finance between deal and bookings so execution feels earned through release control." />
            <FocusCard title="DMC continuity" note="Use supplier normalization as proof that the alpha is not only front-end CRM polish." />
          </div>
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
      <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{sub}</div>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  sub,
  borderColor,
}: {
  label: string;
  value: string;
  sub: string;
  borderColor?: string;
}) {
  return (
    <div className="rounded-2xl border bg-[#0A0A0A] p-4" style={{ borderColor: borderColor || "#C9A84C1A" }}>
      <div className="text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-2 text-sm font-black text-[#F5F0E8]">{value}</div>
      <div className="mt-1 text-xs leading-relaxed text-[#B8B0A0]">{sub}</div>
    </div>
  );
}

function FocusCard({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{note}</div>
    </div>
  );
}
