import { NextRequest, NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { listTenantAuthAudit } from "@/lib/demo-api-store";

export async function GET(request: NextRequest) {
  const tenantName = request.nextUrl.searchParams.get("tenant_name");
  if (!tenantName) {
    return NextResponse.json({ detail: "tenant_name is required" }, { status: 400 });
  }

  const session = await requireRouteSession({
    tenantName,
    allowedRoles: ["customer-admin", "super-admin"],
  });
  if (session instanceof NextResponse) {
    return session;
  }

  return NextResponse.json({
    tenant_name: tenantName,
    events: listTenantAuthAudit(tenantName),
  });
}
