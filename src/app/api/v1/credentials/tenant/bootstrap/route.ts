import { NextResponse } from "next/server";

import { bootstrapTenantCredential, isDemoApiStoreError } from "@/lib/demo-api-store";
import { type TenantCredentialBootstrapPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TenantCredentialBootstrapPayload;

    if (!payload.tenant_name || !payload.email || !payload.access_code || payload.scope !== "tenant") {
      return NextResponse.json(
        { detail: "tenant_name, email, access_code, and tenant scope are required" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      bootstrapTenantCredential({
        tenant_name: payload.tenant_name,
        email: payload.email,
        access_code: payload.access_code,
        scope: "tenant",
      }),
    );
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    return NextResponse.json({ detail: "Tenant credential bootstrap failed" }, { status: 500 });
  }
}
