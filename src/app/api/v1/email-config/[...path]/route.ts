import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://intuitive-blessing-production-30de.up.railway.app";

/**
 * Catch-all proxy for sub-paths under /api/v1/email-config/:
 *   POST /api/v1/email-config/test-smtp
 *   POST /api/v1/email-config/test-imap
 *   POST /api/v1/email-config/poll-replies
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const err = requireApiKey(req);
  if (err) return err;

  const subPath = params.path.join("/");
  const res = await fetch(`${BACKEND}/api/v1/email-config/${subPath}`, {
    headers: {
      Authorization: req.headers.get("authorization") ?? "",
      "X-Api-Key": req.headers.get("x-api-key") ?? "",
    },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const err = requireApiKey(req);
  if (err) return err;

  const subPath = params.path.join("/");

  // Some sub-paths (test-smtp, test-imap, poll-replies) send no body
  let bodyInit: BodyInit | undefined;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      bodyInit = JSON.stringify(await req.json());
    } catch {
      bodyInit = undefined;
    }
  }

  const res = await fetch(`${BACKEND}/api/v1/email-config/${subPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("authorization") ?? "",
      "X-Api-Key": req.headers.get("x-api-key") ?? "",
    },
    body: bodyInit,
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const err = requireApiKey(req);
  if (err) return err;

  const subPath = params.path.join("/");
  const res = await fetch(`${BACKEND}/api/v1/email-config/${subPath}`, {
    method: "DELETE",
    headers: {
      Authorization: req.headers.get("authorization") ?? "",
      "X-Api-Key": req.headers.get("x-api-key") ?? "",
    },
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}
