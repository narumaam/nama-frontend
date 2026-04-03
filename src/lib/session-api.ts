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
    throw new Error(`Tenant session issuance failed: ${response.status}`);
  }

  return (await response.json()) as TenantSessionContract;
}

export async function issueSuperAdminSession(payload: { email: string; display_name: string }) {
  const response = await fetch(apiUrl("/sessions/super-admin"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...payload,
      role: "super-admin",
      scope: "platform",
      tenant_name: null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Super admin session issuance failed: ${response.status}`);
  }

  return (await response.json()) as TenantSessionContract;
}
