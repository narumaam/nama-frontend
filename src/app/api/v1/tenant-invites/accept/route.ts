import { NextResponse } from "next/server";

import { acceptTenantInvite } from "@/lib/demo-api-store";
import { type TenantInviteAcceptPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantInviteAcceptPayload;

  if (!payload.tenant_name || !payload.invite_id) {
    return NextResponse.json({ detail: "tenant_name and invite_id are required" }, { status: 400 });
  }

  const result = acceptTenantInvite(payload);
  if (!result) {
    return NextResponse.json({ detail: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
