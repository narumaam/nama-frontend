import { NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { isDemoApiStoreError, revokeTenantSession } from "@/lib/demo-api-store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { tenant_name: string; session_id: string };
    if (!payload.tenant_name || !payload.session_id) {
      return NextResponse.json({ detail: "tenant_name and session_id are required" }, { status: 400 });
    }

    const session = await requireRouteSession({
      tenantName: payload.tenant_name,
      allowedRoles: ["customer-admin", "super-admin"],
    });
    if (session instanceof NextResponse) {
      return session;
    }

    return NextResponse.json(revokeTenantSession(payload));
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    return NextResponse.json({ detail: "Tenant session revoke failed" }, { status: 500 });
  }
}
