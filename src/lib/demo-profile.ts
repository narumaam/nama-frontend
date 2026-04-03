export type DemoMarket = {
  country: string;
  currency: string;
  language: string;
  gateway: string;
};

export type DemoProfile = {
  company: string;
  operator: string;
  roles: string[];
  market: DemoMarket;
  baseCurrency: string;
  enabledCurrencies: string[];
};

const DEFAULT_MARKET: DemoMarket = {
  country: "India",
  currency: "INR",
  language: "English + Hindi",
  gateway: "Razorpay",
};

export const DEFAULT_DEMO_PROFILE: DemoProfile = {
  company: "Nair Luxury Escapes",
  operator: "Workspace Admin",
  roles: ["Travel Agency", "DMC"],
  market: DEFAULT_MARKET,
  baseCurrency: DEFAULT_MARKET.currency,
  enabledCurrencies: ["INR", "AED", "USD"],
};

function readJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function readDemoProfile(): DemoProfile {
  if (typeof window === "undefined") return DEFAULT_DEMO_PROFILE;

  const company = window.localStorage.getItem("nama-demo-company") || DEFAULT_DEMO_PROFILE.company;
  const operator = window.localStorage.getItem("nama-demo-operator") || DEFAULT_DEMO_PROFILE.operator;
  const roles = readJson<string[]>(window.localStorage.getItem("nama-demo-business-roles"), DEFAULT_DEMO_PROFILE.roles);
  const market = readJson<DemoMarket>(window.localStorage.getItem("nama-demo-market"), DEFAULT_DEMO_PROFILE.market);
  const baseCurrency = window.localStorage.getItem("nama-demo-base-currency") || market.currency || DEFAULT_DEMO_PROFILE.baseCurrency;
  const enabledCurrencies = readJson<string[]>(
    window.localStorage.getItem("nama-demo-enabled-currencies"),
    DEFAULT_DEMO_PROFILE.enabledCurrencies
  );

  return {
    company,
    operator,
    roles,
    market,
    baseCurrency,
    enabledCurrencies,
  };
}
