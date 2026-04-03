import { apiUrl } from "@/lib/api";
import { createApiAuthHeaders } from "@/lib/api-auth";
import {
  type TenantMemberContract,
  type TenantMembersBulkUpsertPayload,
  type TenantMembersUpsertPayload,
  type TenantInvitePromotionPayload,
} from "@/lib/tenant-contracts";

export type TenantMemberApiRecord = TenantMemberContract;

export type TenantMembersApiResponse = {
  tenant_name: string;
  source: "local-demo" | "backend-demo";
  members: TenantMemberApiRecord[];
};

export async function fetchTenantMembers(tenantName: string) {
  const response = await fetch(`${apiUrl("/tenant-members")}?tenant_name=${encodeURIComponent(tenantName)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tenant members request failed: ${response.status}`);
  }

  return (await response.json()) as TenantMembersApiResponse;
}

export async function promoteInviteMember(payload: TenantInvitePromotionPayload) {
  const response = await fetch(apiUrl("/tenant-members/promote"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Tenant member promotion failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as TenantMemberApiRecord;
}

export async function upsertTenantMember(payload: TenantMembersUpsertPayload) {
  const response = await fetch(apiUrl("/tenant-members/upsert"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Tenant member upsert failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as TenantMemberApiRecord;
}

export async function bulkUpsertTenantMembers(payload: TenantMembersBulkUpsertPayload) {
  const response = await fetch(apiUrl("/tenant-members/bulk"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Tenant member bulk upsert failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as { tenant_name: string; members: TenantMemberApiRecord[] };
}
