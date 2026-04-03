import { NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { upsertTenantMember } from "@/lib/demo-api-store";
import { type TenantMembersUpsertPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantMembersUpsertPayload;

  if (!payload.tenant_name || !payload.member?.email || !payload.member?.name) {
    return NextResponse.json({ detail: "tenant_name, member.name, and member.email are required" }, { status: 400 });
  }

  const isBootstrapAdmin = payload.member.role === "customer-admin" && payload.member.source === "tenant-profile";
  if (!isBootstrapAdmin) {
    const session = await requireRouteSession({
      tenantName: payload.tenant_name,
      allowedRoles: ["customer-admin", "super-admin"],
    });
    if (session instanceof NextResponse) {
      return session;
    }
  }

  return NextResponse.json(upsertTenantMember(payload));
}
