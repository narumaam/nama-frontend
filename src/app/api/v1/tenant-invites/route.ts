import { NextRequest, NextResponse } from "next/server";

import { createTenantInvite, listTenantInvites } from "@/lib/demo-api-store";
import { type TenantInviteCreatePayload } from "@/lib/tenant-contracts";

export async function GET(request: NextRequest) {
  const tenantName = request.nextUrl.searchParams.get("tenant_name");
  return NextResponse.json({
    tenant_name: tenantName?.trim() || "NAMA Demo",
    source: "local-demo",
    invites: listTenantInvites(tenantName),
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantInviteCreatePayload;

  if (!payload.tenant_name || !payload.invite?.name || !payload.invite?.email) {
    return NextResponse.json({ detail: "tenant_name, invite.name, and invite.email are required" }, { status: 400 });
  }

  return NextResponse.json(createTenantInvite(payload));
}
