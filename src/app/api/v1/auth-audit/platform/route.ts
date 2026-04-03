import { NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { listPlatformAuthAudit } from "@/lib/demo-api-store";

export async function GET() {
  const session = await requireRouteSession({
    tenantName: null,
    allowedRoles: ["super-admin"],
  });
  if (session instanceof NextResponse) {
    return session;
  }

  return NextResponse.json({
    events: listPlatformAuthAudit(),
  });
}
