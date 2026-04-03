import { tenantKey, type TenantRole } from "@/lib/tenant-contracts";

export const SUPER_ADMIN_DEMO_EMAIL = "control@nama.internal";
export const SUPER_ADMIN_DEMO_CODE = "NAMA-ALPHA";

function normalizeRoleToken(role: TenantRole) {
  if (role === "customer-admin") return "ADMIN";
  return role.toUpperCase();
}

export function createTenantMemberAccessCode(input: { tenantName: string; role: TenantRole }) {
  const tenantToken = tenantKey(input.tenantName).slice(0, 8).toUpperCase() || "TENANT";
  const roleToken = normalizeRoleToken(input.role);
  return `NAMA-${tenantToken}-${roleToken}`;
}

export function validateTenantMemberAccessCode(input: { tenantName: string; role: TenantRole; accessCode: string }) {
  return createTenantMemberAccessCode(input) === input.accessCode.trim().toUpperCase();
}

export function validateSuperAdminCredentials(email: string, accessCode: string) {
  return email.trim().toLowerCase() === SUPER_ADMIN_DEMO_EMAIL && accessCode.trim() === SUPER_ADMIN_DEMO_CODE;
}
