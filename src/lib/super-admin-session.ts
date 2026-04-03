"use client";

import {
  canAccessSuperAdmin,
  clearAppSession,
  createSuperAdminSession as createSharedSuperAdminSession,
  readAppSession,
} from "@/lib/auth-session";
export { SUPER_ADMIN_DEMO_CODE, SUPER_ADMIN_DEMO_EMAIL, validateSuperAdminCredentials } from "@/lib/demo-credentials";

export function readSuperAdminSession() {
  const session = readAppSession();
  if (!session || session.role !== "super-admin") return null;
  return {
    email: session.email,
    grantedAt: session.grantedAt,
    mode: "alpha-demo" as const,
  };
}

export function hasSuperAdminSession() {
  return canAccessSuperAdmin();
}

export function createSuperAdminSession(email: string) {
  return createSharedSuperAdminSession("NAMA Super Admin", email);
}

export function clearSuperAdminSession() {
  clearAppSession();
}
