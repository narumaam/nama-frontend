import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { APP_SESSION_COOKIE, parseSessionCookie } from "@/lib/session-cookie";

export async function readRouteSession() {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(APP_SESSION_COOKIE)?.value);
}

export async function requireRouteSession(options?: { tenantName?: string | null; allowedRoles?: string[] }) {
  const session = await readRouteSession();
  if (!session) {
    return NextResponse.json({ detail: "No active session" }, { status: 401 });
  }

  if (
    options?.tenantName &&
    session.scope === "tenant" &&
    session.tenant_name &&
    session.tenant_name !== options.tenantName
  ) {
    return NextResponse.json({ detail: "Session does not match tenant context" }, { status: 403 });
  }

  if (options?.allowedRoles?.length && !options.allowedRoles.includes(session.role)) {
    return NextResponse.json({ detail: "Session does not have permission for this action" }, { status: 403 });
  }

  return session;
}
