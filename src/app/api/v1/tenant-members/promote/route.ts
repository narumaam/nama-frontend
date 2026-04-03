import { NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { promoteTenantInviteToMember } from "@/lib/demo-api-store";
import { type TenantInvitePromotionPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantInvitePromotionPayload;

  if (!payload.tenant_name || !payload.invite_id || !payload.name || !payload.email || !payload.designation || !payload.team) {
    return NextResponse.json({ detail: "tenant_name, invite_id, name, email, designation, and team are required" }, { status: 400 });
  }

  const session = await requireRouteSession({
    tenantName: payload.tenant_name,
    allowedRoles: ["customer-admin", "super-admin"],
  });
  if (session instanceof NextResponse) {
    return session;
  }

  return NextResponse.json(promoteTenantInviteToMember(payload));
}
