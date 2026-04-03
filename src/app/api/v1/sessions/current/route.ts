import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { APP_SESSION_COOKIE, parseSessionCookie } from "@/lib/session-cookie";

export async function GET() {
  const cookieStore = await cookies();
  const session = parseSessionCookie(cookieStore.get(APP_SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.json({ detail: "No active session" }, { status: 401 });
  }

  return NextResponse.json(session);
}
