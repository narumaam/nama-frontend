import { NextRequest, NextResponse } from "next/server";

import { isDemoApiStoreError, issueTenantSession, listTenantSessions } from "@/lib/demo-api-store";
import { type TenantSessionCreatePayload } from "@/lib/tenant-contracts";

export async function GET(request: NextRequest) {
  const tenantName = request.nextUrl.searchParams.get("tenant_name");
  return NextResponse.json({
    tenant_name: tenantName?.trim() || "NAMA Demo",
    sessions: listTenantSessions(tenantName),
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TenantSessionCreatePayload;

    if (!payload.email || !payload.scope) {
      return NextResponse.json({ detail: "email and scope are required" }, { status: 400 });
    }

    return NextResponse.json(issueTenantSession(payload));
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    return NextResponse.json({ detail: "Tenant session issuance failed" }, { status: 500 });
  }
}
