import { DEMO_PLAN_PRICES, type DemoSubscriptionPlan, type DemoTenantRecord, writeDemoSubscriptionPlan, writeDemoTenantRegistry } from "@/lib/demo-admin";
import { DEMO_PROFILE_STORAGE_KEYS, MARKET_PRESETS } from "@/lib/demo-config";
import { DEFAULT_DEMO_PROFILE, type DemoProfile, writeDemoProfile } from "@/lib/demo-profile";
import {
  createEmployeeRecord,
  getLeadStagePreset,
  replaceDemoWorkflowState,
  type DemoCaseWorkflowState,
  type DemoEmployeeRecord,
  type DemoInviteRecord,
  type DemoWorkflowState,
} from "@/lib/demo-workflow";

export type DemoScenarioKey = "founder" | "small-agency" | "ops-dmc";

export type DemoScenarioDefinition = {
  key: DemoScenarioKey;
  label: string;
  note: string;
  company: string;
  plan: DemoSubscriptionPlan;
  market: string;
  operator: string;
  roles: DemoProfile["roles"];
  employees: Array<Omit<DemoEmployeeRecord, "id">>;
  invites: DemoInviteRecord[];
  cases: Record<string, Partial<DemoCaseWorkflowState>>;
  whiteLabel: DemoProfile["whiteLabel"];
};

const DEFAULT_REGISTRY: DemoTenantRecord[] = [
  {
    id: "nair-luxury-escapes",
    company: "Nair Luxury Escapes",
    market: "India",
    plan: "Growth",
    workspaceDomain: "preview.nama.ai",
    supportEmail: "support@nama.ai",
    createdAt: "02 Apr 2026",
    renewalDate: "12 Apr 2026",
  },
  {
    id: "velocity-corporate-travel",
    company: "Velocity Corporate Travel",
    market: "United States",
    plan: "Enterprise",
    workspaceDomain: "velocity.nama.ai",
    supportEmail: "ops@velocity.travel",
    createdAt: "21 Mar 2026",
    renewalDate: "18 Apr 2026",
  },
  {
    id: "bluepalm-holidays",
    company: "BluePalm Holidays",
    market: "UAE",
    plan: "Starter",
    workspaceDomain: "bluepalm.nama.ai",
    supportEmail: "hello@bluepalm.ae",
    createdAt: "27 Mar 2026",
    renewalDate: "09 Apr 2026",
  },
];

export const DEMO_SCENARIOS: DemoScenarioDefinition[] = [
  {
    key: "founder",
    label: "Founder Golden Path",
    note: "Full founder walkthrough from registration to paid invoice and shared traveler PDF.",
    company: "Aurora Reserve Travel",
    plan: "Enterprise",
    market: "India",
    operator: "Radhika Founder",
    roles: ["Travel Agency", "DMC"],
    whiteLabel: {
      enabled: true,
      workspaceName: "Aurora Reserve",
      badgeGlyph: "AR",
      supportEmail: "founder@aurorareserve.travel",
      customDomain: "aurora.nama.ai",
      accentHex: "#C56A2D",
    },
    employees: [
      {
        name: "Ritika Sen",
        email: "ritika@aurora.example",
        role: "Sales",
        designation: "Senior Executive",
        team: "Inbound Desk",
        reportsTo: "Sales Manager",
        responsibility: "Inbound CRM and quote follow-up",
      },
      {
        name: "Kabir Rao",
        email: "kabir@aurora.example",
        role: "Operations",
        designation: "Trip Designer",
        team: "Luxury Desk",
        reportsTo: "Operations Lead",
        responsibility: "Trip design and supplier coordination",
      },
      {
        name: "Zoya Ali",
        email: "zoya@aurora.example",
        role: "Finance",
        designation: "Accounts Lead",
        team: "Billing",
        reportsTo: "Finance Lead",
        responsibility: "Billing and reconciliation",
      },
    ],
    invites: [
      {
        id: "invite-ritika-sen",
        name: "Ritika Sen",
        email: "ritika@aurora.example",
        role: "Sales",
        designation: "Senior Executive",
        team: "Inbound Desk",
        reportsTo: "Sales Manager",
        responsibility: "Inbound CRM and quote follow-up",
        status: "Accepted",
        createdAt: "03 Apr 2026 · 11:00",
        invitedAt: "03 Apr 2026 · 11:05",
        acceptedAt: "03 Apr 2026 · 11:18",
      },
      {
        id: "invite-kabir-rao",
        name: "Kabir Rao",
        email: "kabir@aurora.example",
        role: "Operations",
        designation: "Trip Designer",
        team: "Luxury Desk",
        reportsTo: "Operations Lead",
        responsibility: "Trip design and supplier coordination",
        status: "Pending",
        createdAt: "03 Apr 2026 · 11:06",
        invitedAt: "03 Apr 2026 · 11:08",
      },
      {
        id: "invite-zoya-ali",
        name: "Zoya Ali",
        email: "zoya@aurora.example",
        role: "Finance",
        designation: "Accounts Lead",
        team: "Billing",
        reportsTo: "Finance Lead",
        responsibility: "Billing and reconciliation",
        status: "Pending",
        createdAt: "03 Apr 2026 · 11:06",
        invitedAt: "03 Apr 2026 · 11:08",
      },
    ],
    cases: {
      "maldives-honeymoon": {
        ...getLeadStagePreset("Won"),
        paymentState: "Invoice settled",
        bookingState: "Guest pack released",
        guestPackState: "Released",
        invoiceState: "Paid",
        travelerPdfState: "Shared",
        travelerApprovalState: "Approved for send",
      },
    },
  },
  {
    key: "small-agency",
    label: "Small Agency Seed",
    note: "Lean starter tenant with one accepted teammate and a single won leisure case.",
    company: "Maple Trail Holidays",
    plan: "Starter",
    market: "UAE",
    operator: "Asha Khan",
    roles: ["Travel Agency"],
    whiteLabel: {
      enabled: true,
      workspaceName: "Maple Trail",
      badgeGlyph: "MT",
      supportEmail: "hello@mapletrail.ae",
      customDomain: "mapletrail.nama.ai",
      accentHex: "#2E6F5E",
    },
    employees: [
      {
        name: "Asha Khan",
        email: "asha@mapletrail.ae",
        role: "Sales",
        designation: "Founder",
        team: "Holiday Desk",
        reportsTo: "Founder",
        responsibility: "Lead intake and quote approval",
      },
      {
        name: "Nina Dsouza",
        email: "nina@mapletrail.ae",
        role: "Operations",
        designation: "Trip Coordinator",
        team: "Holiday Desk",
        reportsTo: "Founder",
        responsibility: "Bookings and traveler documentation",
      },
    ],
    invites: [
      {
        id: "invite-nina-dsouza",
        name: "Nina Dsouza",
        email: "nina@mapletrail.ae",
        role: "Operations",
        designation: "Trip Coordinator",
        team: "Holiday Desk",
        reportsTo: "Founder",
        responsibility: "Bookings and traveler documentation",
        status: "Accepted",
        createdAt: "03 Apr 2026 · 09:10",
        invitedAt: "03 Apr 2026 · 09:12",
        acceptedAt: "03 Apr 2026 · 09:20",
      },
    ],
    cases: {
      "maldives-honeymoon": {
        ...getLeadStagePreset("Won"),
        paymentState: "Deposit confirmed",
        bookingState: "Ready for handoff",
        guestPackState: "Released",
        invoiceState: "Sent",
        travelerPdfState: "Shared",
        travelerApprovalState: "Approved for send",
      },
      "europe-family-escape": {
        ...getLeadStagePreset("Follow Up"),
      },
    },
  },
  {
    key: "ops-dmc",
    label: "Ops-Heavy DMC Seed",
    note: "Operationally dense DMC tenant with stronger delivery posture and more invites in flight.",
    company: "Saffron Dunes DMC",
    plan: "Growth",
    market: "India",
    operator: "Rehan Malik",
    roles: ["DMC", "Tour Operator"],
    whiteLabel: {
      enabled: true,
      workspaceName: "Saffron Dunes",
      badgeGlyph: "SD",
      supportEmail: "ops@saffrondunes.in",
      customDomain: "partners.saffrondunes.in",
      accentHex: "#9E6A1D",
    },
    employees: [
      {
        name: "Rehan Malik",
        email: "rehan@saffrondunes.in",
        role: "Admin",
        designation: "Customer Admin",
        team: "Control Tower",
        reportsTo: "Founder",
        responsibility: "Commercial approvals and partner governance",
      },
      {
        name: "Mira Joshi",
        email: "mira@saffrondunes.in",
        role: "Operations",
        designation: "Ops Lead",
        team: "Fulfilment Desk",
        reportsTo: "Customer Admin",
        responsibility: "Supplier and itinerary execution",
      },
      {
        name: "Dev Shah",
        email: "dev@saffrondunes.in",
        role: "Finance",
        designation: "Collections Lead",
        team: "Billing",
        reportsTo: "Customer Admin",
        responsibility: "Collections and reconciliation",
      },
      {
        name: "Anika Roy",
        email: "anika@saffrondunes.in",
        role: "Sales",
        designation: "Partner Desk",
        team: "B2B Desk",
        reportsTo: "Customer Admin",
        responsibility: "Agent follow-up and group quoting",
      },
    ],
    invites: [
      {
        id: "invite-mira-joshi",
        name: "Mira Joshi",
        email: "mira@saffrondunes.in",
        role: "Operations",
        designation: "Ops Lead",
        team: "Fulfilment Desk",
        reportsTo: "Customer Admin",
        responsibility: "Supplier and itinerary execution",
        status: "Accepted",
        createdAt: "03 Apr 2026 · 08:10",
        invitedAt: "03 Apr 2026 · 08:14",
        acceptedAt: "03 Apr 2026 · 08:32",
      },
      {
        id: "invite-dev-shah",
        name: "Dev Shah",
        email: "dev@saffrondunes.in",
        role: "Finance",
        designation: "Collections Lead",
        team: "Billing",
        reportsTo: "Customer Admin",
        responsibility: "Collections and reconciliation",
        status: "Accepted",
        createdAt: "03 Apr 2026 · 08:11",
        invitedAt: "03 Apr 2026 · 08:14",
        acceptedAt: "03 Apr 2026 · 08:29",
      },
      {
        id: "invite-anika-roy",
        name: "Anika Roy",
        email: "anika@saffrondunes.in",
        role: "Sales",
        designation: "Partner Desk",
        team: "B2B Desk",
        reportsTo: "Customer Admin",
        responsibility: "Agent follow-up and group quoting",
        status: "Pending",
        createdAt: "03 Apr 2026 · 08:12",
        invitedAt: "03 Apr 2026 · 08:16",
      },
    ],
    cases: {
      "maldives-honeymoon": {
        ...getLeadStagePreset("Won"),
        paymentState: "Deposit confirmed",
        bookingState: "Guest pack released",
        guestPackState: "Released",
        invoiceState: "Paid",
        travelerPdfState: "Shared",
        travelerApprovalState: "Approved for send",
      },
      "europe-family-escape": {
        ...getLeadStagePreset("Won"),
        paymentState: "Deposit confirmed",
        bookingState: "Ready for handoff",
        invoiceState: "Sent",
        travelerPdfState: "Draft",
      },
      "dubai-shopping-weekend": {
        ...getLeadStagePreset("Qualified"),
      },
    },
  },
];

export function getDemoScenarioDefinition(key: DemoScenarioKey) {
  return DEMO_SCENARIOS.find((scenario) => scenario.key === key) ?? DEMO_SCENARIOS[0];
}

function buildScenarioProfile(scenario: DemoScenarioDefinition): Partial<DemoProfile> {
  const market = MARKET_PRESETS.find((item) => item.country === scenario.market) ?? MARKET_PRESETS[0];

  return {
    company: scenario.company,
    operator: scenario.operator,
    subscriptionPlan: scenario.plan,
    roles: scenario.roles,
    market,
    baseCurrency: market.currency,
    enabledCurrencies: [market.currency, "USD", "AED"].filter((value, index, items) => items.indexOf(value) === index),
    whiteLabel: scenario.whiteLabel,
    bankDetails: {
      beneficiaryName: `${scenario.company} Pvt Ltd`,
      bankName: scenario.market === "UAE" ? "Emirates NBD" : "HDFC Bank",
      branchName: scenario.market === "UAE" ? "Dubai Marina" : "MG Road, Bengaluru",
      accountNumber: scenario.plan === "Enterprise" ? "50200012345678" : "40100088822117",
      accountType: "Current Account",
      routingCode: scenario.market === "UAE" ? "EBILAEADXXX" : "HDFC0000456 / HDFCINBBXXX",
      billingAddress:
        scenario.market === "UAE"
          ? "Office 304, Marina Plaza, Dubai Marina, Dubai, UAE"
          : "22 Residency Road, Bengaluru 560025, Karnataka, India",
    },
  };
}

function buildScenarioWorkflow(scenario: DemoScenarioDefinition): {
  employees: DemoEmployeeRecord[];
  invites: DemoInviteRecord[];
  cases: Record<string, Partial<DemoCaseWorkflowState>>;
} {
  return {
    employees: scenario.employees.map((employee) => createEmployeeRecord(employee)),
    invites: scenario.invites,
    cases: scenario.cases,
  };
}

function buildScenarioRegistry(scenario: DemoScenarioDefinition): DemoTenantRecord[] {
  const nextTenant: DemoTenantRecord = {
    id: scenario.company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    company: scenario.company,
    market: scenario.market,
    plan: scenario.plan,
    workspaceDomain: scenario.whiteLabel.customDomain,
    supportEmail: scenario.whiteLabel.supportEmail,
    createdAt: "03 Apr 2026",
    renewalDate: "03 May 2026",
  };

  return [
    nextTenant,
    ...DEFAULT_REGISTRY.filter((tenant) => tenant.id !== nextTenant.id),
  ];
}

export function resetDemoState() {
  if (typeof window === "undefined") return;

  Object.values(DEMO_PROFILE_STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });

  writeDemoProfile(DEFAULT_DEMO_PROFILE);
  writeDemoSubscriptionPlan(DEFAULT_DEMO_PROFILE.subscriptionPlan);
  replaceDemoWorkflowState({});
  writeDemoTenantRegistry(DEFAULT_REGISTRY);
}

export function seedDemoScenario(key: DemoScenarioKey) {
  if (typeof window === "undefined") return;

  const scenario = getDemoScenarioDefinition(key);
  writeDemoProfile(buildScenarioProfile(scenario));
  writeDemoSubscriptionPlan(scenario.plan);
  replaceDemoWorkflowState(buildScenarioWorkflow(scenario));
  writeDemoTenantRegistry(buildScenarioRegistry(scenario));
  window.dispatchEvent(new CustomEvent("nama-demo-scenario-seeded", { detail: scenario.key }));
}

export function getScenarioProjectedMrr(key: DemoScenarioKey) {
  const scenario = getDemoScenarioDefinition(key);
  return DEMO_PLAN_PRICES[scenario.plan];
}
