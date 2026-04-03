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
export type AppAction =
  | "lead.manage"
  | "lead.enrich"
  | "finance.sendQuote"
  | "finance.recordDeposit"
  | "finance.export"
  | "booking.releaseGuestPack"
  | "artifact.invoiceManage"
  | "artifact.travelerDispatch"
  | "team.invite"
  | "team.bulkInvite"
  | "team.employeeSave"
  | "team.whiteLabel";

export type AppSession = {
  email: string;
  displayName: string;
  role: AppRole;
  scope: AppScope;
  tenantName: string | null;
  source: "alpha-demo" | "beta-foundation";
  grantedAt: string;
};

export const TENANT_ROLE_OPTIONS: Array<{ role: AppRole; label: string }> = [
  { role: "customer-admin", label: "Customer Admin" },
  { role: "sales", label: "Sales" },
  { role: "operations", label: "Operations" },
  { role: "finance", label: "Finance" },
  { role: "viewer", label: "Viewer" },
];

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

export function getRoleLabel(role: AppRole) {
  return TENANT_ROLE_OPTIONS.find((item) => item.role === role)?.label ?? "Super Admin";
}

export function getDefaultRouteForRole(role: AppRole) {
  switch (role) {
    case "super-admin":
      return "/dashboard/admin";
    case "finance":
      return "/dashboard/finance";
    case "sales":
      return "/dashboard/leads";
    case "operations":
      return "/dashboard/bookings";
    case "viewer":
      return "/dashboard/artifacts";
    case "customer-admin":
    default:
      return "/dashboard";
  }
}

const PATH_ACCESS_RULES: Array<{ matches: RegExp; roles: AppRole[] }> = [
  { matches: /^\/dashboard\/admin(?:\/|$)/, roles: ["super-admin"] },
  { matches: /^\/dashboard\/team(?:\/|$)/, roles: ["customer-admin", "super-admin"] },
  { matches: /^\/dashboard\/finance(?:\/|$)/, roles: ["customer-admin", "finance", "super-admin"] },
  { matches: /^\/dashboard\/invoices\/.+/, roles: ["customer-admin", "finance", "super-admin"] },
  { matches: /^\/dashboard\/leads(?:\/|$)/, roles: ["customer-admin", "sales", "super-admin"] },
  { matches: /^\/dashboard\/deals(?:\/|$)/, roles: ["customer-admin", "sales", "super-admin"] },
  { matches: /^\/dashboard\/bookings(?:\/|$)/, roles: ["customer-admin", "operations", "finance", "super-admin"] },
  { matches: /^\/dashboard\/dmc(?:\/|$)/, roles: ["customer-admin", "operations", "super-admin"] },
  { matches: /^\/dashboard\/comms(?:\/|$)/, roles: ["customer-admin", "sales", "operations", "super-admin"] },
  { matches: /^\/dashboard\/analytics(?:\/|$)/, roles: ["customer-admin", "finance", "viewer", "super-admin"] },
  { matches: /^\/dashboard\/content(?:\/|$)/, roles: ["customer-admin", "super-admin"] },
  { matches: /^\/dashboard\/autopilot(?:\/|$)/, roles: ["customer-admin", "super-admin"] },
  { matches: /^\/dashboard\/ekla(?:\/|$)/, roles: ["customer-admin", "super-admin"] },
  { matches: /^\/dashboard\/evolution(?:\/|$)/, roles: ["customer-admin", "super-admin"] },
  { matches: /^\/dashboard\/itineraries(?:\/|$)/, roles: ["customer-admin", "sales", "operations", "viewer", "super-admin"] },
  { matches: /^\/dashboard\/traveler-pdf\/.+/, roles: ["customer-admin", "operations", "viewer", "super-admin"] },
  { matches: /^\/dashboard\/artifacts(?:\/|$)/, roles: ["customer-admin", "finance", "sales", "operations", "viewer", "super-admin"] },
  { matches: /^\/dashboard\/demo-pack\/.+/, roles: ["customer-admin", "finance", "sales", "operations", "viewer", "super-admin"] },
  { matches: /^\/dashboard(?:\/)?$/, roles: ["customer-admin", "finance", "sales", "operations", "viewer", "super-admin"] },
];

export function canAccessPath(session: AppSession, pathname: string) {
  const matchingRule = PATH_ACCESS_RULES.find((rule) => rule.matches.test(pathname));
  if (!matchingRule) return true;
  return matchingRule.roles.includes(session.role);
}

const ACTION_RULES: Record<AppAction, AppRole[]> = {
  "lead.manage": ["customer-admin", "sales", "super-admin"],
  "lead.enrich": ["customer-admin", "sales", "super-admin"],
  "finance.sendQuote": ["customer-admin", "finance", "super-admin"],
  "finance.recordDeposit": ["customer-admin", "finance", "super-admin"],
  "finance.export": ["customer-admin", "finance", "super-admin"],
  "booking.releaseGuestPack": ["customer-admin", "operations", "super-admin"],
  "artifact.invoiceManage": ["customer-admin", "finance", "super-admin"],
  "artifact.travelerDispatch": ["customer-admin", "operations", "super-admin"],
  "team.invite": ["customer-admin", "super-admin"],
  "team.bulkInvite": ["customer-admin", "super-admin"],
  "team.employeeSave": ["customer-admin", "super-admin"],
  "team.whiteLabel": ["customer-admin", "super-admin"],
};

export function canPerformAction(session: AppSession | null, action: AppAction) {
  if (!session) return false;
  return ACTION_RULES[action].includes(session.role);
}

export function createTenantAdminSession(displayName: string, tenantName: string) {
  return createTenantRoleSession(displayName, tenantName, "customer-admin");
}

export function createTenantRoleSession(displayName: string, tenantName: string, role: Exclude<AppRole, "super-admin">) {
  const normalizedTenant = tenantName.trim() || "nama-demo";
  const normalizedEmail =
    `${displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "workspace.operator"}@${normalizedTenant
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) || "tenant"}.demo`;

  return createAppSession({
    email: normalizedEmail,
    displayName,
    role,
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
