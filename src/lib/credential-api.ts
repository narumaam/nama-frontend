import { apiUrl } from "@/lib/api";
import {
  type TenantCredentialResetConfirmPayload,
  type TenantCredentialResetRequestPayload,
  type TenantCredentialResetResponse,
} from "@/lib/tenant-contracts";

const CREDENTIAL_API_BASE = apiUrl("/credentials");

function credentialApiUrl(path: string) {
  return `${CREDENTIAL_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseCredentialError(response: Response, fallback: string) {
  let detail = fallback;
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) {
      detail = body.detail;
    }
  } catch {}
  throw new Error(detail);
}

export async function requestTenantCredentialReset(payload: TenantCredentialResetRequestPayload) {
  const response = await fetch(credentialApiUrl("/tenant/request-reset"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await parseCredentialError(response, `Tenant credential reset request failed: ${response.status}`);
  }

  return (await response.json()) as TenantCredentialResetResponse;
}

export async function confirmTenantCredentialReset(payload: TenantCredentialResetConfirmPayload) {
  const response = await fetch(credentialApiUrl("/tenant/confirm-reset"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await parseCredentialError(response, `Tenant credential reset confirmation failed: ${response.status}`);
  }

  return (await response.json()) as { ok: boolean; email: string; scope: "tenant"; tenant_name: string };
}

export async function requestSuperAdminCredentialReset(payload: TenantCredentialResetRequestPayload) {
  const response = await fetch(credentialApiUrl("/super-admin/request-reset"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await parseCredentialError(response, `Super Admin credential reset request failed: ${response.status}`);
  }

  return (await response.json()) as TenantCredentialResetResponse;
}

export async function confirmSuperAdminCredentialReset(payload: TenantCredentialResetConfirmPayload) {
  const response = await fetch(credentialApiUrl("/super-admin/confirm-reset"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await parseCredentialError(response, `Super Admin credential reset confirmation failed: ${response.status}`);
  }

  return (await response.json()) as { ok: boolean; email: string; scope: "platform"; tenant_name: null };
}
