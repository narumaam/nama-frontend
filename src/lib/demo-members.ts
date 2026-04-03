import { DEMO_PROFILE_STORAGE_KEYS } from "@/lib/demo-config";
import { readDemoProfile } from "@/lib/demo-profile";
import { readDemoWorkflowState, type DemoEmployeeRecord, type DemoInviteRecord } from "@/lib/demo-workflow";
import { normalizeTenantRole, type AppRole } from "@/lib/auth-session";

export type DemoMemberStatus = "Seeded" | "Invited" | "Active";
export type DemoMemberSource = "tenant-profile" | "employee-directory" | "accepted-invite" | "manual";

export type DemoMemberRecord = {
  id: string;
  tenantName: string;
  name: string;
  email: string;
  role: Exclude<AppRole, "super-admin">;
  designation: string;
  team: string;
  reportsTo: string;
  responsibility: string;
  status: DemoMemberStatus;
  source: DemoMemberSource;
  inviteId?: string;
  invitedAt?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoMemberRegistryState = {
  members: DemoMemberRecord[];
};

type DemoMemberInput = Omit<DemoMemberRecord, "id" | "createdAt" | "updatedAt"> & Partial<Pick<DemoMemberRecord, "id">>;

const DEMO_MEMBERS_EVENT = "nama-demo-members-updated";
const DEMO_MEMBER_STORAGE_KEY = "nama-demo-members";

function nowLabel() {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function dispatchMembersUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEMO_MEMBERS_EVENT));
}

function readJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeRegistryState(input: Partial<DemoMemberRegistryState>): DemoMemberRegistryState {
  return {
    members: (input.members ?? []).map((member) => normalizeMemberRecord(member)),
  };
}

function normalizeMemberRecord(input: Partial<DemoMemberRecord>): DemoMemberRecord {
  const tenantName = input.tenantName?.trim() || readDemoProfile().company;
  const name = input.name?.trim() || "Workspace Member";
  const email = input.email?.trim() || `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "member"}@${tenantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")}.demo`;
  const role = normalizeTenantRole(input.role || "viewer");
  const now = nowLabel();

  return {
    id: input.id?.trim() || `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${email.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    tenantName,
    name,
    email,
    role,
    designation: input.designation?.trim() || "Workspace Member",
    team: input.team?.trim() || "Operations",
    reportsTo: input.reportsTo?.trim() || "Customer Admin",
    responsibility: input.responsibility?.trim() || "Workspace participation",
    status: input.status ?? "Seeded",
    source: input.source ?? "manual",
    inviteId: input.inviteId,
    invitedAt: input.invitedAt,
    acceptedAt: input.acceptedAt,
    createdAt: input.createdAt?.trim() || now,
    updatedAt: input.updatedAt?.trim() || now,
  };
}

function memberFromEmployee(employee: DemoEmployeeRecord): DemoMemberRecord {
  return normalizeMemberRecord({
    id: employee.id,
    tenantName: readDemoProfile().company,
    name: employee.name,
    email: employee.email,
    role: normalizeTenantRole(employee.role),
    designation: employee.designation,
    team: employee.team,
    reportsTo: employee.reportsTo,
    responsibility: employee.responsibility,
    status: "Active",
    source: "employee-directory",
  });
}

function memberFromInvite(invite: DemoInviteRecord): DemoMemberRecord {
  return normalizeMemberRecord({
    id: invite.id,
    tenantName: readDemoProfile().company,
    name: invite.name,
    email: invite.email,
    role: normalizeTenantRole(invite.role),
    designation: invite.designation,
    team: invite.team,
    reportsTo: invite.reportsTo,
    responsibility: invite.responsibility,
    status: invite.status === "Accepted" ? "Active" : "Invited",
    source: invite.status === "Accepted" ? "accepted-invite" : "manual",
    inviteId: invite.id,
    invitedAt: invite.invitedAt,
    acceptedAt: invite.acceptedAt,
  });
}

function seedDemoMembers(): DemoMemberRecord[] {
  const profile = readDemoProfile();
  const workflow = readDemoWorkflowState();
  const membersByEmail = new Map<string, DemoMemberRecord>();

  const tenantAdmin = normalizeMemberRecord({
    tenantName: profile.company,
    name: profile.operator,
    email: `${profile.operator.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "workspace.operator"}@${profile.company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")}.demo`,
    role: "customer-admin",
    designation: "Workspace Admin",
    team: "Leadership",
    reportsTo: "Platform",
    responsibility: "Workspace ownership, governance, and team access",
    status: "Active",
    source: "tenant-profile",
  });
  membersByEmail.set(tenantAdmin.email.toLowerCase(), tenantAdmin);

  workflow.employees.forEach((employee) => {
    const member = memberFromEmployee(employee);
    membersByEmail.set(member.email.toLowerCase(), member);
  });

  workflow.invites
    .filter((invite) => invite.status === "Accepted")
    .forEach((invite) => {
      const member = memberFromInvite(invite);
      membersByEmail.set(member.email.toLowerCase(), member);
    });

  return Array.from(membersByEmail.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function persistRegistryState(state: DemoMemberRegistryState) {
  if (!canUseStorage()) return state;
  window.localStorage.setItem(DEMO_MEMBER_STORAGE_KEY, JSON.stringify(state.members));
  window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.tenantRegistry, JSON.stringify(state.members));
  dispatchMembersUpdate();
  return state;
}

export function readDemoMemberRegistryState(): DemoMemberRegistryState {
  if (!canUseStorage()) {
    return { members: seedDemoMembers() };
  }

  const stored = readJson<DemoMemberRecord[]>(window.localStorage.getItem(DEMO_MEMBER_STORAGE_KEY), []);
  if (!stored.length) {
    const seeded = seedDemoMembers();
    persistRegistryState({ members: seeded });
    return { members: seeded };
  }

  return normalizeRegistryState({ members: stored });
}

export function writeDemoMemberRegistryState(input: Partial<DemoMemberRegistryState>) {
  const nextState = normalizeRegistryState({
    ...readDemoMemberRegistryState(),
    ...input,
  });

  return persistRegistryState(nextState);
}

export function resetDemoMemberRegistryState() {
  return persistRegistryState({ members: seedDemoMembers() });
}

export function upsertDemoMember(input: DemoMemberInput) {
  const currentState = readDemoMemberRegistryState();
  const nextMember = normalizeMemberRecord({
    ...input,
    status: input.status ?? "Seeded",
    source: input.source ?? "manual",
  });

  const nextMembers = currentState.members.filter((member) => member.id !== nextMember.id && member.email.toLowerCase() !== nextMember.email.toLowerCase());
  nextMembers.unshift(nextMember);
  return writeDemoMemberRegistryState({ members: nextMembers });
}

export function promoteInviteToMember(invite: DemoInviteRecord) {
  return upsertDemoMember({
    id: invite.id,
    tenantName: readDemoProfile().company,
    name: invite.name,
    email: invite.email,
    role: normalizeTenantRole(invite.role),
    designation: invite.designation,
    team: invite.team,
    reportsTo: invite.reportsTo,
    responsibility: invite.responsibility,
    status: invite.status === "Accepted" ? "Active" : "Invited",
    source: invite.status === "Accepted" ? "accepted-invite" : "manual",
    inviteId: invite.id,
    invitedAt: invite.invitedAt,
    acceptedAt: invite.acceptedAt,
  });
}

export function promoteInviteRecord(invite: DemoInviteRecord) {
  const nextInvite = promoteInviteToMember(invite);
  return nextInvite;
}

export function mergeMembersFromEmployees(employees: DemoEmployeeRecord[]) {
  const currentState = readDemoMemberRegistryState();
  const membersByEmail = new Map(currentState.members.map((member) => [member.email.toLowerCase(), member]));

  employees.forEach((employee) => {
    const member = memberFromEmployee(employee);
    membersByEmail.set(member.email.toLowerCase(), member);
  });

  return writeDemoMemberRegistryState({ members: Array.from(membersByEmail.values()) });
}

export function readDemoMembersForTenant(tenantName = readDemoProfile().company) {
  return readDemoMemberRegistryState().members.filter((member) => member.tenantName === tenantName);
}

export function getDemoMembersEventName() {
  return DEMO_MEMBERS_EVENT;
}

export function createDemoMemberLabel(member: DemoMemberRecord) {
  return `${member.name} · ${member.role}`;
}
