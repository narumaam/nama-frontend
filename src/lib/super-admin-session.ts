export const SUPER_ADMIN_SESSION_KEY = "nama.superAdminSession";
export const SUPER_ADMIN_DEMO_EMAIL = "control@nama.internal";
export const SUPER_ADMIN_DEMO_CODE = "NAMA-ALPHA";

export type SuperAdminSession = {
  email: string;
  grantedAt: string;
  mode: "alpha-demo";
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readSuperAdminSession(): SuperAdminSession | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(SUPER_ADMIN_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SuperAdminSession;
  } catch {
    window.localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    return null;
  }
}

export function hasSuperAdminSession() {
  return Boolean(readSuperAdminSession());
}

export function createSuperAdminSession(email: string) {
  if (!canUseStorage()) return null;
  const session: SuperAdminSession = {
    email,
    grantedAt: new Date().toISOString(),
    mode: "alpha-demo",
  };
  window.localStorage.setItem(SUPER_ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSuperAdminSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}

export function validateSuperAdminCredentials(email: string, accessCode: string) {
  return email.trim().toLowerCase() === SUPER_ADMIN_DEMO_EMAIL && accessCode.trim() === SUPER_ADMIN_DEMO_CODE;
}
