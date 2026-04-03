"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScreenInfoTip from "@/components/screen-info-tip";
import { BUSINESS_ROLES, MARKET_PRESETS, SUPPORTED_CURRENCIES, type BusinessRole, type SupportedCurrency } from "@/lib/demo-config";
import { DEFAULT_DEMO_PROFILE, writeDemoProfile } from "@/lib/demo-profile";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Languages,
  Landmark,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

const ONBOARDING_STEPS = [
  "Identify the business model: travel agency, DMC, tour operator, or a hybrid of all three.",
  "Default market controls: base currency, additional selling currencies, language, and billing gateway based on operating country.",
  "Set up team structure, nomenclature, roles, designations, and reporting lines.",
  "Enter the workspace with preview data while keeping live credentials for later connection.",
];

const PLAN_PRESETS = [
  {
    name: "Starter",
    note: "For smaller teams validating NAMA across leads, deals, and execution.",
    modules: "CRM, deals, bookings",
  },
  {
    name: "Growth",
    note: "For agencies and DMCs that need multi-team coordination and richer operating controls.",
    modules: "CRM, DMC, team, admin",
  },
  {
    name: "Enterprise",
    note: "For multi-market operators that want governance, hierarchy, and platform-level control.",
    modules: "Hierarchy, advanced governance, regional controls",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [businessRoles, setBusinessRoles] = useState<BusinessRole[]>(DEFAULT_DEMO_PROFILE.roles as BusinessRole[]);
  const [selectedMarket, setSelectedMarket] = useState(MARKET_PRESETS[0]);
  const [enabledCurrencies, setEnabledCurrencies] = useState<SupportedCurrency[]>(
    DEFAULT_DEMO_PROFILE.enabledCurrencies as SupportedCurrency[]
  );
  const [selectedPlan, setSelectedPlan] = useState(PLAN_PRESETS[1]);
  const [showConfetti, setShowConfetti] = useState(false);

  const profileLabel = useMemo(() => {
    if (businessRoles.length === 0) return "Travel business";
    if (businessRoles.length === 1) return businessRoles[0];
    return businessRoles.join(" + ");
  }, [businessRoles]);

  function toggleRole(role: BusinessRole) {
    setBusinessRoles((current) => {
      if (current.includes(role)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== role);
      }
      return [...current, role];
    });
  }

  function enterDemoWorkspace() {
    setShowConfetti(true);
    writeDemoProfile({
      company: companyName.trim() || DEFAULT_DEMO_PROFILE.company,
      operator: operatorName.trim() || DEFAULT_DEMO_PROFILE.operator,
      roles: businessRoles,
      market: selectedMarket,
      baseCurrency: selectedMarket.currency,
      enabledCurrencies,
    });
    window.setTimeout(() => {
      router.push("/dashboard");
    }, 900);
  }

  function toggleCurrency(currency: SupportedCurrency) {
    if (currency === selectedMarket.currency) return;
    setEnabledCurrencies((current) =>
      current.includes(currency) ? current.filter((item) => item !== currency) : [...current, currency]
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-6 py-10 font-body text-[#0F172A]">
      {showConfetti && <ConfettiBurst />}
      <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] border border-[#C9A84C]/20 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] xl:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-2xl font-black text-white shadow-lg shadow-[#0F172A]/20">
              N
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9A84C]">Alpha Preview</div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-[#0F172A] xl:text-4xl">Workspace Onboarding</h1>
                <ScreenInfoTip content={SCREEN_HELP.register} />
              </div>
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 xl:text-[15px]">
            This is the onboarding layer for the alpha preview. It shows how a business enters NAMA before live credentials, subscriptions, or provider keys are connected:
            company profile, business type, market defaults, and operating structure.
          </p>

          <form
            className="mt-8 space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              enterDemoWorkspace();
            }}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <Field
                label="Company Name"
                value={companyName}
                onChange={setCompanyName}
                placeholder="e.g. Maldives Premier Journeys"
              />
              <Field
                label="Workspace Operator"
                value={operatorName}
                onChange={setOperatorName}
                placeholder="e.g. Narayan Mallapur"
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-[#C9A84C]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">Business Profile</span>
                </div>
                <ScreenInfoTip content={SCREEN_HELP.registerBusiness} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {BUSINESS_ROLES.map((role) => {
                  const active = businessRoles.includes(role);
                  return (
                    <button
                      type="button"
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        active
                          ? "border-[#C9A84C]/40 bg-[#C9A84C]/10"
                          : "border-slate-200 bg-slate-50 hover:border-[#C9A84C]/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-[#0F172A]">{role}</div>
                        {active && <CheckCircle2 size={16} className="text-[#1D9E75]" />}
                      </div>
                      <div className="mt-2 text-xs leading-relaxed text-slate-500">
                        {role === "Travel Agency" && "Lead intake, quotes, and customer relationship execution."}
                        {role === "DMC" && "Contracts, supplier ops, and destination-side fulfilment workflow."}
                        {role === "Tour Operator" && "Package logic, departures, and commercial inventory control."}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe2 size={15} className="text-[#C9A84C]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">Market Defaults</span>
                </div>
                <ScreenInfoTip content={SCREEN_HELP.registerMarket} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {MARKET_PRESETS.map((market) => {
                  const active = market.country === selectedMarket.country;
                  return (
                    <button
                      type="button"
                      key={market.country}
                      onClick={() => setSelectedMarket(market)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        active
                          ? "border-[#C9A84C]/40 bg-[#C9A84C]/10"
                          : "border-slate-200 bg-slate-50 hover:border-[#C9A84C]/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-[#0F172A]">{market.country}</div>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {market.currency}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <div>Language: {market.language}</div>
                        <div>Gateway: {market.gateway}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Landmark size={15} className="text-[#C9A84C]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">Currency Model</span>
                </div>
                <ScreenInfoTip content={SCREEN_HELP.registerCurrency} />
              </div>
              <div className="rounded-3xl border border-[#C9A84C]/15 bg-slate-50 p-5">
                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Base Currency</div>
                    <div className="mt-2 text-2xl font-black text-[#0F172A]">{selectedMarket.currency}</div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-500">
                      This is the accounting and billing anchor for the tenant, driven by primary operating market.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Additional Selling Currencies</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {SUPPORTED_CURRENCIES.map((currency) => {
                        const base = currency === selectedMarket.currency;
                        const active = enabledCurrencies.includes(currency) || base;
                        return (
                          <button
                            type="button"
                            key={currency}
                            disabled={base}
                            onClick={() => toggleCurrency(currency)}
                            className={`rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                              active
                                ? "border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#0F172A]"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-[#C9A84C]/25"
                            } ${base ? "cursor-default" : ""}`}
                          >
                            {currency} {base ? "· Base" : ""}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-sm leading-relaxed text-slate-500">
                      The business can sell in more than one currency, but still keep one base operating currency for controls, reporting, and subscriptions.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#C9A84C]/15 bg-slate-50 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-[#C9A84C]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">Workspace Preview</span>
                </div>
                <ScreenInfoTip content={SCREEN_HELP.registerPreview} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <PreviewRow label="Business Profile" value={profileLabel} />
                <PreviewRow label="Base Currency" value={selectedMarket.currency} />
                <PreviewRow label="Additional Currencies" value={enabledCurrencies.filter((item) => item !== selectedMarket.currency).join(", ") || "None"} />
                <PreviewRow label="Default Language" value={selectedMarket.language} />
                <PreviewRow label="Payment Rail" value={selectedMarket.gateway} />
                <PreviewRow label="Recommended Plan" value={selectedPlan.name} />
              </div>
            </div>

            <div className="rounded-3xl border border-[#C9A84C]/15 bg-slate-50 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Shield size={15} className="text-[#C9A84C]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">Plan Fit</span>
                </div>
                <ScreenInfoTip content={SCREEN_HELP.registerPlan} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {PLAN_PRESETS.map((plan) => {
                  const active = selectedPlan.name === plan.name;
                  return (
                    <button
                      type="button"
                      key={plan.name}
                      onClick={() => setSelectedPlan(plan)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        active
                          ? "border-[#C9A84C]/40 bg-[#C9A84C]/10"
                          : "border-slate-200 bg-white hover:border-[#C9A84C]/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-black text-[#0F172A]">{plan.name}</div>
                        {active && <CheckCircle2 size={16} className="text-[#1D9E75]" />}
                      </div>
                      <div className="mt-2 text-xs leading-relaxed text-slate-500">{plan.note}</div>
                      <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{plan.modules}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0F172A] px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-[#0F172A]/10 transition-all hover:bg-slate-800"
              >
                Enter Demo Workspace
                <ArrowRight size={14} />
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:border-[#C9A84C]/30 hover:text-[#0F172A]"
              >
                Back to homepage
              </Link>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[36px] border border-[#C9A84C]/20 bg-[#0F172A] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.14)]">
            <div className="mb-4 flex items-center gap-2 text-[#C9A84C]">
              <Shield size={15} />
              <span className="text-[11px] font-black uppercase tracking-[0.24em]">What onboarding proves</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">NAMA does not start with a payment form.</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              It starts with operating identity: who the business is, which roles it plays, which market it serves, and how the workspace should behave by default.
            </p>
            <div className="mt-6 space-y-3">
              {ONBOARDING_STEPS.map((step) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-slate-200">
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-[#C9A84C]/20 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
            <div className="mb-4 flex items-center gap-2 text-[#C9A84C]">
              <Users size={15} />
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">Alpha Talk Track</span>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                “Before subscriptions and credentials, NAMA onboards the business itself: what kind of operator it is, where it operates, which currency and language it defaults to, and how the workspace should behave.”
              </p>
              <p>
                “Every tenant has one base currency for control and reporting, and can enable more selling currencies on top depending on the markets it serves.”
              </p>
              <p>
                “One company can be a travel agency, DMC, and tour operator at the same time. This onboarding flow reflects that instead of forcing a single identity.”
              </p>
              <p>
                “After this, the customer admin configures team structure, nomenclature, invites, hierarchy, and market-aware controls inside the platform.”
              </p>
              <p>
                “The plan recommendation is just a guided fit signal for the alpha. It helps the buyer understand which operating model they’re stepping into before full billing is connected.”
              </p>
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-[#C9A84C]">
                <Languages size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.24em]">Preview-safe note</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                This screen is intentionally preview-safe. It proves the onboarding model without claiming live billing, live SSO, or live provider credentials.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-[#0F172A] outline-none transition-all focus:border-[#14B8A6] focus:bg-white focus:ring-4 focus:ring-[#14B8A6]/10"
      />
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-[#0F172A]">{value}</div>
    </div>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 22 }, (_, index) => ({
    id: index,
    left: `${4 + (index * 4.2) % 92}%`,
    delay: `${(index % 6) * 0.08}s`,
    duration: `${2.2 + (index % 5) * 0.18}s`,
    color: ["#C9A84C", "#14B8A6", "#0F172A", "#F97316"][index % 4],
    rotate: `${(index % 7) * 17}deg`,
  }));

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
        {pieces.map((piece) => (
          <span
            key={piece.id}
            className="absolute top-[-8%] h-4 w-2 rounded-full animate-[nama-confetti-fall_var(--duration)_ease-in_forwards]"
            style={{
              left: piece.left,
              backgroundColor: piece.color,
              animationDelay: piece.delay,
              ["--duration" as string]: piece.duration,
              transform: `rotate(${piece.rotate})`,
            }}
          />
        ))}
        <div className="absolute inset-x-0 top-16 flex justify-center">
          <div className="rounded-full border border-[#C9A84C]/20 bg-white/90 px-5 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#0F172A] shadow-xl">
            Workspace created
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes nama-confetti-fall {
          0% {
            transform: translate3d(0, -12vh, 0) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 110vh, 0) rotate(540deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
