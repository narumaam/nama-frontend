import { NextResponse } from "next/server";

import { confirmSuperAdminCredentialReset, isDemoApiStoreError } from "@/lib/demo-api-store";
import { type TenantCredentialResetConfirmPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TenantCredentialResetConfirmPayload;

    if (!payload.email || !payload.reset_token || !payload.access_code || payload.scope !== "platform") {
      return NextResponse.json(
        { detail: "email, reset_token, access_code, and platform scope are required" },
        { status: 400 },
      );
    }

    return NextResponse.json(confirmSuperAdminCredentialReset({
      email: payload.email,
      scope: "platform",
      reset_token: payload.reset_token,
      access_code: payload.access_code,
    }));
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    return NextResponse.json({ detail: "Super Admin credential reset confirmation failed" }, { status: 500 });
  }
}
