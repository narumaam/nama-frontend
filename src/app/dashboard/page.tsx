"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScreenInfoTip from "@/components/screen-info-tip";
import { DEMO_CASE_ROUTES, getPrimaryDemoCase } from "@/lib/demo-cases";
import { getDemoBrandTheme, getDemoDomainMode, getDemoWorkspaceDomain } from "@/lib/demo-profile";
import { seedDemoScenario } from "@/lib/demo-scenarios";
import { SCREEN_HELP } from "@/lib/screen-help";
import { useDemoMembers } from "@/lib/use-demo-members";
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
    title: "3. Itinerary creation",
    body: `Open the ${PRIMARY_CASE.destination} itinerary workspace to show that the trip is being assembled before the quote, finance, and traveler-facing handoff.`,
    href: "/dashboard/itineraries",
    cta: "Open itinerary workspace",
  },
  {
    title: "4. Deal conversion",
    body: `Use the ${PRIMARY_CASE.destination} case for triage, itinerary logic, quote framing, vendor position, and the conversion story.`,
    href: `/dashboard/deals?case=${PRIMARY_CASE.slug}`,
    cta: `Open ${PRIMARY_CASE.destination} deal`,
  },
  {
    title: "5. Finance-lite",
    body: "Show margin visibility, deposit pressure, and release readiness as a dedicated control layer instead of a hidden spreadsheet step.",
    href: "/dashboard/finance",
    cta: "Open finance control",
  },
  {
    title: "6. Supplier to execution",
    body: "Close on DMC normalization and bookings handoff to prove the alpha runs as one operating system.",
    href: "/dashboard/bookings",
    cta: "Open booking execution",
  },
];

const PREVIEW_JOURNEY = [
  { label: "Capture", href: "/dashboard/leads", detail: "Website, WhatsApp, email, and phone" },
  { label: "Design", href: "/dashboard/itineraries", detail: "Draft the itinerary before the commercial handoff" },
  { label: "Convert", href: `/dashboard/deals?case=${PRIMARY_CASE.slug}`, detail: "Triage, itinerary, quote, and close logic" },
  { label: "Control", href: "/dashboard/finance", detail: "Margin, deposits, and release checks" },
  { label: "Normalize", href: "/dashboard/dmc", detail: "Contracts, suppliers, and DMC ops" },
  { label: "Execute", href: "/dashboard/bookings", detail: "Documents, payments, and handoff" },
];

const DEMO_CONTINUITY = [
  {
    title: "Autopilot",
    href: "/dashboard/autopilot",
    detail: "Control-layer case routing, follow-up, and live attention feed.",
  },
  {
    title: "Ekla",
    href: "/dashboard/ekla",
    detail: "Orchestration layer for the agency operating story and workflow handoff.",
  },
  {
    title: "Evolution",
    href: "/dashboard/evolution",
    detail: "Learning layer shown as support, not the finish line of the demo.",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const profile = useDemoProfile();
  const memberRegistry = useDemoMembers();
  const [cases] = useState<DemoCase[]>(FALLBACK_CASES);
  const [founderLaunchMessage, setFounderLaunchMessage] = useState("Seed the strongest scenario and jump directly into the founder-ready pack.");
  const demoCompany = profile.company;
  const demoOperator = profile.operator;
  const businessRoles = profile.roles;
  const demoMarket = profile.market;
  const enabledCurrencies = profile.enabledCurrencies;
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const domainMode = getDemoDomainMode(brandTheme);
  const accentHex = "#1e3a8a";
  const accentSoft = `${accentHex}14`;
  const accentBorder = `${accentHex}33`;

  const totalQuote = cases.reduce((sum, item) => sum + item.quote_total, 0);
  const avgQuote = Math.round(totalQuote / Math.max(cases.length, 1));
  const criticalCount = cases.filter((item) => item.priority === "CRITICAL").length;
  const depositExposure = DEMO_CASE_ROUTES.reduce((sum, item) => sum + item.depositDue, 0);
  const tenantMembers = useMemo(
    () => memberRegistry.members.filter((member) => member.tenantName === demoCompany),
    [demoCompany, memberRegistry.members]
  );
  const activeMembers = tenantMembers.filter((member) => member.status === "Active");
  const invitedMembers = tenantMembers.filter((member) => member.status === "Invited");
  const coveredRoles = new Set(tenantMembers.map((member) => member.role)).size;
  const memberPreview = tenantMembers.slice(0, 3);

  function launchFounderPack() {
    seedDemoScenario("founder");
    setFounderLaunchMessage("Founder Golden Path seeded. Opening the demo pack for the Maldives honeymoon case.");
    router.push(`/dashboard/demo-pack/${PRIMARY_CASE.slug}`);
  }

  function launchRiskReview() {
    seedDemoScenario("finance-overdue");
    setFounderLaunchMessage("Finance Overdue QA seeded. Opening the audit report for the risk case.");
    router.push("/dashboard/admin/audit-report?tenant=Northstar%20Voyages&category=commercial&severity=warning&case=maldives-honeymoon");
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-[#0f172a]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#1e3a8a]">
            <span>Command Center</span>
            <ChevronRight size={10} />
            <span className="text-slate-400">Walkthrough Spine</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-[#0f172a]">Operations Overview</h1>
            <ScreenInfoTip content={SCREEN_HELP.overview} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            This overview is the April 6 demo spine: one configured workspace, one coherent case set, and one guided path from capture through itinerary creation, finance, supplier control, and execution.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Sparkles size={16} style={{ color: accentHex }} />
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Demo Status</div>
            <div className="text-sm font-black text-[#0f172a]">Demo cases ready</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pipeline Value" value={`₹${totalQuote.toLocaleString("en-IN")}`} sub="Across 3 preview cases" icon={<BadgeIndianRupee size={16} />} />
        <MetricCard label="Avg Deal Size" value={`₹${avgQuote.toLocaleString("en-IN")}`} sub="Mean quote value" icon={<Target size={16} />} />
        <MetricCard label="Active Cases" value={`${cases.length}`} sub={`${criticalCount} marked critical`} icon={<Users size={16} />} />
        <MetricCard label="Deposit Exposure" value={`₹${depositExposure.toLocaleString("en-IN")}`} sub="Needs finance follow-through" icon={<Wallet size={16} />} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#1e3a8a]">Founder Shortcut</div>
            <h2 className="text-xl font-black text-[#0f172a]">Launch the best demo path in one click</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Seed a ready-made scenario and jump straight into either the strongest founder pack or the best risk-review proof artifact.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={launchFounderPack}
              className="rounded-2xl bg-[#1e3a8a] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-transform hover:scale-[1.01]"
            >
              Launch Founder Demo Pack
            </button>
            <button
              type="button"
              onClick={launchRiskReview}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0f172a] shadow-sm"
            >
              Launch Risk Review
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          {founderLaunchMessage}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#1e3a8a]">Member Entry Guidance</div>
            <h2 className="text-xl font-black text-[#0f172a]">Enter the workspace through real team members, not a preview switcher</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Use the dedicated member login route to enter as the operator, active employees, or accepted invitees already seeded for this tenant. Founder shortcuts stay here on overview, but role-based entry now lives on the login route where the team roster belongs.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[#f7f9fb] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#0f172a]">
            {tenantMembers.length} member records ready
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SnapshotCard label="Active Members" value={`${activeMembers.length}`} sub="Members already ready for entry" borderColor={accentBorder} />
          <SnapshotCard label="Pending Invites" value={`${invitedMembers.length}`} sub="Invitees waiting to accept before they appear as active members" borderColor={accentBorder} />
          <SnapshotCard label="Role Coverage" value={`${coveredRoles || 0}`} sub="Distinct tenant roles represented in the roster" borderColor={accentBorder} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/workspace/login"
            className="rounded-2xl border border-[#1e3a8a]/15 bg-[#1e3a8a]/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1e3a8a]"
          >
            Open member login
          </Link>
          <Link
            href="/register"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0f172a]"
          >
            Review tenant setup
          </Link>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
          {memberPreview.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {memberPreview.map((member) => (
                <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1e3a8a]">{member.role.replace("-", " ")}</div>
                  <div className="mt-2 text-sm font-semibold text-[#0f172a]">{member.name}</div>
                  <div className="mt-1 break-all font-mono text-xs text-slate-500">{member.email}</div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    {member.status} · {member.source.replace("-", " ")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-slate-600">
              The member registry is not populated yet. The login route will stay ready for roster-backed entry as soon as the tenant operator, employee list, or accepted invites are present.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#1e3a8a]">Demo Continuity Rails</div>
            <h2 className="text-xl font-black text-[#0f172a]">Keep the walkthrough anchored in the operating path</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Autopilot, Ekla, and Evolution are presentable support views. If you open them during the demo, come back through overview, leads, the core deal, finance, and bookings so the story stays grounded.
            </p>
          </div>
          <Link
            href={`/dashboard/deals?case=${PRIMARY_CASE.slug}`}
            className="rounded-2xl border border-[#1e3a8a]/15 bg-[#1e3a8a]/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1e3a8a]"
          >
            Return to core case
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {DEMO_CONTINUITY.map((item) => (
            <Link key={item.title} href={item.href} className="rounded-2xl border border-slate-200 bg-[#f7f9fb] p-4 transition-colors hover:border-[#1e3a8a]/20 hover:bg-white">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1e3a8a]">{item.title}</div>
              <div className="mt-2 text-sm font-semibold text-[#0f172a]">{item.detail}</div>
              <div className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Continue here if needed</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#1e3a8a]">Canonical Demo Journey</div>
            <h2 className="text-lg font-black text-[#0f172a] sm:text-xl">One lead, one journey, five operating layers</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Use this strip as the walkthrough anchor: capture demand, build the itinerary, convert it into a structured deal, show finance control, normalize supplier input, then move into execution.
            </p>
          </div>
          <Link
            href="/dashboard/itineraries"
            className="w-full rounded-full border px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest transition-colors md:w-auto"
            style={{ borderColor: accentBorder, color: accentHex, backgroundColor: accentSoft }}
          >
            Start with itinerary workspace
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {PREVIEW_JOURNEY.map((step, index) => (
            <Link key={step.label} href={step.href} className="rounded-2xl border border-slate-200 bg-[#f7f9fb] p-4 transition-colors hover:border-[#1e3a8a]/20 hover:bg-white">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#1e3a8a]">
                {String(index + 1).padStart(2, "0")} · {step.label}
              </div>
              <div className="mt-2 text-sm font-semibold text-[#0f172a]">{step.detail}</div>
              <div className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Next click</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Bot size={14} className="text-[#1e3a8a]" />
              <h2 className="text-lg font-black text-[#0f172a]">Onboarding Snapshot</h2>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              The workspace carries forward the operating choices made in onboarding: company identity, operator, hybrid business roles, market defaults, base currency, selling currencies, and gateway route.
            </p>
          </div>
          <Link href="/register" className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#1e3a8a]">
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
        <section className="rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-3 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-[#1e3a8a]" />
            <h2 className="text-lg font-black text-[#0f172a]">Omnichannel Capture</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-slate-600">
            Website forms, WhatsApp, email, and call transcripts all land in one CRM lane so the team sees one continuous traveler story before it becomes a deal.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {CAPTURE_SIGNALS.map((signal) => (
              <div key={signal.channel} className="rounded-2xl border border-slate-200 bg-[#f7f9fb] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#1e3a8a]">{signal.channel}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{signal.tone}</span>
                </div>
                <div className="mb-1 text-sm font-black text-[#0f172a]">{signal.lead}</div>
                <div className="text-xs leading-relaxed text-slate-600">{signal.note}</div>
                <div className="mt-3 text-[9px] font-black uppercase tracking-widest text-[#1e3a8a]">{signal.source}</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-2 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={14} className="text-[#1e3a8a]" />
            <h2 className="text-lg font-black text-[#0f172a]">Walkthrough Guide</h2>
          </div>
          <div className="space-y-4">
            {WALKTHROUGH_GUIDE.map((step) => (
              <Link key={step.title} href={step.href} className="block rounded-2xl border border-slate-200 bg-[#f7f9fb] p-4 transition-colors hover:border-[#1e3a8a]/20 hover:bg-white">
                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#1e3a8a]">{step.title}</div>
                <div className="text-sm leading-relaxed text-slate-600">{step.body}</div>
                <div className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400">{step.cta}</div>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-2 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#0f172a]">Priority Cases</h2>
              <p className="mt-1 text-sm text-slate-600">Open any case to walk the same alpha through CRM, deal conversion, finance, supplier control, and execution.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/finance" className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#1e3a8a]">
                Finance checkpoint <ChevronRight size={14} />
              </Link>
              <Link href="/dashboard/autopilot" className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#1e3a8a]">
                Autopilot sidebar <ChevronRight size={14} />
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            {cases.map((item) => (
              <Link key={item.slug} href={`/dashboard/deals?case=${item.slug}`} className="block rounded-2xl border border-slate-200 bg-[#f7f9fb] p-5 transition-all hover:border-[#1e3a8a]/25 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-[8px] font-mono font-black uppercase tracking-widest ${
                          item.priority === "CRITICAL"
                            ? "border-red-400/20 bg-red-50 text-red-500"
                            : "border-[#1e3a8a]/20 bg-[#1e3a8a]/10 text-[#1e3a8a]"
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.destination}</span>
                    </div>
                    <h3 className="text-lg font-black text-[#0f172a]">{item.guest_name}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{item.query}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Quote</div>
                    <div className="text-xl font-black text-[#1e3a8a]">₹{item.quote_total.toLocaleString("en-IN")}</div>
                    <div className="mt-2 max-w-[160px] text-[10px] font-black uppercase tracking-widest text-emerald-600">{item.status}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Wallet size={14} className="text-[#1e3a8a]" />
            <h2 className="text-lg font-black text-[#0f172a]">Demo Focus</h2>
          </div>
          <div className="space-y-3">
            <FocusCard
              title={PRIMARY_CASE.destination}
              note="Use this as the primary case because it spans itinerary creation, urgency, margin, supplier fit, and deposit timing."
            />
            <FocusCard title="Itinerary first" note="Open the itinerary workspace before the deal screen so the audience sees the trip being created, not only priced." />
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[#1e3a8a]">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#0f172a]">{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{sub}</div>
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
    <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: borderColor || "#1e3a8a1a" }}>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-black text-[#0f172a]">{value}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-600">{sub}</div>
    </div>
  );
}

function FocusCard({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#f7f9fb] p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#1e3a8a]">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{note}</div>
    </div>
  );
}
