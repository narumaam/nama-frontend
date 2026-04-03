"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScreenInfoTip from "@/components/screen-info-tip";
import { DEMO_PLAN_PRICES, readDemoSubscriptionPlan, readDemoTenantRegistry } from "@/lib/demo-admin";
import { MARKET_PRESETS, SUPPORTED_CURRENCIES } from "@/lib/demo-config";
import { filterDemoEvents, type DemoEventRange, type DemoEventSeverity } from "@/lib/demo-events";
import { DEFAULT_DEMO_PROFILE } from "@/lib/demo-profile";
import { useDemoEvents } from "@/lib/use-demo-events";
import { useDemoProfile } from "@/lib/use-demo-profile";
import { DEMO_SCENARIOS, getScenarioProjectedMrr, resetDemoState, seedDemoScenario, type DemoScenarioKey } from "@/lib/demo-scenarios";
import { SCREEN_HELP } from "@/lib/screen-help";
import { clearSuperAdminSession, hasSuperAdminSession, readSuperAdminSession } from "@/lib/super-admin-session";
import { useDemoWorkflow } from "@/lib/use-demo-workflow";
import {
  AlertTriangle,
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DatabaseZap,
  ExternalLink,
  FileDown,
  Globe,
  Globe2,
  LayoutTemplate,
  Lock,
  Languages,
  Landmark,
  RotateCcw,
  Shield,
  Sparkles,
  Users,
  Waypoints,
} from "lucide-react";

const TENANT_HEALTH = [
  {
    name: "Nair Luxury Escapes",
    tier: "Growth",
    users: 14,
    activeUsers: 11,
    pendingInvites: 2,
    status: "Healthy",
    renewal: "12 Apr 2026",
    mrr: "₹49,000",
    healthNote: "Growth tenant is using the core workflow without major blockers.",
  },
  {
    name: "Velocity Corporate Travel",
    tier: "Enterprise",
    users: 22,
    activeUsers: 18,
    pendingInvites: 2,
    status: "Attention",
    renewal: "18 Apr 2026",
    mrr: "₹1,25,000",
    healthNote: "Renewal is close and enterprise usage is high.",
  },
  {
    name: "BluePalm Holidays",
    tier: "Starter",
    users: 8,
    activeUsers: 6,
    pendingInvites: 1,
    status: "Healthy",
    renewal: "09 Apr 2026",
    mrr: "₹24,000",
    healthNote: "Starter tenant is stable with light but healthy usage.",
  },
];

const RULES = [
  {
    title: "Lead Escalation Rule",
    description: "Critical leads unanswered for 20 minutes are pushed into Autopilot and surfaced on Kinetic.",
    scope: "Global",
  },
  {
    title: "Margin Guardrail",
    description: "Quotes below 15% margin are flagged for approval before send.",
    scope: "Finance",
  },
  {
    title: "Template Inheritance",
    description: "New tenants inherit the master comms templates until they override their own tone and branding.",
    scope: "Comms",
  },
];

const SUBSCRIPTION_PLANS = [
  {
    name: "Starter",
    price: "₹24,000/mo",
    note: "Core CRM, itineraries, and deterministic operating flow for smaller teams.",
  },
  {
    name: "Growth",
    price: "₹49,000/mo",
    note: "Adds deeper finance, team access, white-label readiness, and management controls.",
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "Multi-team governance, hierarchy, SSO-ready workflows, and private deployment controls.",
  },
];

const CONTROL_PANELS = [
  {
    title: "Subscriptions",
    icon: CreditCard,
    detail: "Create plans, inspect renewals, and stage upgrades or downgrades.",
  },
  {
    title: "Rules & Guardrails",
    icon: Shield,
    detail: "Control lead escalation, quote thresholds, and workflow approval policies.",
  },
  {
    title: "Templates",
    icon: LayoutTemplate,
    detail: "Manage platform-level email, WhatsApp, invoice, and white-label starter templates.",
  },
  {
    title: "Tenant Health",
    icon: Building2,
    detail: "Watch tenant readiness, health signals, adoption, and commercial status in one view.",
  },
];

const REGIONAL_COMMERCE = MARKET_PRESETS.map((market) => ({
  market: market.country,
  language: market.language,
  baseCurrency: market.currency,
  extraCurrencies: SUPPORTED_CURRENCIES.filter((item) => item !== market.currency).join(", "),
  billingCurrency: market.currency,
  gateway: market.gateway,
  note:
    market.country === "India"
      ? "Use GST-aware invoicing, INR subscription pricing, and domestic payment flow for Indian agencies."
      : market.country === "UAE"
        ? "Present AED pricing, Arabic-ready customer copy, and a cross-border payment rail for faster checkout."
        : market.country === "Europe"
          ? "Show EUR plans, VAT-aware billing, and region-appropriate policy wording."
          : "Use USD-led subscription pricing with global card routing and standard enterprise billing.",
}));

const FX_CONTROL_STACK = [
  {
    title: "Rate source",
    value: "Currency converter API",
    detail: "Fetch live FX rates first, so the platform is anchored to an external source instead of hard-coded values.",
  },
  {
    title: "Safety buffer",
    value: "+2.5%",
    detail: "Add a buffer on top of the live rate to protect margin when quotes need a small cushion.",
  },
  {
    title: "Manual override",
    value: "Enabled",
    detail: "Tenant admins can lock a custom exchange rate whenever a market wants tighter control.",
  },
  {
    title: "Fallback",
    value: "Last known rate",
    detail: "If the API is unavailable, keep the checkout moving with the last accepted rate snapshot.",
  },
];

const BASE_CURRENCY_MODEL = {
  base: MARKET_PRESETS[0].currency,
  enabled: SUPPORTED_CURRENCIES.filter((currency) => currency !== MARKET_PRESETS[0].currency),
  note: "One accounting currency powers reporting and billing, while additional selling currencies stay available for quotes and checkout.",
};

const TENANT_ACTIONS = [
  { title: "Renewal watch", note: "Velocity Corporate Travel renews on 18 Apr 2026 and needs commercial attention." },
  { title: "Plan upgrade candidate", note: "Nair Luxury Escapes is using multi-team workflows that justify a Growth-to-Enterprise review." },
  { title: "Starter retention risk", note: "BluePalm Holidays has healthy usage but a narrow module footprint." },
];

const TEMPLATE_INHERITANCE = [
  { scope: "Comms", source: "Master WhatsApp + email starter pack", tenant: "Inherited until overridden" },
  { scope: "Quote framing", source: "Global margin-safe summary block", tenant: "Protected by Super Admin" },
  { scope: "White-label starter", source: "Default tenant visual kit", tenant: "Tenant can customize later" },
];

const LOCALIZATION_RULES = [
  "Detect billing country at tenant onboarding and default the subscription currency from that market.",
  "Use browser locale as a hint, but allow the tenant admin to lock language and currency manually.",
  "Switch payment gateway by region and availability instead of forcing one gateway globally.",
  "Pull exchange rates from the FX provider by default, then allow a buffer percentage or a manual locked rate when the business wants tighter control.",
  "Keep Super Admin override controls for plan pricing, tax labels, gateway routing, and fallback currencies.",
];

export default function AdminPage() {
  const router = useRouter();
  const profile = useDemoProfile();
  const workflow = useDemoWorkflow();
  const events = useDemoEvents();
  const [selectedMarket, setSelectedMarket] = useState(REGIONAL_COMMERCE[0]);
  const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS[1]);
  const [bufferEnabled, setBufferEnabled] = useState(true);
  const [manualRateEnabled, setManualRateEnabled] = useState(false);
  const [demoLabMessage, setDemoLabMessage] = useState("Use Demo Lab to reset the workspace or seed a tested scenario.");
  const [timelineTenantFilter, setTimelineTenantFilter] = useState<"All" | string>("All");
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<"All" | "commercial" | "team" | "delivery">("All");
  const [timelineCaseFilter, setTimelineCaseFilter] = useState<"All" | string>("All");
  const [timelineSeverityFilter, setTimelineSeverityFilter] = useState<"All" | DemoEventSeverity>("All");
  const [timelineRangeFilter, setTimelineRangeFilter] = useState<DemoEventRange>("All");
  const [exportMessage, setExportMessage] = useState("Copy or download the filtered audit trail as a founder-safe proof artifact.");
  const [accessReady, setAccessReady] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState("");
  const currentPlan = readDemoSubscriptionPlan();
  const tenantRegistry = readDemoTenantRegistry();
  const acceptedInvites = workflow.invites.filter((invite) => invite.status === "Accepted").length;
  const pendingInvites = workflow.invites.filter((invite) => invite.status === "Pending").length;
  const activeUsers = acceptedInvites + 1;
  const releasedArtifacts = Object.values(workflow.cases).filter((item) => item.guestPackState === "Released").length;
  const settledInvoices = Object.values(workflow.cases).filter((item) => item.invoiceState === "Paid").length;
  const wonCases = Object.values(workflow.cases).filter((item) => item.leadStage === "Won").length;
  const currentTenantMrr = DEMO_PLAN_PRICES[currentPlan];
  const currentTenantStatus = pendingInvites > 0 ? "Attention" : "Healthy";
  const currentTenantName = profile.company || DEFAULT_DEMO_PROFILE.company;
  const currentTenant = {
    name: currentTenantName,
    tier: currentPlan,
    users: workflow.employees.length + 1,
    activeUsers,
    pendingInvites,
    status: currentTenantStatus,
    renewal: tenantRegistry.find((tenant) => tenant.company === currentTenantName)?.renewalDate ?? "30 Apr 2026",
    mrr: `₹${currentTenantMrr.toLocaleString("en-IN")}`,
    healthNote:
      pendingInvites > 0
        ? `${pendingInvites} employee invite${pendingInvites > 1 ? "s are" : " is"} still waiting for acceptance.`
        : "Invite acceptance and workflow checkpoints are in a stable state.",
  };
  const tenantHealth = [
    currentTenant,
    ...TENANT_HEALTH.filter((tenant) => tenant.name !== currentTenant.name),
    ...tenantRegistry
      .filter((tenant) => tenant.company !== currentTenant.name && !TENANT_HEALTH.some((item) => item.name === tenant.company))
      .map((tenant) => ({
        name: tenant.company,
        tier: tenant.plan,
        users: 1,
        activeUsers: 1,
        pendingInvites: 0,
        status: "Healthy",
        renewal: tenant.renewalDate,
        mrr: `₹${DEMO_PLAN_PRICES[tenant.plan].toLocaleString("en-IN")}`,
        healthNote: `Registered on ${tenant.createdAt} through the onboarding flow.`,
      })),
  ];
  const totalMrr = tenantHealth.reduce((sum, tenant) => sum + Number(tenant.mrr.replace(/[^\d]/g, "")), 0);
  const totalSystemActiveUsers = tenantHealth.reduce((sum, tenant) => sum + (tenant.activeUsers ?? tenant.users), 0);
  const totalSystemPendingInvites = tenantHealth.reduce((sum, tenant) => sum + (tenant.pendingInvites ?? 0), 0);
  useEffect(() => {
    if (!hasSuperAdminSession()) {
      router.replace("/super-admin/login");
      return;
    }

    const session = readSuperAdminSession();
    setSuperAdminEmail(session?.email ?? "");
    setAccessReady(true);
  }, [router]);

  function handleExitControlTower() {
    clearSuperAdminSession();
    router.push("/super-admin/login");
  }

  const systemHealthLabel = pendingInvites > 0 ? "Monitoring" : releasedArtifacts > 0 || settledInvoices > 0 ? "Live demo active" : "Healthy";
  const totalRegisteredUsers = tenantHealth.reduce((sum, tenant) => sum + tenant.users, 0);
  const totalAcceptedInvites = tenantHealth.reduce((sum, tenant) => sum + Math.max((tenant.activeUsers ?? tenant.users) - 1, 0), 0);
  const systemLifecycle =
    settledInvoices > 0
      ? "Revenue realized"
      : wonCases > 0
        ? "Operational handoff active"
        : acceptedInvites > 0
          ? "Users onboarded"
          : tenantRegistry.length > 0
            ? "Tenants registered"
            : "Awaiting setup";
  const systemRisk =
    totalSystemPendingInvites > 2 ? "Invite backlog" : settledInvoices === 0 && wonCases > 0 ? "Collections watch" : "Stable";
  const tenantAuditRows = tenantHealth.map((tenant) => {
    const lifecycle =
      tenant.name === currentTenantName
        ? settledInvoices > 0
          ? "Paid + delivered"
          : wonCases > 0
            ? "Won + in fulfilment"
            : acceptedInvites > 0
              ? "Team onboarded"
              : "Registered"
        : tenant.pendingInvites > 0
          ? "Pending invites"
          : tenant.activeUsers > 1
            ? "Live"
            : "Registered";
    const healthScore = tenant.pendingInvites > 1 ? "At risk" : tenant.status === "Attention" ? "Watch" : "Healthy";

    return {
      ...tenant,
      lifecycle,
      healthScore,
    };
  });
  const simulatedPlanPrice = useMemo(() => {
    const baseAmount =
      selectedPlan.name === "Starter" ? 24000 : selectedPlan.name === "Growth" ? 49000 : 125000;
    const localizedAmount =
      selectedMarket.baseCurrency === "INR"
        ? baseAmount
        : selectedMarket.baseCurrency === "AED"
          ? Math.round(baseAmount / 22.7)
          : selectedMarket.baseCurrency === "EUR"
            ? Math.round(baseAmount / 90)
            : Math.round(baseAmount / 83);
    const bufferedAmount = bufferEnabled ? Math.round(localizedAmount * 1.025) : localizedAmount;
    return `${selectedMarket.baseCurrency} ${bufferedAmount.toLocaleString("en-IN")}`;
  }, [bufferEnabled, selectedMarket.baseCurrency, selectedPlan.name]);
  const timelineTenants = useMemo(() => ["All", ...Array.from(new Set(events.map((event) => event.tenant)))], [events]);
  const timelineCases = useMemo(() => ["All", ...Array.from(new Set(events.map((event) => event.caseSlug).filter(Boolean) as string[]))], [events]);
  const filteredEvents = useMemo(
    () =>
      filterDemoEvents(events, {
        tenant: timelineTenantFilter,
        caseSlug: timelineCaseFilter,
        category: timelineTypeFilter,
        severity: timelineSeverityFilter,
        range: timelineRangeFilter,
      }),
    [events, timelineCaseFilter, timelineRangeFilter, timelineSeverityFilter, timelineTenantFilter, timelineTypeFilter]
  );
  const exportText = useMemo(() => {
    return filteredEvents
      .map((event) => `${event.createdAt} | ${event.tenant} | ${event.title} | ${event.detail}${event.caseSlug ? ` | case ${event.caseSlug}` : ""}`)
      .join("\n");
  }, [filteredEvents]);
  const auditSummary = useMemo(() => {
    const successCount = filteredEvents.filter((event) => event.severity === "success").length;
    const warningCount = filteredEvents.filter((event) => event.severity === "warning").length;
    const tenantCount = new Set(filteredEvents.map((event) => event.tenant)).size;
    return {
      total: filteredEvents.length,
      successCount,
      warningCount,
      tenantCount,
    };
  }, [filteredEvents]);
  const auditReportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (timelineTenantFilter !== "All") params.set("tenant", timelineTenantFilter);
    if (timelineTypeFilter !== "All") params.set("category", timelineTypeFilter);
    if (timelineCaseFilter !== "All") params.set("case", timelineCaseFilter);
    if (timelineSeverityFilter !== "All") params.set("severity", timelineSeverityFilter);
    if (timelineRangeFilter !== "All") params.set("range", timelineRangeFilter);
    const query = params.toString();
    return `/dashboard/admin/audit-report${query ? `?${query}` : ""}`;
  }, [timelineCaseFilter, timelineRangeFilter, timelineSeverityFilter, timelineTenantFilter, timelineTypeFilter]);

  if (!accessReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-8 text-center text-sm text-[#B8B0A0]">
        Checking Super Admin access...
      </div>
    );
  }

  function handleResetDemo() {
    resetDemoState();
    setDemoLabMessage("Demo state reset to the default platform snapshot.");
  }

  function handleSeedScenario(key: DemoScenarioKey) {
    seedDemoScenario(key);
    const scenario = DEMO_SCENARIOS.find((item) => item.key === key);
    if (!scenario) return;
    setDemoLabMessage(`${scenario.label} seeded: ${scenario.company} on ${scenario.plan} with projected MRR ₹${getScenarioProjectedMrr(key).toLocaleString("en-IN")}.`);
  }

  function handleRunScenario(key: DemoScenarioKey) {
    const scenario = DEMO_SCENARIOS.find((item) => item.key === key);
    if (!scenario) return;
    seedDemoScenario(key);
    setDemoLabMessage(`${scenario.label} launched for ${scenario.company}. Redirecting to ${scenario.launchLabel.toLowerCase()}.`);
    router.push(scenario.launchPath);
  }

  async function handleCopyExport() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setExportMessage("Clipboard is unavailable in this environment.");
      return;
    }
    await navigator.clipboard.writeText(exportText || "No filtered audit events available.");
    setExportMessage(`Copied ${filteredEvents.length} filtered audit event${filteredEvents.length === 1 ? "" : "s"} to the clipboard.`);
  }

  function handleDownloadExport() {
    if (typeof window === "undefined") return;
    const blob = new Blob([exportText || "No filtered audit events available."], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nama-audit-timeline.txt";
    link.click();
    URL.revokeObjectURL(url);
    setExportMessage(`Downloaded ${filteredEvents.length} filtered audit event${filteredEvents.length === 1 ? "" : "s"} as a text proof artifact.`);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Super Admin</span>
            <ChevronRight size={10} />
            <span className="opacity-50">NAMA Control Tower</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] sm:text-4xl font-black uppercase tracking-tighter text-[#F5F0E8] font-headline">Platform Control</h1>
            <ScreenInfoTip content={SCREEN_HELP.admin} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            This is your NAMA-level governance workspace: subscriptions, platform rules, tenant status, template inheritance,
            and the commercial health of the system. It is staged as a preview-safe Super Admin surface, but it reflects the
            exact operating questions a platform owner asks.
          </p>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">
            Access route: /super-admin/login {superAdminEmail ? `• Active session: ${superAdminEmail}` : ""}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto text-center rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#F5F0E8]"
          >
            Customer entry
          </Link>
          <Link
            href="/dashboard/team"
            className="w-full sm:w-auto text-center rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10"
          >
            Team appendix
          </Link>
          <button
            type="button"
            onClick={handleExitControlTower}
            className="w-full sm:w-auto rounded-xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]"
          >
            Exit Super Admin
          </button>
          <button className="w-full sm:w-auto rounded-xl bg-[#C9A84C] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_20px_rgba(201,168,76,0.2)] transition-all hover:scale-105 active:scale-95">
            Create subscription
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Tenants" value={String(tenantHealth.length).padStart(2, "0")} sub="Current tenant plus seeded preview accounts" icon={<Building2 size={16} />} />
        <MetricCard label="MRR Snapshot" value={`₹${totalMrr.toLocaleString("en-IN")}`} sub={`Includes ${currentTenantName} on the ${currentPlan} plan`} icon={<BadgeIndianRupee size={16} />} />
        <MetricCard label="Platform Health" value={systemHealthLabel} sub={`${wonCases} won cases · ${releasedArtifacts} released artifacts`} icon={<CheckCircle2 size={16} />} />
        <MetricCard label="Logged-in Users" value={String(totalSystemActiveUsers).padStart(2, "0")} sub={`${totalSystemPendingInvites} pending invites across visible tenants`} icon={<Waypoints size={16} />} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <DatabaseZap size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Demo Lab</h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-[#B8B0A0]">
            Reset the workspace, seed a founder walkthrough, or drop in focused QA tenants without manually editing local storage between runs.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#F5F0E8]"
            >
              <RotateCcw size={12} />
              Reset Demo
            </button>
            {DEMO_SCENARIOS.map((scenario) => (
              <button
                key={scenario.key}
                type="button"
                onClick={() => handleSeedScenario(scenario.key)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A]"
              >
                <Sparkles size={12} />
                Seed {scenario.label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {DEMO_SCENARIOS.map((scenario) => (
              <div key={scenario.key} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="text-sm font-black text-[#F5F0E8]">{scenario.label}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
                  {scenario.plan} · ₹{getScenarioProjectedMrr(scenario.key).toLocaleString("en-IN")}
                </div>
                <div className="mt-2 text-xs leading-relaxed text-[#B8B0A0]">{scenario.note}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSeedScenario(scenario.key)}
                    className="rounded-xl border border-white/10 bg-[#111111] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#F5F0E8]"
                  >
                    Seed Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunScenario(scenario.key)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#0A0A0A]"
                  >
                    <ExternalLink size={11} />
                    {scenario.launchLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#0A0A0A] p-4 text-sm leading-relaxed text-[#B8B0A0]">
            {demoLabMessage}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Waypoints size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">System Audit Snapshot</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile title="Lifecycle" detail={systemLifecycle} icon={<CheckCircle2 size={14} />} />
            <InfoTile title="Risk Flag" detail={systemRisk} icon={<AlertTriangle size={14} />} />
            <InfoTile title="Registered Seats" detail={`${totalRegisteredUsers} total visible seats across tenants`} icon={<Users size={14} />} />
            <InfoTile title="Joined Users" detail={`${totalAcceptedInvites} accepted invites are active in the snapshot`} icon={<Sparkles size={14} />} />
            <InfoTile title="Subscription Revenue" detail={`₹${totalMrr.toLocaleString("en-IN")} monthly across visible tenants`} icon={<BadgeIndianRupee size={14} />} />
            <InfoTile title="Current Flow" detail={`${wonCases} won, ${settledInvoices} paid, ${releasedArtifacts} delivered`} icon={<LayoutTemplate size={14} />} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#C9A84C]" />
                <h2 className="text-lg font-black text-[#F5F0E8]">Platform Governance Layer</h2>
              </div>
              <ScreenInfoTip content={SCREEN_HELP.adminGovernance} />
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
              This is the alpha control model behind Super Admin: where tenant action, inherited templates, and platform-level commercial oversight all come together in one safe summary.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Tenant Action Queue</div>
            <div className="mt-4 space-y-3">
              {[{ title: `${currentTenantName} invite queue`, note: `${pendingInvites} invites pending, ${acceptedInvites} accepted, ${workflow.employees.length} employees in the directory.` }, { title: `${currentTenantName} subscription state`, note: `${currentPlan} plan with projected MRR ${currentTenant.mrr} and ${activeUsers} currently active users.` }, { title: "Registration feed", note: `${tenantRegistry.length || 1} tenant registrations are currently visible to Super Admin.` }, ...TENANT_ACTIONS].map((item) => (
                <div key={item.title} className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                  <div className="text-sm font-black text-[#F5F0E8]">{item.title}</div>
                  <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Template Inheritance</div>
            <div className="mt-4 space-y-3">
              {TEMPLATE_INHERITANCE.map((item) => (
                <div key={item.scope} className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                  <div className="text-sm font-black text-[#F5F0E8]">{item.scope}</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Platform source</div>
                      <div className="mt-1 text-[#B8B0A0]">{item.source}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Tenant behavior</div>
                      <div className="mt-1 text-[#B8B0A0]">{item.tenant}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Tenant & Subscription Health</h2>
            </div>
            <ScreenInfoTip content={SCREEN_HELP.adminTenants} />
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            This view gives you a platform-owner perspective: who is live, who is growing, who needs attention, and what commercial tier they sit on.
          </p>
          <div className="space-y-3">
            {tenantHealth.map((tenant) => (
              <div key={tenant.name} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{tenant.name}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">
                      {tenant.tier} · {tenant.activeUsers ?? tenant.users} active / {tenant.users} seats · Renewal {tenant.renewal}
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-[#B8B0A0]">{tenant.healthNote}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                      {tenant.mrr}
                    </span>
                    <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
                      {tenant.pendingInvites ?? 0} pending
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                        tenant.status === "Healthy"
                          ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#1D9E75]"
                          : "border-red-400/20 bg-red-400/10 text-red-300"
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="xl:col-span-5 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Shield size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Global Controls</h2>
          </div>
          <div className="space-y-3">
            {CONTROL_PANELS.map((panel) => (
              <div key={panel.title} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]">
                    <panel.icon size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{panel.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-[#B8B0A0]">{panel.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Building2 size={14} className="text-[#C9A84C]" />
          <h2 className="text-lg font-black text-[#F5F0E8]">Tenant Lifecycle & Risk Board</h2>
        </div>
        <div className="space-y-3">
          {tenantAuditRows.map((tenant) => (
            <div key={tenant.name} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-black text-[#F5F0E8]">{tenant.name}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#4A453E]">
                    {tenant.tier} · {tenant.lifecycle} · Renewal {tenant.renewal}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-[#B8B0A0]">{tenant.healthNote}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                    {tenant.activeUsers ?? tenant.users} active
                  </span>
                  <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
                    {tenant.pendingInvites ?? 0} pending
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                      tenant.healthScore === "Healthy"
                        ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#1D9E75]"
                        : tenant.healthScore === "Watch"
                          ? "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]"
                          : "border-red-400/20 bg-red-400/10 text-red-300"
                    }`}
                  >
                    {tenant.healthScore}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Waypoints size={14} className="text-[#C9A84C]" />
          <h2 className="text-lg font-black text-[#F5F0E8]">Activity Timeline</h2>
        </div>
        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto]">
          <select
            value={timelineTenantFilter}
            onChange={(event) => setTimelineTenantFilter(event.target.value)}
            className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-3 py-3 text-sm font-semibold text-[#F5F0E8] outline-none"
          >
            {timelineTenants.map((tenant) => (
              <option key={tenant} value={tenant}>
                {tenant === "All" ? "All tenants" : tenant}
              </option>
            ))}
          </select>
          <select
            value={timelineTypeFilter}
            onChange={(event) => setTimelineTypeFilter(event.target.value as typeof timelineTypeFilter)}
            className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-3 py-3 text-sm font-semibold text-[#F5F0E8] outline-none"
          >
            <option value="All">All event types</option>
            <option value="team">Team events</option>
            <option value="commercial">Commercial events</option>
            <option value="delivery">Delivery events</option>
          </select>
          <select
            value={timelineCaseFilter}
            onChange={(event) => setTimelineCaseFilter(event.target.value)}
            className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-3 py-3 text-sm font-semibold text-[#F5F0E8] outline-none"
          >
            {timelineCases.map((caseSlug) => (
              <option key={caseSlug} value={caseSlug}>
                {caseSlug === "All" ? "All cases" : caseSlug}
              </option>
            ))}
          </select>
          <select
            value={timelineSeverityFilter}
            onChange={(event) => setTimelineSeverityFilter(event.target.value as "All" | DemoEventSeverity)}
            className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-3 py-3 text-sm font-semibold text-[#F5F0E8] outline-none"
          >
            <option value="All">All severities</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={timelineRangeFilter}
            onChange={(event) => setTimelineRangeFilter(event.target.value as DemoEventRange)}
            className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-3 py-3 text-sm font-semibold text-[#F5F0E8] outline-none"
          >
            <option value="All">All dates</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
          <button
            type="button"
            onClick={handleCopyExport}
            className="rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#F5F0E8]"
          >
            Copy Audit
          </button>
          <button
            type="button"
            onClick={handleDownloadExport}
            className="rounded-xl bg-[#C9A84C] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A]"
          >
            Download Audit
          </button>
        </div>
        <div className="mb-5 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Share Summary</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <AuditSummaryStat label="Events" value={String(auditSummary.total)} />
              <AuditSummaryStat label="Success" value={String(auditSummary.successCount)} />
              <AuditSummaryStat label="Warnings" value={String(auditSummary.warningCount)} />
              <AuditSummaryStat label="Tenants" value={String(auditSummary.tenantCount)} />
            </div>
            <div className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">
              Filtered proof artifact for {timelineTenantFilter === "All" ? "all visible tenants" : timelineTenantFilter}, focused on {timelineTypeFilter === "All" ? "all event types" : timelineTypeFilter} activity.
            </div>
          </div>
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Printable Report</div>
            <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">
              Open a founder-safe printable route using the same filters, summary, and event list shown here.
            </div>
            <Link
              href={auditReportHref}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A]"
            >
              <FileDown size={12} />
              Open Audit Report
            </Link>
          </div>
        </div>
        <div className="mb-5 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#0A0A0A] p-4 text-sm leading-relaxed text-[#B8B0A0]">
          {exportMessage}
        </div>
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#0A0A0A] p-4 text-sm leading-relaxed text-[#B8B0A0]">
              No event history yet. Register a tenant, send invites, or seed a scenario from Demo Lab to generate the audit trail.
            </div>
          ) : (
            filteredEvents.slice(0, 12).map((event) => (
              <div key={event.id} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{event.title}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#4A453E]">
                      {event.tenant} · {event.createdAt}
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{event.detail}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {event.caseSlug && (
                      <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
                        {event.caseSlug}
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                        event.severity === "success"
                          ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#1D9E75]"
                          : event.severity === "warning"
                            ? "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]"
                            : "border-white/10 bg-[#111111] text-[#B8B0A0]"
                      }`}
                    >
                      {event.severity}
                    </span>
                    {event.path && (
                      <Link
                        href={event.path}
                        className="inline-flex items-center gap-1 rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]"
                      >
                        Open
                        <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Regional Commerce Routing</h2>
            </div>
            <ScreenInfoTip content={SCREEN_HELP.adminRegional} />
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            NAMA should not price, bill, or collect the same way everywhere. This section models the market-aware subscription and payment logic you asked for.
          </p>
          <div className="space-y-3">
            {REGIONAL_COMMERCE.map((region) => (
              <button
                key={region.market}
                type="button"
                onClick={() => setSelectedMarket(region)}
                className={`w-full rounded-2xl border bg-[#0A0A0A] p-4 text-left transition-colors ${
                  selectedMarket.market === region.market ? "border-[#C9A84C]/30" : "border-[#C9A84C]/10 hover:border-[#C9A84C]/20"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{region.market}</div>
                    <div className="mt-1 text-xs leading-relaxed text-[#B8B0A0]">{region.note}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:justify-start lg:justify-end">
                    <Chip icon={<BadgeIndianRupee size={10} />} text={`Base ${region.baseCurrency}`} />
                    <Chip icon={<Sparkles size={10} />} text={`Extras ${region.extraCurrencies}`} />
                    <Chip icon={<Languages size={10} />} text={region.language} />
                    <Chip icon={<Landmark size={10} />} text={region.gateway} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Globe2 size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Localization & FX Controls</h2>
            </div>
            <ScreenInfoTip content={SCREEN_HELP.adminFx} />
          </div>
          <div className="space-y-3">
            {LOCALIZATION_RULES.map((rule) => (
              <div key={rule} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 text-sm leading-relaxed text-[#B8B0A0]">
                {rule}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoTile
              title="Pricing override"
              detail="You can set plan price by region so India, UAE, Europe, and US do not all inherit the same subscription number."
              icon={<BadgeIndianRupee size={14} />}
            />
            <InfoTile
              title="Gateway routing"
              detail="Choose Razorpay for INR-first markets and Stripe for cross-border or enterprise billing flows."
              icon={<Landmark size={14} />}
            />
            <InfoTile
              title="Language default"
              detail="Start from browser locale, then let the tenant admin lock a preferred operating language."
              icon={<Languages size={14} />}
            />
            <InfoTile
              title="Fallback logic"
              detail="If a gateway or currency is unavailable in a market, route to the next approved pair instead of breaking checkout."
              icon={<Sparkles size={14} />}
            />
            <InfoTile
              title="FX control"
              detail="Use live conversion API rates by default, add a safety buffer if desired, or let the tenant manually lock a custom rate."
              icon={<Globe size={14} />}
            />
          </div>
          <div className="mt-5 rounded-3xl border border-[#C9A84C]/15 bg-[#0A0A0A] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Globe size={14} className="text-[#C9A84C]" />
              <h3 className="text-sm font-black text-[#F5F0E8]">FX Rate Stack</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {FX_CONTROL_STACK.map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{item.title}</div>
                  <div className="mt-1 text-base font-black text-[#F5F0E8]">{item.value}</div>
                  <div className="mt-2 text-xs leading-relaxed text-[#B8B0A0]">{item.detail}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4">
              <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Base currency model</div>
              <div className="text-sm leading-relaxed text-[#B8B0A0]">{BASE_CURRENCY_MODEL.note}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip icon={<BadgeIndianRupee size={10} />} text={`Base ${BASE_CURRENCY_MODEL.base}`} />
                {BASE_CURRENCY_MODEL.enabled.map((currency) => (
                  <Chip key={currency} icon={<Sparkles size={10} />} text={currency} />
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-[#C9A84C]" />
                <h3 className="text-sm font-black text-[#F5F0E8]">Subscription Pricing Simulator</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E] mb-2">Plan</div>
                  <div className="flex flex-wrap gap-2">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <button
                        key={plan.name}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                          selectedPlan.name === plan.name
                            ? "bg-[#C9A84C] text-[#0A0A0A]"
                            : "bg-[#0A0A0A] text-[#B8B0A0] border border-[#C9A84C]/10"
                        }`}
                      >
                        {plan.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E] mb-2">Switches</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setBufferEnabled((value) => !value)}
                      className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                        bufferEnabled ? "bg-[#C9A84C] text-[#0A0A0A]" : "bg-[#0A0A0A] text-[#B8B0A0] border border-[#C9A84C]/10"
                      }`}
                    >
                      FX Buffer
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualRateEnabled((value) => !value)}
                      className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                        manualRateEnabled ? "bg-[#C9A84C] text-[#0A0A0A]" : "bg-[#0A0A0A] text-[#B8B0A0] border border-[#C9A84C]/10"
                      }`}
                    >
                      Manual Rate Lock
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Selected market</div>
                  <div className="mt-1 text-sm font-semibold text-[#F5F0E8]">{selectedMarket.market}</div>
                  <div className="mt-1 text-[10px] text-[#B8B0A0]">{selectedMarket.language} · {selectedMarket.gateway}</div>
                </div>
                <div className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Projected plan price</div>
                  <div className="mt-1 text-sm font-semibold text-[#F5F0E8]">{simulatedPlanPrice}</div>
                  <div className="mt-1 text-[10px] text-[#B8B0A0]">
                    {selectedPlan.name} · {manualRateEnabled ? "Manual override engaged" : "Live FX stack"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-[#C9A84C]" />
              <h2 className="text-lg font-black text-[#F5F0E8]">Subscription Plans</h2>
            </div>
            <ScreenInfoTip content={SCREEN_HELP.adminPlans} />
          </div>
          <div className="space-y-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.name} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{plan.name}</div>
                    <div className="mt-1 text-xs leading-relaxed text-[#B8B0A0]">{plan.note}</div>
                  </div>
                  <div className="text-sm font-black text-[#C9A84C]">{plan.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <LayoutTemplate size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Rules, Templates & Trust</h2>
          </div>
          <div className="space-y-3">
            {RULES.map((rule) => (
              <div key={rule.title} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{rule.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-[#B8B0A0]">{rule.description}</div>
                  </div>
                  <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                    {rule.scope}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoTile
              title="Template inheritance"
              detail="Customer admins inherit your master templates first, then override locally if needed."
              icon={<LayoutTemplate size={14} />}
            />
            <InfoTile
              title="Platform locks"
              detail="Critical rules like compliance footers and margin thresholds stay protected at the NAMA level."
              icon={<Lock size={14} />}
            />
            <InfoTile
              title="Global visibility"
              detail="You can see tenant readiness, route health, subscription state, and preview system status in one place."
              icon={<Globe2 size={14} />}
            />
            <InfoTile
              title="Controlled rollout"
              detail="New modules, rules, and templates can be staged tenant-by-tenant before wider release."
              icon={<Sparkles size={14} />}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Users size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Current Tenant Runtime</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile title="Tenant" detail={`${currentTenantName} · ${currentPlan}`} icon={<Building2 size={14} />} />
            <InfoTile title="Workspace Admin" detail={profile.operator || DEFAULT_DEMO_PROFILE.operator} icon={<Shield size={14} />} />
            <InfoTile title="Employees" detail={`${workflow.employees.length} in directory`} icon={<Users size={14} />} />
            <InfoTile title="Logged In Now" detail={`${activeUsers} active users in the demo snapshot`} icon={<CheckCircle2 size={14} />} />
            <InfoTile title="Pending Invites" detail={`${pendingInvites} waiting for acceptance`} icon={<CreditCard size={14} />} />
            <InfoTile title="Accepted Invites" detail={`${acceptedInvites} joined users`} icon={<Sparkles size={14} />} />
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Waypoints size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Golden Path Status</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile title="Won Cases" detail={`${wonCases} cases reached post-sale state`} icon={<CheckCircle2 size={14} />} />
            <InfoTile title="Settled Invoices" detail={`${settledInvoices} invoices marked paid`} icon={<BadgeIndianRupee size={14} />} />
            <InfoTile title="Released Artifacts" detail={`${releasedArtifacts} guest packs/shared traveler PDFs`} icon={<LayoutTemplate size={14} />} />
            <InfoTile title="System Note" detail={pendingInvites > 0 ? "Invite acceptance still in progress for this tenant." : "Tenant flow is moving cleanly through invite and artifact states."} icon={<AlertTriangle size={14} />} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#C9A84C]" />
          <h2 className="text-lg font-black text-[#F5F0E8]">How to position this in the preview</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">What this proves</div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">
              NAMA is not only an operator workspace for agencies. It is also a platform control layer for you as Super Admin,
              with visibility into subscriptions, platform rules, tenant health, global templates, and geo-aware commerce controls.
            </p>
          </div>
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">Safe wording</div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">
              Say “platform control tower” and “preview-safe Super Admin surface.” Do not imply that live billing, provisioning,
              or provider controls are fully automated today unless they really are.
            </p>
          </div>
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">FX explanation</div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">
              Explain that NAMA uses one base currency for reporting and subscriptions, can sell in additional currencies, and can either take live rates from the converter API, add a buffer, or lock a manual rate if the business wants control.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
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

function AuditSummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
      {icon}
      {text}
    </span>
  );
}

function InfoTile({ title, detail, icon }: { title: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
      <div className="mb-2 flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <p className="text-sm leading-relaxed text-[#B8B0A0]">{detail}</p>
    </div>
  );
}
