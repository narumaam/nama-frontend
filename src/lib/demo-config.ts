import type { DemoMarket } from "@/lib/demo-profile";

export type BusinessRole = "Travel Agency" | "DMC" | "Tour Operator";
export type DemoPlan = "Starter" | "Growth" | "Enterprise";

export const BUSINESS_ROLES: BusinessRole[] = ["Travel Agency", "DMC", "Tour Operator"];

export const SUPPORTED_CURRENCIES = ["INR", "AED", "USD", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const MARKET_PRESETS: DemoMarket[] = [
  { country: "India", currency: "INR", language: "English + Hindi", gateway: "Razorpay" },
  { country: "UAE", currency: "AED", language: "English + Arabic", gateway: "Stripe" },
  { country: "Europe", currency: "EUR", language: "English + regional fallback", gateway: "Stripe" },
  { country: "United States", currency: "USD", language: "English", gateway: "Stripe" },
];

export const DEMO_PROFILE_STORAGE_KEYS = {
  company: "nama-demo-company",
  operator: "nama-demo-operator",
  subscriptionPlan: "nama-demo-subscription-plan",
  roles: "nama-demo-business-roles",
  market: "nama-demo-market",
  baseCurrency: "nama-demo-base-currency",
  enabledCurrencies: "nama-demo-enabled-currencies",
  bankDetails: "nama-demo-bank-details",
  whiteLabel: "nama-demo-white-label",
  employees: "nama-demo-employees",
  invites: "nama-demo-invites",
  workflowCases: "nama-demo-workflow-cases",
  tenantRegistry: "nama-demo-tenant-registry",
} as const;

export const DEFAULT_SHELL_BRAND = {
  shortName: "NAMA OS",
  badgeGlyph: "N",
};

export function findMarketPreset(country: string): DemoMarket | undefined {
  return MARKET_PRESETS.find((item) => item.country === country);
}
