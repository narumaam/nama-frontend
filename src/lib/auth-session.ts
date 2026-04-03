"use client";

export const APP_SESSION_KEY = "nama.appSession";

export type AppRole =
  | "super-admin"
  | "customer-admin"
  | "finance"
  | "sales"
  | "operations"
  | "viewer";

export type AppScope = "platform" | "tenant";

export type AppSession = {
  email: string;
  displayName: string;
  role: AppRole;
  scope: AppScope;
  tenantName: string | null;
  source: "alpha-demo" | "beta-foundation";
  grantedAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function dispatchSessionUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("nama-app-session-updated"));
}

export function readAppSession(): AppSession | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(APP_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    window.localStorage.removeItem(APP_SESSION_KEY);
    return null;
  }
}

export function hasAppSession() {
  return Boolean(readAppSession());
}

export function createAppSession(session: Omit<AppSession, "grantedAt" | "source"> & Partial<Pick<AppSession, "source">>) {
  if (!canUseStorage()) return null;
  const nextSession: AppSession = {
    ...session,
    source: session.source ?? "beta-foundation",
    grantedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(APP_SESSION_KEY, JSON.stringify(nextSession));
  dispatchSessionUpdate();
  return nextSession;
}

export function clearAppSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(APP_SESSION_KEY);
  dispatchSessionUpdate();
}

export function hasRole(role: AppRole) {
  return readAppSession()?.role === role;
}

export function canAccessSuperAdmin() {
  return hasRole("super-admin");
}

export function createTenantAdminSession(displayName: string, tenantName: string) {
  const normalizedTenant = tenantName.trim() || "nama-demo";
  const normalizedEmail =
    `${displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "workspace.operator"}@${normalizedTenant
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) || "tenant"}.demo`;

  return createAppSession({
    email: normalizedEmail,
    displayName,
    role: "customer-admin",
    scope: "tenant",
    tenantName: normalizedTenant,
  });
}

export function createSuperAdminSession(displayName: string, email: string) {
  return createAppSession({
    email,
    displayName,
    role: "super-admin",
    scope: "platform",
    tenantName: null,
  });
}
