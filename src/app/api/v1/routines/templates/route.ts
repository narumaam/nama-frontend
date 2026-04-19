import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://intuitive-blessing-production-30de.up.railway.app";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND}/api/v1/routines/templates`, {
      headers: { "X-Api-Key": req.headers.get("x-api-key") ?? "" },
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
