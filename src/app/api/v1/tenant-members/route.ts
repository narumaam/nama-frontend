import { NextRequest, NextResponse } from "next/server";

import { listTenantMembers } from "@/lib/demo-api-store";

export async function GET(request: NextRequest) {
  const tenantName = request.nextUrl.searchParams.get("tenant_name");
  return NextResponse.json({
    tenant_name: tenantName?.trim() || "NAMA Demo",
    source: "local-demo",
    members: listTenantMembers(tenantName),
  });
}
