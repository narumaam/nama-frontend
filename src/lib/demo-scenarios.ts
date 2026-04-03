import { DEMO_PLAN_PRICES, type DemoSubscriptionPlan, type DemoTenantRecord, writeDemoSubscriptionPlan, writeDemoTenantRegistry } from "@/lib/demo-admin";
import { DEMO_PROFILE_STORAGE_KEYS, MARKET_PRESETS } from "@/lib/demo-config";
import { replaceDemoEventLog, type DemoEventRecord } from "@/lib/demo-events";
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

export type DemoScenarioKey = "founder" | "small-agency" | "ops-dmc" | "invite-backlog" | "finance-overdue";

export type DemoScenarioDefinition = {
  key: DemoScenarioKey;
  label: string;
  note: string;
  company: string;
  plan: DemoSubscriptionPlan;
  market: string;
  operator: string;
  launchPath: string;
  launchLabel: string;
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
    launchPath: "/dashboard/team",
    launchLabel: "Open team flow",
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
    launchPath: "/dashboard/bookings?case=maldives-honeymoon",
    launchLabel: "Open booking handoff",
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
    launchPath: "/dashboard/bookings?case=europe-family-escape",
    launchLabel: "Open ops handoff",
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
  {
    key: "invite-backlog",
    label: "Invite Backlog QA",
    note: "Negative-path tenant with stalled team onboarding and no accepted invite momentum.",
    company: "Harborline Escapes",
    plan: "Growth",
    market: "India",
    operator: "Mitali Sen",
    launchPath: "/dashboard/team",
    launchLabel: "Inspect invite backlog",
    roles: ["Travel Agency"],
    whiteLabel: {
      enabled: true,
      workspaceName: "Harborline",
      badgeGlyph: "HB",
      supportEmail: "ops@harborline.in",
      customDomain: "harborline.nama.ai",
      accentHex: "#7A4A1E",
    },
    employees: [
      {
        name: "Mitali Sen",
        email: "mitali@harborline.in",
        role: "Admin",
        designation: "Founder",
        team: "Control Desk",
        reportsTo: "Founder",
        responsibility: "Workspace setup and approvals",
      },
      {
        name: "Aarav Bose",
        email: "aarav@harborline.in",
        role: "Sales",
        designation: "Executive",
        team: "Holiday Desk",
        reportsTo: "Founder",
        responsibility: "Lead response and qualification",
      },
      {
        name: "Sana Gupta",
        email: "sana@harborline.in",
        role: "Operations",
        designation: "Coordinator",
        team: "Holiday Desk",
        reportsTo: "Founder",
        responsibility: "Booking follow-up",
      },
    ],
    invites: [
      {
        id: "invite-aarav-bose",
        name: "Aarav Bose",
        email: "aarav@harborline.in",
        role: "Sales",
        designation: "Executive",
        team: "Holiday Desk",
        reportsTo: "Founder",
        responsibility: "Lead response and qualification",
        status: "Pending",
        createdAt: "03 Apr 2026 · 09:00",
        invitedAt: "03 Apr 2026 · 09:05",
      },
      {
        id: "invite-sana-gupta",
        name: "Sana Gupta",
        email: "sana@harborline.in",
        role: "Operations",
        designation: "Coordinator",
        team: "Holiday Desk",
        reportsTo: "Founder",
        responsibility: "Booking follow-up",
        status: "Pending",
        createdAt: "03 Apr 2026 · 09:02",
        invitedAt: "03 Apr 2026 · 09:06",
      },
    ],
    cases: {
      "maldives-honeymoon": {
        ...getLeadStagePreset("Quoted"),
      },
      "europe-family-escape": {
        ...getLeadStagePreset("Follow Up"),
      },
    },
  },
  {
    key: "finance-overdue",
    label: "Finance Overdue QA",
    note: "Negative-path tenant where sales won the case but collections and traveler release are still blocked.",
    company: "Northstar Voyages",
    plan: "Enterprise",
    market: "United States",
    operator: "Leena Kapoor",
    launchPath: "/dashboard/finance",
    launchLabel: "Inspect finance risk",
    roles: ["Travel Agency", "DMC"],
    whiteLabel: {
      enabled: true,
      workspaceName: "Northstar",
      badgeGlyph: "NS",
      supportEmail: "billing@northstarvoyages.com",
      customDomain: "app.northstarvoyages.com",
      accentHex: "#1D5B8F",
    },
    employees: [
      {
        name: "Leena Kapoor",
        email: "leena@northstarvoyages.com",
        role: "Admin",
        designation: "Regional Lead",
        team: "Control Tower",
        reportsTo: "Founder",
        responsibility: "Commercial approvals and escalation",
      },
      {
        name: "Omar Khan",
        email: "omar@northstarvoyages.com",
        role: "Finance",
        designation: "Collections Lead",
        team: "Billing",
        reportsTo: "Regional Lead",
        responsibility: "Settlement and invoice follow-up",
      },
      {
        name: "Tara Blake",
        email: "tara@northstarvoyages.com",
        role: "Operations",
        designation: "Trip Lead",
        team: "Guest Delivery",
        reportsTo: "Regional Lead",
        responsibility: "Traveler documentation and supplier handoff",
      },
    ],
    invites: [
      {
        id: "invite-omar-khan",
        name: "Omar Khan",
        email: "omar@northstarvoyages.com",
        role: "Finance",
        designation: "Collections Lead",
        team: "Billing",
        reportsTo: "Regional Lead",
        responsibility: "Settlement and invoice follow-up",
        status: "Accepted",
        createdAt: "03 Apr 2026 · 07:50",
        invitedAt: "03 Apr 2026 · 08:00",
        acceptedAt: "03 Apr 2026 · 08:18",
      },
      {
        id: "invite-tara-blake",
        name: "Tara Blake",
        email: "tara@northstarvoyages.com",
        role: "Operations",
        designation: "Trip Lead",
        team: "Guest Delivery",
        reportsTo: "Regional Lead",
        responsibility: "Traveler documentation and supplier handoff",
        status: "Accepted",
        createdAt: "03 Apr 2026 · 07:52",
        invitedAt: "03 Apr 2026 · 08:00",
        acceptedAt: "03 Apr 2026 · 08:20",
      },
    ],
    cases: {
      "maldives-honeymoon": {
        ...getLeadStagePreset("Won"),
        financeStatus: "Deposit overdue by 3 days and invoice reminder escalated",
        paymentState: "Collections follow-up overdue",
        bookingState: "Pending finance",
        guestPackState: "Queued",
        invoiceState: "Sent",
        travelerPdfState: "Draft",
      },
      "europe-family-escape": {
        ...getLeadStagePreset("Quoted"),
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

function buildScenarioEvents(scenario: DemoScenarioDefinition): DemoEventRecord[] {
  const baseEvents: DemoEventRecord[] = [
    {
      id: `seed-${scenario.key}-registered`,
      type: "tenant_registered",
      severity: "success",
      tenant: scenario.company,
      title: "Tenant registered",
      detail: `${scenario.company} entered NAMA on the ${scenario.plan} plan for the ${scenario.market} market.`,
      path: "/dashboard",
      createdAt: "03 Apr 2026 · 08:00",
    },
  ];

  const inviteEvents = scenario.invites.map((invite, index) => ({
    id: `seed-${scenario.key}-invite-${invite.id}`,
    type: invite.status === "Accepted" ? "invite_accepted" : "invite_sent",
    severity: invite.status === "Pending" ? "warning" as const : "success" as const,
    tenant: scenario.company,
    title: invite.status === "Accepted" ? "Invite accepted" : "Invite sent",
    detail:
      invite.status === "Accepted"
        ? `${invite.name} joined the workspace as ${invite.role}.`
        : `${invite.name} is still pending acceptance for ${invite.team}.`,
    path: "/dashboard/team",
    createdAt: invite.acceptedAt || invite.invitedAt,
  }));

  const caseEvents = Object.entries(scenario.cases).flatMap(([slug, state], index) => {
    const events: DemoEventRecord[] = [];
    const titleBase = slug.replace(/-/g, " ");

    if (state.leadStage) {
      events.push({
        id: `seed-${scenario.key}-lead-${slug}`,
        type: "lead_stage_changed",
        severity: state.leadStage === "Won" ? "success" : state.leadStage === "Follow Up" ? "warning" : "info",
        tenant: scenario.company,
        title: "Lead stage updated",
        detail: `${titleBase} is currently in ${state.leadStage}.`,
        path: "/dashboard/leads",
        caseSlug: slug,
        createdAt: `03 Apr 2026 · 0${8 + index}:30`,
      });
    }

    if (state.invoiceState === "Paid") {
      events.push({
        id: `seed-${scenario.key}-invoice-${slug}`,
        type: "invoice_state_changed",
        severity: "success",
        tenant: scenario.company,
        title: "Invoice paid",
        detail: `${titleBase} invoice is settled.`,
        path: `/dashboard/invoices/${slug}`,
        caseSlug: slug,
        createdAt: `03 Apr 2026 · 1${index}:10`,
      });
    } else if (state.invoiceState === "Sent") {
      events.push({
        id: `seed-${scenario.key}-invoice-${slug}`,
        type: "invoice_state_changed",
        severity: "warning",
        tenant: scenario.company,
        title: "Invoice sent",
        detail: `${titleBase} invoice is awaiting settlement.`,
        path: `/dashboard/invoices/${slug}`,
        caseSlug: slug,
        createdAt: `03 Apr 2026 · 1${index}:10`,
      });
    }

    if (state.travelerPdfState === "Shared") {
      events.push({
        id: `seed-${scenario.key}-traveler-${slug}`,
        type: "traveler_pdf_state_changed",
        severity: "success",
        tenant: scenario.company,
        title: "Traveler PDF shared",
        detail: `${titleBase} traveler pack has been released.`,
        path: `/dashboard/traveler-pdf/${slug}`,
        caseSlug: slug,
        createdAt: `03 Apr 2026 · 1${index}:35`,
      });
    }

    return events;
  });

  return [...caseEvents.reverse(), ...inviteEvents.reverse(), ...baseEvents];
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
  replaceDemoEventLog([
    {
      id: "reset-default-snapshot",
      type: "demo_reset",
      severity: "info",
      tenant: DEFAULT_DEMO_PROFILE.company,
      title: "Demo state reset",
      detail: "The workspace returned to the default platform snapshot for a fresh run.",
      path: "/dashboard/admin",
      createdAt: "03 Apr 2026 · 12:00",
    },
  ]);
}

export function seedDemoScenario(key: DemoScenarioKey) {
  if (typeof window === "undefined") return;

  const scenario = getDemoScenarioDefinition(key);
  writeDemoProfile(buildScenarioProfile(scenario));
  writeDemoSubscriptionPlan(scenario.plan);
  replaceDemoWorkflowState(buildScenarioWorkflow(scenario));
  writeDemoTenantRegistry(buildScenarioRegistry(scenario));
  replaceDemoEventLog(buildScenarioEvents(scenario));
  window.dispatchEvent(new CustomEvent("nama-demo-scenario-seeded", { detail: scenario.key }));
}

export function getScenarioProjectedMrr(key: DemoScenarioKey) {
  const scenario = getDemoScenarioDefinition(key);
  return DEMO_PLAN_PRICES[scenario.plan];
}
