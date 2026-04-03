import { NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { bulkUpsertTenantMembers } from "@/lib/demo-api-store";
import { type TenantMembersBulkUpsertPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantMembersBulkUpsertPayload;

  if (!payload.tenant_name || !Array.isArray(payload.members)) {
    return NextResponse.json({ detail: "tenant_name and members are required" }, { status: 400 });
  }

  const session = await requireRouteSession({
    tenantName: payload.tenant_name,
    allowedRoles: ["customer-admin", "super-admin"],
  });
  if (session instanceof NextResponse) {
    return session;
  }

  return NextResponse.json(bulkUpsertTenantMembers(payload));
}
