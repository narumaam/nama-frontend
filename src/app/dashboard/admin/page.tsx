"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Globe,
  Globe2,
  LayoutTemplate,
  Lock,
  Languages,
  Landmark,
  Shield,
  Sparkles,
  Waypoints,
} from "lucide-react";

const TENANT_HEALTH = [
  {
    name: "Nair Luxury Escapes",
    tier: "Growth",
    users: 14,
    status: "Healthy",
    renewal: "12 Apr 2026",
    mrr: "₹49,000",
  },
  {
    name: "Velocity Corporate Travel",
    tier: "Enterprise",
    users: 22,
    status: "Attention",
    renewal: "18 Apr 2026",
    mrr: "₹1,25,000",
  },
  {
    name: "BluePalm Holidays",
    tier: "Starter",
    users: 8,
    status: "Healthy",
    renewal: "09 Apr 2026",
    mrr: "₹24,000",
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

const REGIONAL_COMMERCE = [
  {
    market: "India",
    language: "English + Hindi",
    baseCurrency: "INR",
    extraCurrencies: "AED, USD, EUR",
    billingCurrency: "INR",
    gateway: "Razorpay",
    note: "Use GST-aware invoicing, INR subscription pricing, and domestic payment flow for Indian agencies.",
  },
  {
    market: "UAE / Middle East",
    language: "English + Arabic",
    baseCurrency: "AED",
    extraCurrencies: "INR, USD, EUR",
    billingCurrency: "AED",
    gateway: "Stripe",
    note: "Present AED pricing, Arabic-ready customer copy, and a cross-border payment rail for faster checkout.",
  },
  {
    market: "Europe",
    language: "English + regional fallback",
    baseCurrency: "EUR",
    extraCurrencies: "USD, GBP, INR",
    billingCurrency: "EUR",
    gateway: "Stripe",
    note: "Show EUR plans, VAT-aware billing, and region-appropriate policy wording.",
  },
  {
    market: "US / Global",
    language: "English",
    baseCurrency: "USD",
    extraCurrencies: "EUR, GBP, INR",
    billingCurrency: "USD",
    gateway: "Stripe",
    note: "Use USD-led subscription pricing with global card routing and standard enterprise billing.",
  },
];

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
  base: "INR",
  enabled: ["AED", "USD", "EUR", "GBP"],
  note: "One accounting currency powers reporting and billing, while additional selling currencies stay available for quotes and checkout.",
};

const LOCALIZATION_RULES = [
  "Detect billing country at tenant onboarding and default the subscription currency from that market.",
  "Use browser locale as a hint, but allow the tenant admin to lock language and currency manually.",
  "Switch payment gateway by region and availability instead of forcing one gateway globally.",
  "Pull exchange rates from the FX provider by default, then allow a buffer percentage or a manual locked rate when the business wants tighter control.",
  "Keep Super Admin override controls for plan pricing, tax labels, gateway routing, and fallback currencies.",
];

export default function AdminPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Super Admin</span>
            <ChevronRight size={10} />
            <span className="opacity-50">NAMA Control Tower</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#F5F0E8] font-headline">Platform Control</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            This is your NAMA-level governance workspace: subscriptions, platform rules, tenant status, template inheritance,
            and the commercial health of the system. It is staged as a demo-safe Super Admin surface, but it reflects the
            exact operating questions a platform owner asks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/team"
            className="rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10"
          >
            Team appendix
          </Link>
          <button className="rounded-xl bg-[#C9A84C] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_20px_rgba(201,168,76,0.2)] transition-all hover:scale-105 active:scale-95">
            Create subscription
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Tenants" value="03" sub="Growth-stage demo customers" icon={<Building2 size={16} />} />
        <MetricCard label="MRR Snapshot" value="₹1.98L" sub="Across Starter, Growth, Enterprise" icon={<BadgeIndianRupee size={16} />} />
        <MetricCard label="Platform Health" value="Healthy" sub="Frontend, backend, and demo APIs verified" icon={<CheckCircle2 size={16} />} />
        <MetricCard label="Global Rules" value="12" sub="Across comms, pricing, and ops policies" icon={<Waypoints size={16} />} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <Building2 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Tenant & Subscription Health</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            This view gives you a platform-owner perspective: who is live, who is growing, who needs attention, and what commercial tier they sit on.
          </p>
          <div className="space-y-3">
            {TENANT_HEALTH.map((tenant) => (
              <div key={tenant.name} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{tenant.name}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">
                      {tenant.tier} · {tenant.users} seats · Renewal {tenant.renewal}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                      {tenant.mrr}
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

        <aside className="xl:col-span-5 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
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

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <Globe size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Regional Commerce Routing</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            NAMA should not price, bill, or collect the same way everywhere. This section models the market-aware subscription and payment logic you asked for.
          </p>
          <div className="space-y-3">
            {REGIONAL_COMMERCE.map((region) => (
              <div key={region.market} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{region.market}</div>
                    <div className="mt-1 text-xs leading-relaxed text-[#B8B0A0]">{region.note}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Chip icon={<BadgeIndianRupee size={10} />} text={`Base ${region.baseCurrency}`} />
                    <Chip icon={<Sparkles size={10} />} text={`Extras ${region.extraCurrencies}`} />
                    <Chip icon={<Languages size={10} />} text={region.language} />
                    <Chip icon={<Landmark size={10} />} text={region.gateway} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <Globe2 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Localization & FX Controls</h2>
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
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <CreditCard size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Subscription Plans</h2>
          </div>
          <div className="space-y-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.name} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between gap-3">
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

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
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
              detail="You can see tenant readiness, route health, subscription state, and demo system status in one place."
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

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#C9A84C]" />
          <h2 className="text-lg font-black text-[#F5F0E8]">How to position this in the demo</h2>
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
              Say “platform control tower” and “demo-safe Super Admin surface.” Do not imply that live billing, provisioning,
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
