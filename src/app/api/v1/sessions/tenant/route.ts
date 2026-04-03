import { NextRequest, NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { isDemoApiStoreError, issueTenantSession, listTenantSessions } from "@/lib/demo-api-store";
import { APP_SESSION_COOKIE, getSessionCookieOptions, serializeSessionCookie } from "@/lib/session-cookie";
import { type TenantSessionCreatePayload } from "@/lib/tenant-contracts";

export async function GET(request: NextRequest) {
  const tenantName = request.nextUrl.searchParams.get("tenant_name");
  const session = await requireRouteSession({
    tenantName,
    allowedRoles: ["customer-admin", "super-admin"],
  });
  if (session instanceof NextResponse) {
    return session;
  }
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

    const session = issueTenantSession(payload);
    const response = NextResponse.json(session);
    response.cookies.set({
      name: APP_SESSION_COOKIE,
      value: serializeSessionCookie(session),
      ...getSessionCookieOptions(),
    });
    return response;
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    return NextResponse.json({ detail: "Tenant session issuance failed" }, { status: 500 });
  }
}
