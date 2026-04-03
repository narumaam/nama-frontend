import { NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { isDemoApiStoreError, issueSuperAdminSession, listSuperAdminSessions } from "@/lib/demo-api-store";
import { APP_SESSION_COOKIE, getSessionCookieOptions, serializeSessionCookie } from "@/lib/session-cookie";

export async function GET() {
  const session = await requireRouteSession({
    tenantName: null,
    allowedRoles: ["super-admin"],
  });
  if (session instanceof NextResponse) {
    return session;
  }
  return NextResponse.json({
    sessions: listSuperAdminSessions(),
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email: string; display_name?: string; access_code?: string };

    if (!payload.email) {
      return NextResponse.json({ detail: "email is required" }, { status: 400 });
    }

    const session = issueSuperAdminSession(payload);
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

    return NextResponse.json({ detail: "Super admin session issuance failed" }, { status: 500 });
  }
}
