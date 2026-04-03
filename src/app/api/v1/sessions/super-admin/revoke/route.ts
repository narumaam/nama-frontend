import { NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { isDemoApiStoreError, revokeSuperAdminSession } from "@/lib/demo-api-store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { session_id: string };
    if (!payload.session_id) {
      return NextResponse.json({ detail: "session_id is required" }, { status: 400 });
    }

    const session = await requireRouteSession({
      tenantName: null,
      allowedRoles: ["super-admin"],
    });
    if (session instanceof NextResponse) {
      return session;
    }

    return NextResponse.json(revokeSuperAdminSession(payload));
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    return NextResponse.json({ detail: "Super Admin session revoke failed" }, { status: 500 });
  }
}
