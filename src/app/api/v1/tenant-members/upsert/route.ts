import { NextResponse } from "next/server";

import { upsertTenantMember } from "@/lib/demo-api-store";
import { type TenantMembersUpsertPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantMembersUpsertPayload;

  if (!payload.tenant_name || !payload.member?.email || !payload.member?.name) {
    return NextResponse.json({ detail: "tenant_name, member.name, and member.email are required" }, { status: 400 });
  }

  return NextResponse.json(upsertTenantMember(payload));
}
