import { NextResponse } from "next/server";

import { issueSuperAdminSession, listSuperAdminSessions } from "@/lib/demo-api-store";

export async function GET() {
  return NextResponse.json({
    sessions: listSuperAdminSessions(),
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { email: string; display_name: string };

  if (!payload.email || !payload.display_name) {
    return NextResponse.json({ detail: "email and display_name are required" }, { status: 400 });
  }

  return NextResponse.json(issueSuperAdminSession(payload));
}
