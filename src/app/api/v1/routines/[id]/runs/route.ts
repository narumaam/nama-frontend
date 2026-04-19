import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://intuitive-blessing-production-30de.up.railway.app";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const err = requireApiKey(req);
  if (err) return err;
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const res = await fetch(`${BACKEND}/api/v1/routines/${params.id}/runs${qs ? `?${qs}` : ""}`, {
    headers: { "Authorization": req.headers.get("authorization") ?? "", "X-Api-Key": req.headers.get("x-api-key") ?? "" },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
