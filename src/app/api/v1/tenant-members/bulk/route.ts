import { NextResponse } from "next/server";

import { bulkUpsertTenantMembers } from "@/lib/demo-api-store";
import { type TenantMembersBulkUpsertPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantMembersBulkUpsertPayload;

  if (!payload.tenant_name || !Array.isArray(payload.members)) {
    return NextResponse.json({ detail: "tenant_name and members are required" }, { status: 400 });
  }

  return NextResponse.json(bulkUpsertTenantMembers(payload));
}
