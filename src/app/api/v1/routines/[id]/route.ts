import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://intuitive-blessing-production-30de.up.railway.app";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const err = requireApiKey(req);
  if (err) return err;
  const res = await fetch(`${BACKEND}/api/v1/routines/${params.id}`, {
    headers: { "Authorization": req.headers.get("authorization") ?? "", "X-Api-Key": req.headers.get("x-api-key") ?? "" },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const err = requireApiKey(req);
  if (err) return err;
  const body = await req.json();
  const res = await fetch(`${BACKEND}/api/v1/routines/${params.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": req.headers.get("authorization") ?? "", "X-Api-Key": req.headers.get("x-api-key") ?? "" },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const err = requireApiKey(req);
  if (err) return err;
  const res = await fetch(`${BACKEND}/api/v1/routines/${params.id}`, {
    method: "DELETE",
    headers: { "Authorization": req.headers.get("authorization") ?? "", "X-Api-Key": req.headers.get("x-api-key") ?? "" },
  });
  return new NextResponse(null, { status: res.status });
}
