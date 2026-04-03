import { NextResponse } from "next/server";

import { bulkCreateTenantInvites } from "@/lib/demo-api-store";
import { type TenantInvitesBulkCreatePayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantInvitesBulkCreatePayload;

  if (!payload.tenant_name || !Array.isArray(payload.invites)) {
    return NextResponse.json({ detail: "tenant_name and invites are required" }, { status: 400 });
  }

  return NextResponse.json(bulkCreateTenantInvites(payload));
}
