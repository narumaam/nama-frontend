import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://intuitive-blessing-production-30de.up.railway.app";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const err = requireApiKey(req);
  if (err) return err;
  const res = await fetch(`${BACKEND}/api/v1/routines/${params.id}/run`, {
    method: "POST",
    headers: { "Authorization": req.headers.get("authorization") ?? "", "X-Api-Key": req.headers.get("x-api-key") ?? "" },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
