export type TenantRole = "customer-admin" | "sales" | "finance" | "operations" | "viewer";

export type TenantMemberStatus = "Seeded" | "Invited" | "Active";
export type TenantInviteStatus = "Draft" | "Pending" | "Accepted";
export type TenantSessionScope = "tenant" | "platform";
export type TenantContractSource = "tenant-profile" | "employee-directory" | "accepted-invite" | "manual" | "backend-demo" | "demo-api";

export type TenantMemberContract = {
  id: string;
  tenant_name: string;
  name: string;
  email: string;
  role: TenantRole;
  designation: string;
  team: string;
  reports_to: string;
  responsibility: string;
  status: TenantMemberStatus;
  source: TenantContractSource;
  invite_id?: string;
  invited_at?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
};

export type TenantInviteContract = {
  id: string;
  tenant_name: string;
  name: string;
  email: string;
  role: TenantRole;
  designation: string;
  team: string;
  reports_to: string;
  responsibility: string;
  status: TenantInviteStatus;
  created_at: string;
  invited_at: string;
  accepted_at?: string;
  invite_token?: string;
  token_expires_at?: string;
  token_used_at?: string;
  source: TenantContractSource;
};

export type TenantSessionContract = {
  id: string;
  email: string;
  display_name: string;
  role: TenantRole | "super-admin";
  scope: TenantSessionScope;
  tenant_name: string | null;
  member_id?: string | null;
  member_status?: string | null;
  designation?: string | null;
  team?: string | null;
  source: "demo-api" | "local-demo";
  granted_at: string;
};

export type TenantMembersUpsertPayload = {
  tenant_name: string;
  member: Omit<TenantMemberContract, "created_at" | "updated_at"> & Partial<Pick<TenantMemberContract, "created_at" | "updated_at">>;
};

export type TenantMembersBulkUpsertPayload = {
  tenant_name: string;
  members: Array<Omit<TenantMemberContract, "created_at" | "updated_at"> & Partial<Pick<TenantMemberContract, "created_at" | "updated_at">>>;
};

export type TenantInvitePromotionPayload = {
  tenant_name: string;
  invite_id: string;
  name: string;
  email: string;
  role: TenantRole;
  designation: string;
  team: string;
  reports_to?: string;
  responsibility?: string;
};

export type TenantInviteCreatePayload = {
  tenant_name: string;
  invite: Omit<TenantInviteContract, "created_at" | "invited_at"> & Partial<Pick<TenantInviteContract, "created_at" | "invited_at">>;
};

export type TenantInvitesBulkCreatePayload = {
  tenant_name: string;
  invites: Array<Omit<TenantInviteContract, "created_at" | "invited_at"> & Partial<Pick<TenantInviteContract, "created_at" | "invited_at">>>;
};

export type TenantInviteAcceptPayload = {
  tenant_name: string;
  invite_id: string;
  invite_token: string;
  access_code: string;
};

export type TenantCredentialResetRequestPayload = {
  tenant_name?: string | null;
  email: string;
  scope: TenantSessionScope;
};

export type TenantCredentialResetConfirmPayload = {
  tenant_name?: string | null;
  email: string;
  scope: TenantSessionScope;
  reset_token: string;
  access_code: string;
};

export type TenantCredentialResetResponse = {
  email: string;
  scope: TenantSessionScope;
  tenant_name: string | null;
  reset_token: string;
  reset_expires_at: string;
};

export type TenantSessionCreatePayload = {
  email: string;
  display_name?: string;
  role?: TenantRole | "super-admin";
  scope: TenantSessionScope;
  tenant_name: string | null;
  member_id?: string | null;
  member_status?: string | null;
  designation?: string | null;
  team?: string | null;
  access_code?: string | null;
};

export function normalizeTenantName(tenantName: string) {
  return tenantName.trim() || "NAMA Demo";
}

export function tenantKey(tenantName: string) {
  return normalizeTenantName(tenantName).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function nowIso() {
  return new Date().toISOString();
}

export function createTenantMemberId(tenantName: string, email: string) {
  const tenantToken = tenantKey(tenantName) || "tenant";
  const emailToken = email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${tenantToken}-${emailToken}`.replace(/^-+|-+$/g, "");
}

export function createTenantInviteId(tenantName: string, email: string) {
  const tenantToken = tenantKey(tenantName) || "tenant";
  const emailToken = email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const stamp = Date.now().toString(36);
  return `${tenantToken}-${emailToken}-${stamp}`.replace(/^-+|-+$/g, "");
}

export function createTenantSessionId(scope: TenantSessionScope, email: string) {
  const emailToken = email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const stamp = Date.now().toString(36);
  return `${scope}-${emailToken}-${stamp}`.replace(/^-+|-+$/g, "");
}
