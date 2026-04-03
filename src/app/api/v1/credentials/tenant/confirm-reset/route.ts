import { NextResponse } from "next/server";

import { confirmTenantCredentialReset, isDemoApiStoreError } from "@/lib/demo-api-store";
import { type TenantCredentialResetConfirmPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TenantCredentialResetConfirmPayload;

    if (!payload.tenant_name || !payload.email || !payload.reset_token || !payload.access_code || payload.scope !== "tenant") {
      return NextResponse.json(
        { detail: "tenant_name, email, reset_token, access_code, and tenant scope are required" },
        { status: 400 },
      );
    }

    return NextResponse.json(confirmTenantCredentialReset({
      tenant_name: payload.tenant_name,
      email: payload.email,
      scope: "tenant",
      reset_token: payload.reset_token,
      access_code: payload.access_code,
    }));
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    return NextResponse.json({ detail: "Tenant credential reset confirmation failed" }, { status: 500 });
  }
}
