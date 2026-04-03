import {
  type TenantSessionContract,
  type TenantSessionCreatePayload,
} from "@/lib/tenant-contracts";
import { createApiAuthHeaders } from "@/lib/api-auth";
import { normalizeTenantRole } from "@/lib/auth-session";
import { type AppSession } from "@/lib/auth-session";

const SESSION_API_BASE = "/api/v1/sessions";

function sessionApiUrl(path: string) {
  return `${SESSION_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function issueTenantSession(payload: TenantSessionCreatePayload) {
  const response = await fetch(sessionApiUrl("/tenant"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "same-origin",
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
  const response = await fetch(sessionApiUrl("/super-admin"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "same-origin",
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

export async function fetchCurrentSession() {
  const response = await fetch(sessionApiUrl("/current"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Current session request failed: ${response.status}`);
  }

  return (await response.json()) as TenantSessionContract;
}

export async function fetchTenantSessions(tenantName: string) {
  const response = await fetch(`${sessionApiUrl("/tenant")}?tenant_name=${encodeURIComponent(tenantName)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tenant sessions request failed: ${response.status}`);
  }

  return (await response.json()) as { tenant_name: string; sessions: TenantSessionContract[] };
}

export async function revokeTenantSession(payload: { tenant_name: string; session_id: string }) {
  const response = await fetch(sessionApiUrl("/tenant/revoke"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Tenant session revoke failed: ${response.status}`);
  }

  return (await response.json()) as { ok: boolean };
}

export async function fetchSuperAdminSessions() {
  const response = await fetch(sessionApiUrl("/super-admin"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Super Admin sessions request failed: ${response.status}`);
  }

  return (await response.json()) as { sessions: TenantSessionContract[] };
}

export async function revokeSuperAdminSession(payload: { session_id: string }) {
  const response = await fetch(sessionApiUrl("/super-admin/revoke"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Super Admin session revoke failed: ${response.status}`);
  }

  return (await response.json()) as { ok: boolean };
}

export async function clearServerSession() {
  const response = await fetch(sessionApiUrl("/logout"), {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Session logout failed: ${response.status}`);
  }
}

export function appSessionFromContract(session: TenantSessionContract): AppSession {
  if (session.role === "super-admin") {
    return {
      email: session.email,
      displayName: session.display_name,
      role: "super-admin",
      scope: "platform",
      tenantName: null,
      accessToken: session.id,
      issuedBy: "api-issued",
      source: "beta-foundation",
      grantedAt: session.granted_at,
    };
  }

  return {
    email: session.email,
    displayName: session.display_name,
    role: normalizeTenantRole(session.role),
    scope: "tenant",
    tenantName: session.tenant_name || "NAMA Demo",
    memberId: session.member_id ?? null,
    memberStatus: session.member_status ?? null,
    designation: session.designation ?? null,
    team: session.team ?? null,
    accessToken: session.id,
    issuedBy: "api-issued",
    source: "beta-foundation",
    grantedAt: session.granted_at,
  };
}
