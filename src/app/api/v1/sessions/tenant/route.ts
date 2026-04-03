import { NextRequest, NextResponse } from "next/server";

import { issueTenantSession, listTenantSessions } from "@/lib/demo-api-store";
import { type TenantSessionCreatePayload } from "@/lib/tenant-contracts";

export async function GET(request: NextRequest) {
  const tenantName = request.nextUrl.searchParams.get("tenant_name");
  return NextResponse.json({
    tenant_name: tenantName?.trim() || "NAMA Demo",
    sessions: listTenantSessions(tenantName),
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as TenantSessionCreatePayload;

  if (!payload.email || !payload.display_name || !payload.role || !payload.scope) {
    return NextResponse.json({ detail: "email, display_name, role, and scope are required" }, { status: 400 });
  }

  return NextResponse.json(issueTenantSession(payload));
}
