import { apiUrl } from "@/lib/api";
import { createApiAuthHeaders } from "@/lib/api-auth";

export type AuthAuditEvent = {
  id: string;
  tenant_name: string | null;
  actor_email: string | null;
  subject_email: string | null;
  scope: "tenant" | "platform";
  category: "session" | "credential" | "invite" | "member";
  action: string;
  detail: string;
  created_at: string;
};

export async function fetchTenantAuthAudit(tenantName: string) {
  const response = await fetch(`${apiUrl("/auth-audit/tenant")}?tenant_name=${encodeURIComponent(tenantName)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tenant auth audit request failed: ${response.status}`);
  }

  return (await response.json()) as { tenant_name: string; events: AuthAuditEvent[] };
}

export async function fetchPlatformAuthAudit() {
  const response = await fetch(apiUrl("/auth-audit/platform"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Platform auth audit request failed: ${response.status}`);
  }

  return (await response.json()) as { events: AuthAuditEvent[] };
}
