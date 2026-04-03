import { createHash } from "node:crypto";

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
import {
  SUPER_ADMIN_DEMO_CODE,
  SUPER_ADMIN_DEMO_EMAIL,
  createTenantMemberAccessCode,
} from "@/lib/demo-credentials";

type DemoTenantApiState = {
  tenant_name: string;
  members: TenantMemberContract[];
  invites: TenantInviteContract[];
  sessions: TenantSessionContract[];
  credentials: Record<string, DemoCredentialRecord>;
};

type DemoApiStoreState = {
  tenants: Record<string, DemoTenantApiState>;
  super_admin_sessions: TenantSessionContract[];
  super_admin_credentials: Record<string, DemoCredentialRecord>;
};

type DemoCredentialRecord = {
  subject_email: string;
  secret_hash: string;
  preview_code: string | null;
  issued_at: string;
  updated_at: string;
  reset_token: string | null;
  reset_expires_at: string | null;
  rotation_required: boolean;
};

const DEFAULT_TENANT_NAME = "NAMA Demo";

class DemoApiStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DemoApiStoreError";
    this.status = status;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __NAMA_DEMO_API_STORE__: DemoApiStoreState | undefined;
}

function normalizeTenantNameInput(tenantName?: string | null) {
  return tenantName?.trim() || DEFAULT_TENANT_NAME;
}

function normalizeCredentialEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashCredentialSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function createCredentialRecord(
  email: string,
  secret: string,
  options?: { previewCode?: string | null; rotationRequired?: boolean },
): DemoCredentialRecord {
  const now = nowIso();
  return {
    subject_email: normalizeCredentialEmail(email),
    secret_hash: hashCredentialSecret(secret),
    preview_code: options?.previewCode ?? null,
    issued_at: now,
    updated_at: now,
    reset_token: null,
    reset_expires_at: null,
    rotation_required: options?.rotationRequired ?? false,
  };
}

function createOpaqueToken(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function inviteExpiryIso() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function resetExpiryIso() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

function isExpired(timestamp?: string | null) {
  if (!timestamp) {
    return true;
  }

  const expiry = Date.parse(timestamp);
  if (Number.isNaN(expiry)) {
    return true;
  }

  return expiry < Date.now();
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
      invite_token: createOpaqueToken("invite"),
      token_expires_at: inviteExpiryIso(),
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
      invite_token: createOpaqueToken("invite"),
      token_expires_at: inviteExpiryIso(),
      token_used_at: "02 Apr 2026 · 18:40",
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
      invite_token: createOpaqueToken("invite"),
      token_expires_at: inviteExpiryIso(),
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
      invite_token: createOpaqueToken("invite"),
      token_expires_at: inviteExpiryIso(),
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
    credentials: {},
  };
}

function ensureTenantCredential(tenant: DemoTenantApiState, member: Pick<TenantMemberContract, "tenant_name" | "email" | "role">) {
  const email = normalizeCredentialEmail(member.email);
  const existing = tenant.credentials[email];
  if (existing) {
    return existing;
  }

  const previewCode = createTenantMemberAccessCode({ tenantName: member.tenant_name, role: member.role });
  const created = createCredentialRecord(email, previewCode, {
    previewCode,
    rotationRequired: true,
  });
  tenant.credentials[email] = created;
  return created;
}

function ensureTenantCredentialForMembers(tenant: DemoTenantApiState) {
  tenant.members.forEach((member) => {
    ensureTenantCredential(tenant, member);
  });
}

function ensureSuperAdminCredentials(store: DemoApiStoreState) {
  const email = normalizeCredentialEmail(SUPER_ADMIN_DEMO_EMAIL);
  if (!store.super_admin_credentials[email]) {
    store.super_admin_credentials[email] = createCredentialRecord(email, SUPER_ADMIN_DEMO_CODE, {
      previewCode: SUPER_ADMIN_DEMO_CODE,
      rotationRequired: false,
    });
  }
  return store.super_admin_credentials;
}

function getStoreState() {
  if (!globalThis.__NAMA_DEMO_API_STORE__) {
    globalThis.__NAMA_DEMO_API_STORE__ = {
      tenants: {},
      super_admin_sessions: [],
      super_admin_credentials: {},
    };
  }

  const store = globalThis.__NAMA_DEMO_API_STORE__;
  ensureSuperAdminCredentials(store);
  return store;
}

function getTenantState(tenantName?: string | null) {
  const resolvedTenant = normalizeTenantNameInput(tenantName);
  const key = tenantKey(resolvedTenant);
  const store = getStoreState();

  if (!store.tenants[key]) {
    store.tenants[key] = createTenantState(resolvedTenant);
  }

  ensureTenantCredentialForMembers(store.tenants[key]);

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
    invite_token: invite.invite_token || createOpaqueToken("invite"),
    token_expires_at: invite.token_expires_at || inviteExpiryIso(),
    token_used_at: invite.token_used_at,
    created_at: invite.created_at || now,
    source: invite.source,
  };
}

function setTenantCredentialSecret(
  tenant: DemoTenantApiState,
  input: Pick<TenantMemberContract, "tenant_name" | "email" | "role">,
  secret: string,
) {
  const email = normalizeCredentialEmail(input.email);
  const existing = tenant.credentials[email] ?? ensureTenantCredential(tenant, input);
  tenant.credentials[email] = {
    ...existing,
    secret_hash: hashCredentialSecret(secret),
    preview_code: null,
    reset_token: null,
    reset_expires_at: null,
    rotation_required: false,
    updated_at: nowIso(),
  };
  return tenant.credentials[email];
}

function setSuperAdminCredentialSecret(email: string, secret: string) {
  const store = getStoreState();
  const normalizedEmail = normalizeCredentialEmail(email);
  const existing = store.super_admin_credentials[normalizedEmail];
  if (!existing) {
    return null;
  }

  store.super_admin_credentials[normalizedEmail] = {
    ...existing,
    secret_hash: hashCredentialSecret(secret),
    preview_code: null,
    reset_token: null,
    reset_expires_at: null,
    rotation_required: false,
    updated_at: nowIso(),
  };
  return store.super_admin_credentials[normalizedEmail];
}

function sanitizeResetRecord(record: DemoCredentialRecord, resetToken: string) {
  return {
    ...record,
    reset_token: resetToken,
    reset_expires_at: resetExpiryIso(),
    updated_at: nowIso(),
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
  const resolvedMember = tenant.members.find((item) => item.id === member.id || item.email.toLowerCase() === member.email.toLowerCase()) ?? member;
  ensureTenantCredential(tenant, resolvedMember);
  return resolvedMember;
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
  if (!payload.invite_token || invite.invite_token !== payload.invite_token) {
    throw new DemoApiStoreError("Invalid invite token", 401);
  }
  if (invite.token_used_at || invite.status === "Accepted") {
    throw new DemoApiStoreError("Invite token already used", 409);
  }
  if (isExpired(invite.token_expires_at)) {
    throw new DemoApiStoreError("Invite token expired", 410);
  }
  if (!payload.access_code || payload.access_code.trim().length < 8) {
    throw new DemoApiStoreError("A new access code with at least 8 characters is required", 400);
  }

  invite.status = "Accepted";
  invite.accepted_at = invite.accepted_at || nowIso();
  invite.invited_at = invite.invited_at || invite.accepted_at;
  invite.token_used_at = invite.accepted_at;
  upsertInviteIntoTenant(tenant, invite);

  const member = upsertMemberIntoTenant(tenant, buildMemberFromInvite(invite));
  setTenantCredentialSecret(tenant, member, payload.access_code);

  return {
    tenant_name: tenant.tenant_name,
    invite,
    member,
    credential_access_code: payload.access_code,
  };
}

export function issueTenantSession(payload: TenantSessionCreatePayload) {
  const tenant = getTenantState(payload.tenant_name);

  if (payload.access_code) {
    const member = tenant.members.find((item) => item.email.toLowerCase() === payload.email.trim().toLowerCase());
    if (!member) {
      throw new DemoApiStoreError("Tenant member not found for that email", 404);
    }

    const credential = ensureTenantCredential(tenant, member);
    if (credential.secret_hash !== hashCredentialSecret(payload.access_code)) {
      throw new DemoApiStoreError("Invalid tenant member credentials", 401);
    }

    const session: TenantSessionContract = {
      id: createTenantSessionId("tenant", member.email),
      email: member.email.trim().toLowerCase(),
      display_name: member.name.trim(),
      role: member.role,
      scope: "tenant",
      tenant_name: member.tenant_name,
      member_id: member.id,
      member_status: member.status,
      designation: member.designation,
      team: member.team,
      source: "demo-api",
      granted_at: nowIso(),
    };

    tenant.sessions.unshift(session);
    return session;
  }

  if (!payload.display_name || !payload.role) {
    throw new DemoApiStoreError("display_name and role are required when access_code is not provided", 400);
  }

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

export function issueSuperAdminSession(payload: Pick<TenantSessionCreatePayload, "email" | "display_name" | "access_code">) {
  const store = getStoreState();

  if (payload.access_code) {
    const credential = store.super_admin_credentials[normalizeCredentialEmail(payload.email)];
    if (!credential || credential.secret_hash !== hashCredentialSecret(payload.access_code)) {
      throw new DemoApiStoreError("Invalid Super Admin credentials", 401);
    }
  } else if (!payload.display_name) {
    throw new DemoApiStoreError("display_name is required when access_code is not provided", 400);
  }

  const session: TenantSessionContract = {
    id: createTenantSessionId("platform", payload.email),
    email: payload.email.trim().toLowerCase(),
    display_name: payload.display_name?.trim() || "NAMA Super Admin",
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

export function requestTenantCredentialReset(payload: { tenant_name: string; email: string; scope: "tenant" }) {
  const tenant = getTenantState(payload.tenant_name);
  const email = normalizeCredentialEmail(payload.email);
  const credential = tenant.credentials[email];
  if (!credential) {
    throw new DemoApiStoreError("Tenant credential subject not found", 404);
  }

  const nextToken = createOpaqueToken("reset");
  tenant.credentials[email] = sanitizeResetRecord(credential, nextToken);
  return {
    email,
    scope: "tenant" as const,
    tenant_name: tenant.tenant_name,
    reset_token: nextToken,
    reset_expires_at: tenant.credentials[email].reset_expires_at!,
  };
}

export function confirmTenantCredentialReset(payload: {
  tenant_name: string;
  email: string;
  scope: "tenant";
  reset_token: string;
  access_code: string;
}) {
  const tenant = getTenantState(payload.tenant_name);
  const email = normalizeCredentialEmail(payload.email);
  const credential = tenant.credentials[email];
  if (!credential || credential.reset_token !== payload.reset_token || isExpired(credential.reset_expires_at)) {
    throw new DemoApiStoreError("Invalid or expired tenant reset token", 401);
  }
  if (payload.access_code.trim().length < 8) {
    throw new DemoApiStoreError("A new access code with at least 8 characters is required", 400);
  }

  const member = tenant.members.find((item) => item.email.toLowerCase() === email);
  if (!member) {
    throw new DemoApiStoreError("Tenant credential subject not found", 404);
  }
  setTenantCredentialSecret(tenant, member, payload.access_code);
  return { ok: true, email, scope: "tenant" as const, tenant_name: tenant.tenant_name };
}

export function requestSuperAdminCredentialReset(payload: { email: string; scope: "platform" }) {
  const store = getStoreState();
  const email = normalizeCredentialEmail(payload.email);
  const credential = store.super_admin_credentials[email];
  if (!credential) {
    throw new DemoApiStoreError("Super admin credential subject not found", 404);
  }

  const nextToken = createOpaqueToken("reset");
  store.super_admin_credentials[email] = sanitizeResetRecord(credential, nextToken);
  return {
    email,
    scope: "platform" as const,
    tenant_name: null,
    reset_token: nextToken,
    reset_expires_at: store.super_admin_credentials[email].reset_expires_at!,
  };
}

export function confirmSuperAdminCredentialReset(payload: {
  email: string;
  scope: "platform";
  reset_token: string;
  access_code: string;
}) {
  const store = getStoreState();
  const email = normalizeCredentialEmail(payload.email);
  const credential = store.super_admin_credentials[email];
  if (!credential || credential.reset_token !== payload.reset_token || isExpired(credential.reset_expires_at)) {
    throw new DemoApiStoreError("Invalid or expired Super Admin reset token", 401);
  }
  if (payload.access_code.trim().length < 8) {
    throw new DemoApiStoreError("A new access code with at least 8 characters is required", 400);
  }
  const updated = setSuperAdminCredentialSecret(email, payload.access_code);
  if (!updated) {
    throw new DemoApiStoreError("Super admin credential subject not found", 404);
  }
  return { ok: true, email, scope: "platform" as const, tenant_name: null };
}

export function isDemoApiStoreError(error: unknown): error is DemoApiStoreError {
  return error instanceof DemoApiStoreError;
}
