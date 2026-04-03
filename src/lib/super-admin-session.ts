"use client";

export const SUPER_ADMIN_DEMO_EMAIL = "control@nama.internal";
export const SUPER_ADMIN_DEMO_CODE = "NAMA-ALPHA";

import {
  canAccessSuperAdmin,
  clearAppSession,
  createSuperAdminSession as createSharedSuperAdminSession,
  readAppSession,
} from "@/lib/auth-session";

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

export function validateSuperAdminCredentials(email: string, accessCode: string) {
  return email.trim().toLowerCase() === SUPER_ADMIN_DEMO_EMAIL && accessCode.trim() === SUPER_ADMIN_DEMO_CODE;
}
