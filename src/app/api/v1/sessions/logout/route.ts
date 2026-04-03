import { NextResponse } from "next/server";

import { APP_SESSION_COOKIE, getSessionCookieOptions } from "@/lib/session-cookie";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: APP_SESSION_COOKIE,
    value: "",
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
