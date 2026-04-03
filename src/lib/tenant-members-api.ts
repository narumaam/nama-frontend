import { apiUrl, getApiBaseUrl } from "@/lib/api";

export type TenantMemberApiRecord = {
  id: string;
  tenant_name: string;
  name: string;
  email: string;
  role: "customer-admin" | "sales" | "finance" | "operations" | "viewer";
  designation: string;
  team: string;
  status: "Seeded" | "Invited" | "Active";
  source: "tenant-profile" | "employee-directory" | "accepted-invite" | "manual" | "backend-demo";
};

export type TenantMembersApiResponse = {
  tenant_name: string;
  source: "backend-demo";
  members: TenantMemberApiRecord[];
};

export type PromoteInvitePayload = {
  tenant_name: string;
  invite_id: string;
  name: string;
  email: string;
  role: TenantMemberApiRecord["role"];
  designation: string;
  team: string;
};

function ensureTenantMembersApiConfigured() {
  if (!getApiBaseUrl()) {
    throw new Error("Tenant members API is not configured");
  }
}

export async function fetchTenantMembers(tenantName: string) {
  ensureTenantMembersApiConfigured();
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

export async function promoteInviteMember(payload: PromoteInvitePayload) {
  ensureTenantMembersApiConfigured();
  const response = await fetch(apiUrl("/tenant-members/promote"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Tenant member promotion failed: ${response.status}`);
  }

  return (await response.json()) as TenantMemberApiRecord;
}
