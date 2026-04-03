import { apiUrl } from "@/lib/api";
import {
  type TenantInviteAcceptPayload,
  type TenantInviteContract,
  type TenantInviteCreatePayload,
  type TenantInvitesBulkCreatePayload,
} from "@/lib/tenant-contracts";

export type TenantInviteApiRecord = TenantInviteContract;

export type TenantInvitesApiResponse = {
  tenant_name: string;
  source: "local-demo" | "backend-demo";
  invites: TenantInviteApiRecord[];
};

export async function fetchTenantInvites(tenantName: string) {
  const response = await fetch(`${apiUrl("/tenant-invites")}?tenant_name=${encodeURIComponent(tenantName)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tenant invites request failed: ${response.status}`);
  }

  return (await response.json()) as TenantInvitesApiResponse;
}

export async function createTenantInvite(payload: TenantInviteCreatePayload) {
  const response = await fetch(apiUrl("/tenant-invites"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Tenant invite creation failed: ${response.status}`);
  }

  return (await response.json()) as TenantInviteApiRecord;
}

export async function bulkCreateTenantInvites(payload: TenantInvitesBulkCreatePayload) {
  const response = await fetch(apiUrl("/tenant-invites/bulk"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Tenant invite bulk creation failed: ${response.status}`);
  }

  return (await response.json()) as { tenant_name: string; invites: TenantInviteApiRecord[] };
}

export async function acceptTenantInvite(payload: TenantInviteAcceptPayload) {
  const response = await fetch(apiUrl("/tenant-invites/accept"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Tenant invite acceptance failed: ${response.status}`);
  }

  return (await response.json()) as {
    tenant_name: string;
    invite: TenantInviteApiRecord;
    member: import("@/lib/tenant-contracts").TenantMemberContract;
  };
}
