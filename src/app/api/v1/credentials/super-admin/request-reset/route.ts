import { NextResponse } from "next/server";

import { isDemoApiStoreError, requestSuperAdminCredentialReset } from "@/lib/demo-api-store";
import { type TenantCredentialResetRequestPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TenantCredentialResetRequestPayload;

    if (!payload.email || payload.scope !== "platform") {
      return NextResponse.json({ detail: "email and platform scope are required" }, { status: 400 });
    }

    return NextResponse.json(requestSuperAdminCredentialReset({
      email: payload.email,
      scope: "platform",
    }));
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    return NextResponse.json({ detail: "Super Admin credential reset request failed" }, { status: 500 });
  }
}
