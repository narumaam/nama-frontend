import { apiUrl } from "@/lib/api";
import {
  type TenantSessionContract,
  type TenantSessionCreatePayload,
} from "@/lib/tenant-contracts";

export async function issueTenantSession(payload: TenantSessionCreatePayload) {
  const response = await fetch(apiUrl("/sessions/tenant"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Tenant session issuance failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as TenantSessionContract;
}

export async function issueSuperAdminSession(payload: { email: string; display_name?: string; access_code?: string }) {
  const response = await fetch(apiUrl("/sessions/super-admin"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...payload,
      scope: "platform",
      tenant_name: null,
    }),
  });

  if (!response.ok) {
    let detail = `Super admin session issuance failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as TenantSessionContract;
}
