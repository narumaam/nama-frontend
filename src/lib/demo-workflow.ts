import { DEMO_CASE_ROUTES } from "@/lib/demo-cases";
import { DEMO_PROFILE_STORAGE_KEYS } from "@/lib/demo-config";
import { DEMO_LEAD_PROFILE_META } from "@/lib/demo-case-profiles";

export type DemoInviteStatus = "Draft" | "Pending" | "Accepted";
export type DemoLeadStage = "New" | "Qualified" | "Quoted" | "Follow Up" | "Won";
export type DemoBookingState = "Pending finance" | "Ready for handoff" | "Guest pack released";
export type DemoInvoiceState = "Draft" | "Sent" | "Paid";
export type DemoDownloadState = "Ready" | "Downloaded";
export type DemoTravelerApprovalState = "Awaiting approval" | "Approved for send";
export type DemoTravelerPdfState = "Draft" | "Shared" | "Downloaded";

export type DemoInviteRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  designation: string;
  team: string;
  reportsTo: string;
  responsibility: string;
  status: DemoInviteStatus;
  createdAt: string;
  invitedAt: string;
  acceptedAt?: string;
};

export type DemoEmployeeRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  designation: string;
  team: string;
  reportsTo: string;
  responsibility: string;
};

export type DemoCaseWorkflowState = {
  slug: string;
  leadStage: DemoLeadStage;
  nextAction: string;
  nextActionAt: string;
  financeStatus: string;
  paymentState: string;
  bookingState: DemoBookingState;
  guestPackState: "Queued" | "Released";
  invoiceState: DemoInvoiceState;
  invoiceDownloadState: DemoDownloadState;
  travelerPdfState: DemoTravelerPdfState;
  travelerApprovalState: DemoTravelerApprovalState;
  lastUpdated: string;
};

export type DemoWorkflowState = {
  employees: DemoEmployeeRecord[];
  invites: DemoInviteRecord[];
  cases: Record<string, DemoCaseWorkflowState>;
};

type DemoWorkflowInput = {
  employees?: DemoEmployeeRecord[];
  invites?: DemoInviteRecord[];
  cases?: Record<string, Partial<DemoCaseWorkflowState>>;
};

const DEMO_WORKFLOW_EVENT = "nama-demo-workflow-updated";

function nowLabel() {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function defaultBookingState(financeStatus: string): DemoBookingState {
  const normalized = financeStatus.toLowerCase();
  if (normalized.includes("received") || normalized.includes("approved")) return "Ready for handoff";
  return "Pending finance";
}

export function getInvitePath(inviteId: string) {
  return `/invite/${inviteId}`;
}

export function getLeadStagePreset(stage: DemoLeadStage): Pick<DemoCaseWorkflowState, "leadStage" | "nextAction" | "nextActionAt" | "financeStatus" | "paymentState" | "bookingState"> {
  if (stage === "New") {
    return {
      leadStage: stage,
      nextAction: "Qualify the traveler and confirm preferences",
      nextActionAt: "Today · 14:30",
      financeStatus: "Intake captured and waiting for qualification",
      paymentState: "Pre-quote stage",
      bookingState: "Pending finance",
    };
  }

  if (stage === "Qualified") {
    return {
      leadStage: stage,
      nextAction: "Draft itinerary and align the first quote",
      nextActionAt: "Today · 16:00",
      financeStatus: "Qualification complete, quote prep in progress",
      paymentState: "Quote preparation stage",
      bookingState: "Pending finance",
    };
  }

  if (stage === "Quoted") {
    return {
      leadStage: stage,
      nextAction: "Send the quote and wait for commercial confirmation",
      nextActionAt: "Today · 17:30",
      financeStatus: "Quote approved and sent to the traveler",
      paymentState: "Awaiting deposit confirmation",
      bookingState: "Pending finance",
    };
  }

  if (stage === "Follow Up") {
    return {
      leadStage: stage,
      nextAction: "Follow up on deposit timing and keep the hold warm",
      nextActionAt: "Tomorrow · 10:00",
      financeStatus: "Payment reminder queued",
      paymentState: "Follow-up in progress",
      bookingState: "Pending finance",
    };
  }

  return {
    leadStage: stage,
    nextAction: "Release into bookings and share traveler documents",
    nextActionAt: "Ready now",
    financeStatus: "Deposit received and finance release approved",
    paymentState: "Deposit confirmed",
    bookingState: "Ready for handoff",
  };
}

function createDefaultInvites(): DemoInviteRecord[] {
  return [
    {
      id: "invite-aisha-khan",
      name: "Aisha Khan",
      email: "aisha@demoagency.in",
      role: "Sales",
      designation: "Senior Executive",
      team: "Inbound Desk",
      reportsTo: "Sales Manager",
      responsibility: DEMO_CASE_ROUTES.slice(0, 2).map((item) => item.destination).join(", "),
      status: "Pending",
      createdAt: "03 Apr 2026 · 10:15",
      invitedAt: "03 Apr 2026 · 10:30",
    },
    {
      id: "invite-rohan-iyer",
      name: "Rohan Iyer",
      email: "rohan@demoagency.in",
      role: "Operations",
      designation: "Operations Lead",
      team: "Luxury Desk",
      reportsTo: "Customer Admin",
      responsibility: `${DEMO_CASE_ROUTES[1].destination}, Content`,
      status: "Accepted",
      createdAt: "02 Apr 2026 · 16:05",
      invitedAt: "02 Apr 2026 · 16:15",
      acceptedAt: "02 Apr 2026 · 18:40",
    },
    {
      id: "invite-meera-shah",
      name: "Meera Shah",
      email: "meera@demoagency.in",
      role: "Finance",
      designation: "Accounts Lead",
      team: "Billing",
      reportsTo: "Finance Lead",
      responsibility: "Billing, payouts",
      status: "Draft",
      createdAt: "03 Apr 2026 · 11:10",
      invitedAt: "Not sent yet",
    },
    {
      id: "invite-arjun-paul",
      name: "Arjun Paul",
      email: "arjun@demoagency.in",
      role: "Sub-agent",
      designation: "Partner Desk",
      team: "Inbound Support",
      reportsTo: "Sales Manager",
      responsibility: "Inbound support",
      status: "Pending",
      createdAt: "03 Apr 2026 · 11:45",
      invitedAt: "03 Apr 2026 · 12:00",
    },
  ];
}

function createDefaultEmployees(): DemoEmployeeRecord[] {
  return [
    {
      id: "employee-aisha-khan",
      name: "Aisha Khan",
      email: "aisha@demoagency.in",
      role: "Sales",
      designation: "Senior Executive",
      team: "Inbound Desk",
      reportsTo: "Sales Manager",
      responsibility: DEMO_CASE_ROUTES.slice(0, 2).map((item) => item.destination).join(", "),
    },
    {
      id: "employee-rohan-iyer",
      name: "Rohan Iyer",
      email: "rohan@demoagency.in",
      role: "Operations",
      designation: "Operations Lead",
      team: "Luxury Desk",
      reportsTo: "Customer Admin",
      responsibility: `${DEMO_CASE_ROUTES[1].destination}, Content`,
    },
    {
      id: "employee-meera-shah",
      name: "Meera Shah",
      email: "meera@demoagency.in",
      role: "Finance",
      designation: "Accounts Lead",
      team: "Billing",
      reportsTo: "Finance Lead",
      responsibility: "Billing, payouts",
    },
    {
      id: "employee-arjun-paul",
      name: "Arjun Paul",
      email: "arjun@demoagency.in",
      role: "Sub-agent",
      designation: "Partner Desk",
      team: "Inbound Support",
      reportsTo: "Sales Manager",
      responsibility: "Inbound support",
    },
    {
      id: "employee-priya",
      name: "Priya",
      email: "priya@demoagency.in",
      role: "Sales",
      designation: "Senior Executive",
      team: "Inbound Desk",
      reportsTo: "Sales Manager",
      responsibility: "Inbound CRM and quote follow-up",
    },
    {
      id: "employee-nikhil",
      name: "Nikhil",
      email: "nikhil@demoagency.in",
      role: "Operations",
      designation: "Trip Designer",
      team: "Luxury Desk",
      reportsTo: "Operations Lead",
      responsibility: "Trip design and supplier coordination",
    },
    {
      id: "employee-farah",
      name: "Farah",
      email: "farah@demoagency.in",
      role: "Finance",
      designation: "Accounts Lead",
      team: "Billing",
      reportsTo: "Finance Lead",
      responsibility: "Billing and reconciliation",
    },
  ];
}

function createDefaultCaseState(slug: string): DemoCaseWorkflowState {
  const route = DEMO_CASE_ROUTES.find((item) => item.slug === slug) ?? DEMO_CASE_ROUTES[0];
  const meta = DEMO_LEAD_PROFILE_META[slug] ?? DEMO_LEAD_PROFILE_META[DEMO_CASE_ROUTES[0].slug];

  return {
    slug,
    leadStage: meta.stage,
    nextAction: meta.nextAction,
    nextActionAt: meta.nextActionAt,
    financeStatus: route.financeStatus,
    paymentState: route.paymentState,
    bookingState: defaultBookingState(route.financeStatus),
    guestPackState: "Queued",
    invoiceState: "Draft",
    invoiceDownloadState: "Ready",
    travelerPdfState: "Draft",
    travelerApprovalState: "Awaiting approval",
    lastUpdated: "03 Apr 2026 · 12:00",
  };
}

function createDefaultCases() {
  return Object.fromEntries(DEMO_CASE_ROUTES.map((item) => [item.slug, createDefaultCaseState(item.slug)]));
}

function normalizeInviteRecord(invite: Partial<DemoInviteRecord>, fallback: DemoInviteRecord): DemoInviteRecord {
  return {
    ...fallback,
    ...invite,
    id: invite.id || fallback.id,
    name: invite.name?.trim() || fallback.name,
    email: invite.email?.trim() || fallback.email,
    role: invite.role?.trim() || fallback.role,
    designation: invite.designation?.trim() || fallback.designation,
    team: invite.team?.trim() || fallback.team,
    reportsTo: invite.reportsTo?.trim() || fallback.reportsTo,
    responsibility: invite.responsibility?.trim() || fallback.responsibility,
    status: invite.status || fallback.status,
    createdAt: invite.createdAt || fallback.createdAt,
    invitedAt: invite.invitedAt || fallback.invitedAt,
    acceptedAt: invite.acceptedAt || fallback.acceptedAt,
  };
}

function normalizeEmployeeRecord(employee: Partial<DemoEmployeeRecord>, fallback: DemoEmployeeRecord): DemoEmployeeRecord {
  return {
    ...fallback,
    ...employee,
    id: employee.id || fallback.id,
    name: employee.name?.trim() || fallback.name,
    email: employee.email?.trim() || fallback.email,
    role: employee.role?.trim() || fallback.role,
    designation: employee.designation?.trim() || fallback.designation,
    team: employee.team?.trim() || fallback.team,
    reportsTo: employee.reportsTo?.trim() || fallback.reportsTo,
    responsibility: employee.responsibility?.trim() || fallback.responsibility,
  };
}

function normalizeCaseState(slug: string, input: Partial<DemoCaseWorkflowState>): DemoCaseWorkflowState {
  const fallback = createDefaultCaseState(slug);

  return {
    ...fallback,
    ...input,
    slug,
    leadStage: input.leadStage || fallback.leadStage,
    nextAction: input.nextAction?.trim() || fallback.nextAction,
    nextActionAt: input.nextActionAt?.trim() || fallback.nextActionAt,
    financeStatus: input.financeStatus?.trim() || fallback.financeStatus,
    paymentState: input.paymentState?.trim() || fallback.paymentState,
    bookingState: input.bookingState || fallback.bookingState,
    guestPackState: input.guestPackState || fallback.guestPackState,
    invoiceState: input.invoiceState || fallback.invoiceState,
    invoiceDownloadState: input.invoiceDownloadState || fallback.invoiceDownloadState,
    travelerPdfState: input.travelerPdfState || fallback.travelerPdfState,
    travelerApprovalState: input.travelerApprovalState || fallback.travelerApprovalState,
    lastUpdated: input.lastUpdated || fallback.lastUpdated,
  };
}

function normalizeWorkflowState(input?: DemoWorkflowInput): DemoWorkflowState {
  const defaultEmployees = createDefaultEmployees();
  const defaultInvites = createDefaultInvites();
  const defaultCases = createDefaultCases();
  const employeeFallbackMap = Object.fromEntries(defaultEmployees.map((employee) => [employee.id, employee]));
  const inviteFallbackMap = Object.fromEntries(defaultInvites.map((invite) => [invite.id, invite]));
  const incomingEmployees = input?.employees?.length ? input.employees : defaultEmployees;
  const incomingInvites = input?.invites?.length ? input.invites : defaultInvites;
  const casesInput = input?.cases ?? {};

  return {
    employees: incomingEmployees.map((employee) =>
      normalizeEmployeeRecord(employee, employeeFallbackMap[employee.id] ?? defaultEmployees[0])
    ),
    invites: incomingInvites.map((invite) => normalizeInviteRecord(invite, inviteFallbackMap[invite.id] ?? defaultInvites[0])),
    cases: Object.fromEntries(
      Object.keys(defaultCases).map((slug) => [slug, normalizeCaseState(slug, casesInput[slug] ?? defaultCases[slug])])
    ),
  };
}

function persistWorkflowState(state: DemoWorkflowState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.employees, JSON.stringify(state.employees));
  window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.invites, JSON.stringify(state.invites));
  window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.workflowCases, JSON.stringify(state.cases));
  window.dispatchEvent(new CustomEvent(DEMO_WORKFLOW_EVENT, { detail: state }));
}

export function readDemoWorkflowState(): DemoWorkflowState {
  if (typeof window === "undefined") return normalizeWorkflowState();

  return normalizeWorkflowState({
    employees: readJson<DemoEmployeeRecord[]>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.employees), createDefaultEmployees()),
    invites: readJson<DemoInviteRecord[]>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.invites), createDefaultInvites()),
    cases: readJson<Record<string, DemoCaseWorkflowState>>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.workflowCases), createDefaultCases()),
  });
}

export function writeDemoWorkflowState(input: Partial<DemoWorkflowState>): DemoWorkflowState {
  const nextState = normalizeWorkflowState({
    ...readDemoWorkflowState(),
    ...input,
  });

  persistWorkflowState(nextState);
  return nextState;
}

export function replaceDemoWorkflowState(state: DemoWorkflowInput) {
  const nextState = normalizeWorkflowState(state);
  persistWorkflowState(nextState);
  return nextState;
}

export function resetDemoWorkflowState() {
  return replaceDemoWorkflowState({
    employees: createDefaultEmployees(),
    invites: createDefaultInvites(),
    cases: createDefaultCases(),
  });
}

export function createDemoInvite(input: Omit<DemoInviteRecord, "id" | "status" | "createdAt" | "invitedAt"> & { status?: DemoInviteStatus }) {
  const currentState = readDemoWorkflowState();
  const inviteId = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
  const invite: DemoInviteRecord = {
    id: inviteId,
    name: input.name.trim(),
    email: input.email.trim(),
    role: input.role.trim(),
    designation: input.designation.trim(),
    team: input.team.trim(),
    reportsTo: input.reportsTo.trim(),
    responsibility: input.responsibility.trim(),
    status: input.status ?? "Pending",
    createdAt: nowLabel(),
    invitedAt: input.status === "Draft" ? "Not sent yet" : nowLabel(),
  };

  return writeDemoWorkflowState({
    invites: [invite, ...currentState.invites],
  });
}

export function upsertDemoEmployees(employees: DemoEmployeeRecord[]) {
  const currentState = readDemoWorkflowState();
  const existingByEmail = new Map(currentState.employees.map((employee) => [employee.email.toLowerCase(), employee]));
  const nextEmployees = [...currentState.employees];

  employees.forEach((employee) => {
    const key = employee.email.toLowerCase();
    const existing = existingByEmail.get(key);
    if (existing) {
      const index = nextEmployees.findIndex((item) => item.id === existing.id);
      nextEmployees[index] = normalizeEmployeeRecord({ ...existing, ...employee, id: existing.id }, existing);
      return;
    }

    nextEmployees.push(
      normalizeEmployeeRecord(
        employee,
        {
          ...employee,
          id: employee.id,
        }
      )
    );
  });

  return writeDemoWorkflowState({
    employees: nextEmployees,
  });
}

export function createEmployeeRecord(input: Omit<DemoEmployeeRecord, "id">): DemoEmployeeRecord {
  return {
    id: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${input.email.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ...input,
  };
}

export function updateDemoInvite(inviteId: string, patch: Partial<DemoInviteRecord>) {
  const currentState = readDemoWorkflowState();
  return writeDemoWorkflowState({
    invites: currentState.invites.map((invite) =>
      invite.id === inviteId
        ? normalizeInviteRecord(
            {
              ...invite,
              ...patch,
              invitedAt: patch.status === "Draft" ? "Not sent yet" : patch.invitedAt || invite.invitedAt,
            },
            invite
          )
        : invite
    ),
  });
}

export function acceptDemoInvite(inviteId: string) {
  return updateDemoInvite(inviteId, {
    status: "Accepted",
    acceptedAt: nowLabel(),
  });
}

export function updateDemoCaseWorkflow(slug: string, patch: Partial<DemoCaseWorkflowState>) {
  const currentState = readDemoWorkflowState();
  const currentCase = currentState.cases[slug] ?? createDefaultCaseState(slug);
  const nextCases = {
    ...currentState.cases,
    [slug]: normalizeCaseState(slug, {
      ...currentCase,
      ...patch,
      lastUpdated: nowLabel(),
    }),
  };

  return writeDemoWorkflowState({
    cases: nextCases,
  });
}

export function setDemoLeadStage(slug: string, stage: DemoLeadStage) {
  const preset = getLeadStagePreset(stage);
  return updateDemoCaseWorkflow(slug, preset);
}

export function getDemoWorkflowEventName() {
  return DEMO_WORKFLOW_EVENT;
}
