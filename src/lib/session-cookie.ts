import { createHmac, timingSafeEqual } from "node:crypto";

import { type TenantSessionContract } from "@/lib/tenant-contracts";

export const APP_SESSION_COOKIE = "nama.app_session";

function getSessionCookieSecret() {
  return process.env.SESSION_COOKIE_SECRET?.trim() || process.env.SECRET_KEY?.trim() || "dev-only-session-cookie-secret";
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
