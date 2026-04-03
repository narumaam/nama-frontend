import { NextResponse } from "next/server";

import { isDemoApiStoreError, issueSuperAdminSession, listSuperAdminSessions } from "@/lib/demo-api-store";

export async function GET() {
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

    return NextResponse.json(issueSuperAdminSession(payload));
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    return NextResponse.json({ detail: "Super admin session issuance failed" }, { status: 500 });
  }
}
