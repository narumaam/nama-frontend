import { NextResponse } from "next/server";

import { isDemoApiStoreError, requestTenantCredentialReset } from "@/lib/demo-api-store";
import { type TenantCredentialResetRequestPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TenantCredentialResetRequestPayload;

    if (!payload.tenant_name || !payload.email || payload.scope !== "tenant") {
      return NextResponse.json({ detail: "tenant_name, email, and tenant scope are required" }, { status: 400 });
    }

    return NextResponse.json(requestTenantCredentialReset({
      tenant_name: payload.tenant_name,
      email: payload.email,
      scope: "tenant",
    }));
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    return NextResponse.json({ detail: "Tenant credential reset request failed" }, { status: 500 });
  }
}
