import { createHmac, timingSafeEqual } from "node:crypto";

import { type TenantSessionContract } from "@/lib/tenant-contracts";

export const APP_SESSION_COOKIE = "nama.app_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function isLocalAuthPreviewEnv() {
  const appEnv = process.env.NAMA_ENV?.trim().toLowerCase();
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  return appEnv === "development" || appEnv === "dev" || appEnv === "local" || appEnv === "test" || appEnv === "testing" || nodeEnv !== "production";
}

function getSessionCookieSecret() {
  const configuredSecret = process.env.SESSION_COOKIE_SECRET?.trim() || process.env.SECRET_KEY?.trim();
  if (configuredSecret) return configuredSecret;
  if (isLocalAuthPreviewEnv()) return "dev-only-session-cookie-secret";
  throw new Error("SESSION_COOKIE_SECRET or SECRET_KEY must be configured outside local preview environments");
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionCookieSecret()).update(payload).digest("base64url");
}

export function serializeSessionCookie(session: TenantSessionContract) {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function getSessionCookieOptions() {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  const secure = nodeEnv === "production" || process.env.NAMA_FORCE_SECURE_COOKIE?.trim().toLowerCase() === "true";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function parseSessionCookie(value?: string | null) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(payload)) as TenantSessionContract;
  } catch {
    return null;
  }
}
