import { DEMO_PROFILE_STORAGE_KEYS } from "@/lib/demo-config";
import { type DemoBrandTheme } from "@/lib/demo-profile";

export type DemoSubscriptionPlan = "Starter" | "Growth" | "Enterprise";

export type DemoTenantRecord = {
  id: string;
  company: string;
  market: string;
  plan: DemoSubscriptionPlan;
  workspaceDomain: string;
  supportEmail: string;
  createdAt: string;
  renewalDate: string;
};

export const DEMO_PLAN_PRICES: Record<DemoSubscriptionPlan, number> = {
  Starter: 24000,
  Growth: 49000,
  Enterprise: 125000,
};

function readJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function nowLabel() {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function nextRenewalLabel() {
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  return nextMonth.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function readDemoSubscriptionPlan(): DemoSubscriptionPlan {
  if (typeof window === "undefined") return "Growth";
  const value = window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.subscriptionPlan);
  return value === "Starter" || value === "Growth" || value === "Enterprise" ? value : "Growth";
}

export function writeDemoSubscriptionPlan(plan: DemoSubscriptionPlan) {
  if (typeof window === "undefined") return plan;
  window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.subscriptionPlan, plan);
  return plan;
}

export function readDemoTenantRegistry(): DemoTenantRecord[] {
  if (typeof window === "undefined") return [];
  return readJson<DemoTenantRecord[]>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.tenantRegistry), []);
}

export function upsertDemoTenantRegistration(input: {
  company: string;
  market: string;
  plan: DemoSubscriptionPlan;
  brandTheme: DemoBrandTheme;
}) {
  if (typeof window === "undefined") return [];

  const current = readDemoTenantRegistry();
  const normalizedCompany = input.company.trim();
  const nextRecord: DemoTenantRecord = {
    id: normalizedCompany.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    company: normalizedCompany,
    market: input.market,
    plan: input.plan,
    workspaceDomain: input.brandTheme.customDomain,
    supportEmail: input.brandTheme.supportEmail,
    createdAt: nowLabel(),
    renewalDate: nextRenewalLabel(),
  };

  const nextRegistry = current.some((tenant) => tenant.id === nextRecord.id)
    ? current.map((tenant) => (tenant.id === nextRecord.id ? { ...tenant, ...nextRecord } : tenant))
    : [nextRecord, ...current];

  window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.tenantRegistry, JSON.stringify(nextRegistry));
  return nextRegistry;
}
