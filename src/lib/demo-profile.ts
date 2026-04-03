import { DEMO_PROFILE_STORAGE_KEYS, MARKET_PRESETS } from "@/lib/demo-config";

export type DemoMarket = {
  country: string;
  currency: string;
  language: string;
  gateway: string;
};

export type DemoProfile = {
  company: string;
  operator: string;
  subscriptionPlan: "Starter" | "Growth" | "Enterprise";
  roles: string[];
  market: DemoMarket;
  baseCurrency: string;
  enabledCurrencies: string[];
  bankDetails: {
    beneficiaryName: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
    accountType: string;
    routingCode: string;
    billingAddress: string;
  };
  whiteLabel: {
    enabled: boolean;
    workspaceName: string;
    badgeGlyph: string;
    supportEmail: string;
    customDomain: string;
    accentHex: string;
  };
};

export type DemoBrandTheme = {
  enabled: boolean;
  workspaceName: string;
  badgeGlyph: string;
  supportEmail: string;
  customDomain: string;
  accentHex: string;
};

const DEFAULT_MARKET: DemoMarket = MARKET_PRESETS[0];

export const DEFAULT_DEMO_PROFILE: DemoProfile = {
  company: "Nair Luxury Escapes",
  operator: "Workspace Admin",
  subscriptionPlan: "Growth",
  roles: ["Travel Agency", "DMC"],
  market: DEFAULT_MARKET,
  baseCurrency: DEFAULT_MARKET.currency,
  enabledCurrencies: ["INR", "AED", "USD"],
  bankDetails: {
    beneficiaryName: "Nair Luxury Escapes Pvt Ltd",
    bankName: "HDFC Bank",
    branchName: "MG Road, Bengaluru",
    accountNumber: "50200012345678",
    accountType: "Current Account",
    routingCode: "HDFC0000456 / HDFCINBBXXX",
    billingAddress: "22 Residency Road, Bengaluru 560025, Karnataka, India",
  },
  whiteLabel: {
    enabled: false,
    workspaceName: "NAMA OS",
    badgeGlyph: "N",
    supportEmail: "support@nama.ai",
    customDomain: "preview.nama.ai",
    accentHex: "#C9A84C",
  },
};

function readJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function sanitizeEnabledCurrencies(baseCurrency: string, enabledCurrencies: string[]): string[] {
  return Array.from(new Set([baseCurrency, ...enabledCurrencies]));
}

function normalizeDemoProfile(input: Partial<DemoProfile>): DemoProfile {
  const market = input.market ?? DEFAULT_DEMO_PROFILE.market;
  const baseCurrency = input.baseCurrency || market.currency || DEFAULT_DEMO_PROFILE.baseCurrency;
  const enabledCurrencies = sanitizeEnabledCurrencies(baseCurrency, input.enabledCurrencies ?? DEFAULT_DEMO_PROFILE.enabledCurrencies);
  const bankDetailsInput = input.bankDetails ?? DEFAULT_DEMO_PROFILE.bankDetails;
  const whiteLabelInput = input.whiteLabel ?? DEFAULT_DEMO_PROFILE.whiteLabel;
  const workspaceName = whiteLabelInput.workspaceName?.trim() || DEFAULT_DEMO_PROFILE.whiteLabel.workspaceName;
  const badgeGlyph = (whiteLabelInput.badgeGlyph?.trim() || workspaceName[0] || DEFAULT_DEMO_PROFILE.whiteLabel.badgeGlyph).slice(0, 2).toUpperCase();

  return {
    company: input.company?.trim() || DEFAULT_DEMO_PROFILE.company,
    operator: input.operator?.trim() || DEFAULT_DEMO_PROFILE.operator,
    subscriptionPlan: input.subscriptionPlan || DEFAULT_DEMO_PROFILE.subscriptionPlan,
    roles: input.roles?.length ? input.roles : DEFAULT_DEMO_PROFILE.roles,
    market,
    baseCurrency,
    enabledCurrencies,
    bankDetails: {
      beneficiaryName: bankDetailsInput.beneficiaryName?.trim() || DEFAULT_DEMO_PROFILE.bankDetails.beneficiaryName,
      bankName: bankDetailsInput.bankName?.trim() || DEFAULT_DEMO_PROFILE.bankDetails.bankName,
      branchName: bankDetailsInput.branchName?.trim() || DEFAULT_DEMO_PROFILE.bankDetails.branchName,
      accountNumber: bankDetailsInput.accountNumber?.trim() || DEFAULT_DEMO_PROFILE.bankDetails.accountNumber,
      accountType: bankDetailsInput.accountType?.trim() || DEFAULT_DEMO_PROFILE.bankDetails.accountType,
      routingCode: bankDetailsInput.routingCode?.trim() || DEFAULT_DEMO_PROFILE.bankDetails.routingCode,
      billingAddress: bankDetailsInput.billingAddress?.trim() || DEFAULT_DEMO_PROFILE.bankDetails.billingAddress,
    },
    whiteLabel: {
      enabled: Boolean(whiteLabelInput.enabled),
      workspaceName,
      badgeGlyph,
      supportEmail: whiteLabelInput.supportEmail?.trim() || DEFAULT_DEMO_PROFILE.whiteLabel.supportEmail,
      customDomain: whiteLabelInput.customDomain?.trim() || DEFAULT_DEMO_PROFILE.whiteLabel.customDomain,
      accentHex: whiteLabelInput.accentHex?.trim() || DEFAULT_DEMO_PROFILE.whiteLabel.accentHex,
    },
  };
}

export function readDemoProfile(): DemoProfile {
  if (typeof window === "undefined") return DEFAULT_DEMO_PROFILE;

  return normalizeDemoProfile({
    company: window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.company) || DEFAULT_DEMO_PROFILE.company,
    operator: window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.operator) || DEFAULT_DEMO_PROFILE.operator,
    subscriptionPlan: (window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.subscriptionPlan) as DemoProfile["subscriptionPlan"]) || DEFAULT_DEMO_PROFILE.subscriptionPlan,
    roles: readJson<string[]>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.roles), DEFAULT_DEMO_PROFILE.roles),
    market: readJson<DemoMarket>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.market), DEFAULT_DEMO_PROFILE.market),
    baseCurrency: window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.baseCurrency) || undefined,
    enabledCurrencies: readJson<string[]>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.enabledCurrencies), DEFAULT_DEMO_PROFILE.enabledCurrencies),
    bankDetails: readJson<DemoProfile["bankDetails"]>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.bankDetails), DEFAULT_DEMO_PROFILE.bankDetails),
    whiteLabel: readJson<DemoProfile["whiteLabel"]>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.whiteLabel), DEFAULT_DEMO_PROFILE.whiteLabel),
  });
}

export function writeDemoProfile(input: Partial<DemoProfile>): DemoProfile {
  const nextProfile = normalizeDemoProfile({
    ...readDemoProfile(),
    ...input,
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.company, nextProfile.company);
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.operator, nextProfile.operator);
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.subscriptionPlan, nextProfile.subscriptionPlan);
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.roles, JSON.stringify(nextProfile.roles));
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.market, JSON.stringify(nextProfile.market));
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.baseCurrency, nextProfile.baseCurrency);
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.enabledCurrencies, JSON.stringify(nextProfile.enabledCurrencies));
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.bankDetails, JSON.stringify(nextProfile.bankDetails));
    window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.whiteLabel, JSON.stringify(nextProfile.whiteLabel));
    window.dispatchEvent(new CustomEvent("nama-demo-profile-updated", { detail: nextProfile }));
  }

  return nextProfile;
}

export function useDemoProfileSnapshot(): DemoProfile {
  return readDemoProfile();
}

export function getDemoBrandTheme(profile: DemoProfile): DemoBrandTheme {
  const fallback = DEFAULT_DEMO_PROFILE.whiteLabel;
  const accentHex = /^#[0-9a-fA-F]{6}$/.test(profile.whiteLabel.accentHex)
    ? profile.whiteLabel.accentHex
    : fallback.accentHex;

  return {
    enabled: profile.whiteLabel.enabled,
    workspaceName: profile.whiteLabel.workspaceName || fallback.workspaceName,
    badgeGlyph: profile.whiteLabel.badgeGlyph || fallback.badgeGlyph,
    supportEmail: profile.whiteLabel.supportEmail || fallback.supportEmail,
    customDomain: profile.whiteLabel.customDomain || fallback.customDomain,
    accentHex,
  };
}

export function getDemoWorkspaceDomain(theme: DemoBrandTheme): string {
  const rawDomain = theme.customDomain.trim().toLowerCase();
  if (!rawDomain) return DEFAULT_DEMO_PROFILE.whiteLabel.customDomain;
  return rawDomain.includes(".") ? rawDomain : `${rawDomain}.nama.ai`;
}

export function getDemoDomainMode(theme: DemoBrandTheme): "nama-subdomain" | "custom-domain" {
  const rawDomain = theme.customDomain.trim().toLowerCase();
  if (!rawDomain) return "nama-subdomain";
  return rawDomain.includes(".") ? "custom-domain" : "nama-subdomain";
}
