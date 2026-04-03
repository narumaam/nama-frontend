import {
  createTenantInviteId,
  createTenantMemberId,
  createTenantSessionId,
  nowIso,
  tenantKey,
  type TenantContractSource,
  type TenantInviteAcceptPayload,
  type TenantInviteContract,
  type TenantInviteCreatePayload,
  type TenantInvitePromotionPayload,
  type TenantInvitesBulkCreatePayload,
  type TenantMemberContract,
  type TenantMembersBulkUpsertPayload,
  type TenantMembersUpsertPayload,
  type TenantRole,
  type TenantSessionContract,
  type TenantSessionCreatePayload,
} from "@/lib/tenant-contracts";

type DemoTenantApiState = {
  tenant_name: string;
  members: TenantMemberContract[];
  invites: TenantInviteContract[];
  sessions: TenantSessionContract[];
};

type DemoApiStoreState = {
  tenants: Record<string, DemoTenantApiState>;
  super_admin_sessions: TenantSessionContract[];
};

const DEFAULT_TENANT_NAME = "NAMA Demo";

declare global {
  // eslint-disable-next-line no-var
  var __NAMA_DEMO_API_STORE__: DemoApiStoreState | undefined;
}

function normalizeTenantNameInput(tenantName?: string | null) {
  return tenantName?.trim() || DEFAULT_TENANT_NAME;
}

function createSeedMembers(tenantName: string): TenantMemberContract[] {
  const now = nowIso();
  const resolvedTenant = normalizeTenantNameInput(tenantName);
  const tenantToken = tenantKey(resolvedTenant) || "tenant";

  const seed = [
    {
      role: "customer-admin" as TenantRole,
      name: "Workspace Admin",
      email: `admin@${tenantToken}.demo`,
      designation: "Workspace Admin",
      team: "Leadership",
      reports_to: "Platform",
      responsibility: "Workspace ownership, governance, and team access",
      status: "Active" as const,
      source: "tenant-profile" as TenantContractSource,
    },
    {
      role: "sales" as TenantRole,
      name: "Sales Lead",
      email: `sales@${tenantToken}.demo`,
      designation: "Travel Consultant",
      team: "Sales Desk",
      reports_to: "Sales Manager",
      responsibility: "Lead qualification, follow-up, and quote coordination",
      status: "Active" as const,
      source: "backend-demo" as TenantContractSource,
    },
    {
      role: "finance" as TenantRole,
      name: "Finance Lead",
      email: `finance@${tenantToken}.demo`,
      designation: "Accounts Lead",
      team: "Billing",
      reports_to: "Finance Manager",
      responsibility: "Deposit tracking, invoice release, and reconciliation",
      status: "Active" as const,
      source: "backend-demo" as TenantContractSource,
    },
    {
      role: "operations" as TenantRole,
      name: "Operations Lead",
      email: `ops@${tenantToken}.demo`,
      designation: "Operations Lead",
      team: "Fulfilment",
      reports_to: "Operations Manager",
      responsibility: "Bookings, confirmations, and traveler release",
      status: "Active" as const,
      source: "backend-demo" as TenantContractSource,
    },
    {
      role: "viewer" as TenantRole,
      name: "Reporting Viewer",
      email: `viewer@${tenantToken}.demo`,
      designation: "Read-only Reviewer",
      team: "Reporting",
      reports_to: "Customer Admin",
      responsibility: "Read-only reporting and artifact review",
      status: "Seeded" as const,
      source: "backend-demo" as TenantContractSource,
    },
  ];

  return seed.map((entry, index) => ({
    id: `${tenantToken}-member-${index + 1}`,
    tenant_name: resolvedTenant,
    ...entry,
    created_at: now,
    updated_at: now,
  }));
}

function createSeedInvites(tenantName: string): TenantInviteContract[] {
  const now = nowIso();
  const resolvedTenant = normalizeTenantNameInput(tenantName);
  const tenantToken = tenantKey(resolvedTenant) || "tenant";

  const seed = [
    {
      role: "sales" as TenantRole,
      name: "Aisha Khan",
      email: "aisha@demoagency.in",
      designation: "Senior Executive",
      team: "Inbound Desk",
      reports_to: "Sales Manager",
      responsibility: "Lead intake and quote follow-up",
      status: "Pending" as const,
      invited_at: "03 Apr 2026 · 10:30",
      source: "backend-demo" as TenantContractSource,
    },
    {
      role: "operations" as TenantRole,
      name: "Rohan Iyer",
      email: "rohan@demoagency.in",
      designation: "Operations Lead",
      team: "Luxury Desk",
      reports_to: "Customer Admin",
      responsibility: "Bookings and traveler release",
      status: "Accepted" as const,
      invited_at: "02 Apr 2026 · 16:15",
      accepted_at: "02 Apr 2026 · 18:40",
      source: "accepted-invite" as TenantContractSource,
    },
    {
      role: "finance" as TenantRole,
      name: "Meera Shah",
      email: "meera@demoagency.in",
      designation: "Accounts Lead",
      team: "Billing",
      reports_to: "Finance Lead",
      responsibility: "Billing, payouts, and reconciliation",
      status: "Draft" as const,
      invited_at: "Not sent yet",
      source: "manual" as TenantContractSource,
    },
    {
      role: "sales" as TenantRole,
      name: "Arjun Paul",
      email: "arjun@demoagency.in",
      designation: "Partner Desk",
      team: "Inbound Support",
      reports_to: "Sales Manager",
      responsibility: "Inbound support",
      status: "Pending" as const,
      invited_at: "03 Apr 2026 · 12:00",
      source: "backend-demo" as TenantContractSource,
    },
  ];

  return seed.map((entry, index) => ({
    id: `${tenantToken}-invite-${index + 1}`,
    tenant_name: resolvedTenant,
    ...entry,
    created_at: now,
  }));
}

function createTenantState(tenantName: string): DemoTenantApiState {
  const resolvedTenant = normalizeTenantNameInput(tenantName);
  return {
    tenant_name: resolvedTenant,
    members: createSeedMembers(resolvedTenant),
    invites: createSeedInvites(resolvedTenant),
    sessions: [],
  };
}

function getStoreState() {
  if (!globalThis.__NAMA_DEMO_API_STORE__) {
    globalThis.__NAMA_DEMO_API_STORE__ = {
      tenants: {},
      super_admin_sessions: [],
    };
  }

  return globalThis.__NAMA_DEMO_API_STORE__;
}

function getTenantState(tenantName?: string | null) {
  const resolvedTenant = normalizeTenantNameInput(tenantName);
  const key = tenantKey(resolvedTenant);
  const store = getStoreState();

  if (!store.tenants[key]) {
    store.tenants[key] = createTenantState(resolvedTenant);
  }

  return store.tenants[key];
}

function sortMembers(members: TenantMemberContract[]) {
  const rank: Record<TenantMemberContract["role"], number> = {
    "customer-admin": 0,
    sales: 1,
    finance: 2,
    operations: 3,
    viewer: 4,
  };

  return [...members].sort((left, right) => {
    return (
      rank[left.role] - rank[right.role] ||
      left.status.localeCompare(right.status) ||
      left.name.localeCompare(right.name)
    );
  });
}

function sortInvites(invites: TenantInviteContract[]) {
  const rank: Record<TenantInviteContract["status"], number> = {
    Draft: 0,
    Pending: 1,
    Accepted: 2,
  };

  return [...invites].sort((left, right) => {
    return rank[left.status] - rank[right.status] || left.name.localeCompare(right.name);
  });
}

function normalizeMemberRecord(member: TenantMembersUpsertPayload["member"], tenantName: string): TenantMemberContract {
  const now = nowIso();
  const resolvedTenant = normalizeTenantNameInput(member.tenant_name || tenantName);
  return {
    id: member.id?.trim() || createTenantMemberId(resolvedTenant, member.email),
    tenant_name: resolvedTenant,
    name: member.name.trim(),
    email: member.email.trim().toLowerCase(),
    role: member.role,
    designation: member.designation.trim(),
    team: member.team.trim(),
    reports_to: member.reports_to.trim(),
    responsibility: member.responsibility.trim(),
    status: member.status,
    source: member.source,
    invite_id: member.invite_id,
    invited_at: member.invited_at,
    accepted_at: member.accepted_at,
    created_at: member.created_at || now,
    updated_at: member.updated_at || now,
  };
}

function normalizeInviteRecord(invite: TenantInviteCreatePayload["invite"], tenantName: string): TenantInviteContract {
  const now = nowIso();
  const resolvedTenant = normalizeTenantNameInput(invite.tenant_name || tenantName);
  return {
    id: invite.id?.trim() || createTenantInviteId(resolvedTenant, invite.email),
    tenant_name: resolvedTenant,
    name: invite.name.trim(),
    email: invite.email.trim().toLowerCase(),
    role: invite.role,
    designation: invite.designation.trim(),
    team: invite.team.trim(),
    reports_to: invite.reports_to.trim(),
    responsibility: invite.responsibility.trim(),
    status: invite.status,
    invited_at: invite.invited_at || now,
    accepted_at: invite.accepted_at,
    created_at: invite.created_at || now,
    source: invite.source,
  };
}

function upsertMemberIntoTenant(tenant: DemoTenantApiState, member: TenantMemberContract) {
  const existingIndex = tenant.members.findIndex(
    (item) => item.id === member.id || item.email.toLowerCase() === member.email.toLowerCase()
  );
  if (existingIndex >= 0) {
    tenant.members[existingIndex] = {
      ...tenant.members[existingIndex],
      ...member,
      updated_at: nowIso(),
    };
  } else {
    tenant.members.unshift(member);
  }
  tenant.members = sortMembers(tenant.members);
  return tenant.members.find((item) => item.id === member.id || item.email.toLowerCase() === member.email.toLowerCase()) ?? member;
}

function upsertInviteIntoTenant(tenant: DemoTenantApiState, invite: TenantInviteContract) {
  const existingIndex = tenant.invites.findIndex(
    (item) => item.id === invite.id || item.email.toLowerCase() === invite.email.toLowerCase()
  );
  if (existingIndex >= 0) {
    tenant.invites[existingIndex] = {
      ...tenant.invites[existingIndex],
      ...invite,
    };
  } else {
    tenant.invites.unshift(invite);
  }
  tenant.invites = sortInvites(tenant.invites);
  return tenant.invites.find((item) => item.id === invite.id || item.email.toLowerCase() === invite.email.toLowerCase()) ?? invite;
}

export function listTenantMembers(tenantName?: string | null) {
  return sortMembers(getTenantState(tenantName).members);
}

export function upsertTenantMember(payload: TenantMembersUpsertPayload) {
  const tenant = getTenantState(payload.tenant_name);
  const member = normalizeMemberRecord(payload.member, tenant.tenant_name);
  return upsertMemberIntoTenant(tenant, member);
}

export function bulkUpsertTenantMembers(payload: TenantMembersBulkUpsertPayload) {
  const tenant = getTenantState(payload.tenant_name);
  const upserted = payload.members.map((member) => upsertMemberIntoTenant(tenant, normalizeMemberRecord(member, tenant.tenant_name)));
  tenant.members = sortMembers(tenant.members);
  return { tenant_name: tenant.tenant_name, members: sortMembers(upserted) };
}

function buildMemberFromInvite(invite: TenantInviteContract): TenantMemberContract {
  return {
    id: invite.id,
    tenant_name: invite.tenant_name,
    name: invite.name,
    email: invite.email,
    role: invite.role,
    designation: invite.designation,
    team: invite.team,
    reports_to: invite.reports_to,
    responsibility: invite.responsibility,
    status: "Active",
    source: invite.status === "Accepted" ? "accepted-invite" : "manual",
    invite_id: invite.id,
    invited_at: invite.invited_at,
    accepted_at: invite.accepted_at,
    created_at: invite.created_at,
    updated_at: nowIso(),
  };
}

export function promoteTenantInviteToMember(payload: TenantInvitePromotionPayload) {
  const tenant = getTenantState(payload.tenant_name);
  const invite = tenant.invites.find((item) => item.id === payload.invite_id || item.email.toLowerCase() === payload.email.toLowerCase());
  const member: TenantMemberContract = {
    id: createTenantMemberId(payload.tenant_name, payload.email),
    tenant_name: normalizeTenantNameInput(payload.tenant_name),
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    designation: payload.designation.trim(),
    team: payload.team.trim(),
    reports_to: payload.reports_to?.trim() || invite?.reports_to || "Customer Admin",
    responsibility: payload.responsibility?.trim() || invite?.responsibility || "Workspace participation",
    status: "Active",
    source: "accepted-invite",
    invite_id: payload.invite_id,
    invited_at: invite?.invited_at,
    accepted_at: invite?.accepted_at || nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  if (invite) {
    invite.status = "Accepted";
    invite.accepted_at = member.accepted_at;
    invite.invited_at = invite.invited_at || member.accepted_at || nowIso();
    upsertInviteIntoTenant(tenant, invite);
  } else {
    upsertInviteIntoTenant(
      tenant,
      normalizeInviteRecord(
        {
          id: payload.invite_id,
          tenant_name: payload.tenant_name,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          designation: payload.designation,
          team: payload.team,
          reports_to: payload.reports_to || "Customer Admin",
          responsibility: payload.responsibility || "Workspace participation",
          status: "Accepted",
          invited_at: nowIso(),
          accepted_at: member.accepted_at,
          source: "accepted-invite",
        },
        tenant.tenant_name
      )
    );
  }

  return upsertMemberIntoTenant(tenant, member);
}

export function listTenantInvites(tenantName?: string | null) {
  return sortInvites(getTenantState(tenantName).invites);
}

export function createTenantInvite(payload: TenantInviteCreatePayload) {
  const tenant = getTenantState(payload.tenant_name);
  const invite = normalizeInviteRecord(payload.invite, tenant.tenant_name);
  return upsertInviteIntoTenant(tenant, invite);
}

export function bulkCreateTenantInvites(payload: TenantInvitesBulkCreatePayload) {
  const tenant = getTenantState(payload.tenant_name);
  const invites = payload.invites.map((invite) => upsertInviteIntoTenant(tenant, normalizeInviteRecord(invite, tenant.tenant_name)));
  tenant.invites = sortInvites(tenant.invites);
  return { tenant_name: tenant.tenant_name, invites: sortInvites(invites) };
}

export function acceptTenantInvite(payload: TenantInviteAcceptPayload) {
  const tenant = getTenantState(payload.tenant_name);
  const invite = tenant.invites.find((item) => item.id === payload.invite_id);
  if (!invite) {
    return null;
  }

  invite.status = "Accepted";
  invite.accepted_at = invite.accepted_at || nowIso();
  invite.invited_at = invite.invited_at || invite.accepted_at;
  upsertInviteIntoTenant(tenant, invite);

  const member = buildMemberFromInvite(invite);
  upsertMemberIntoTenant(tenant, member);

  return {
    tenant_name: tenant.tenant_name,
    invite,
    member,
  };
}

export function issueTenantSession(payload: TenantSessionCreatePayload) {
  const tenant = getTenantState(payload.tenant_name);
  const session: TenantSessionContract = {
    id: createTenantSessionId("tenant", payload.email),
    email: payload.email.trim().toLowerCase(),
    display_name: payload.display_name.trim(),
    role: payload.role,
    scope: "tenant",
    tenant_name: normalizeTenantNameInput(payload.tenant_name),
    member_id: payload.member_id ?? null,
    member_status: payload.member_status ?? null,
    designation: payload.designation ?? null,
    team: payload.team ?? null,
    source: "demo-api",
    granted_at: nowIso(),
  };

  tenant.sessions.unshift(session);
  return session;
}

export function listTenantSessions(tenantName?: string | null) {
  return [...getTenantState(tenantName).sessions];
}

export function issueSuperAdminSession(payload: Pick<TenantSessionCreatePayload, "email" | "display_name">) {
  const store = getStoreState();
  const session: TenantSessionContract = {
    id: createTenantSessionId("platform", payload.email),
    email: payload.email.trim().toLowerCase(),
    display_name: payload.display_name.trim(),
    role: "super-admin",
    scope: "platform",
    tenant_name: null,
    source: "demo-api",
    granted_at: nowIso(),
  };

  store.super_admin_sessions.unshift(session);
  return session;
}

export function listSuperAdminSessions() {
  return [...getStoreState().super_admin_sessions];
}
