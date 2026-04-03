import { NextResponse } from "next/server";

import { acceptTenantInvite, isDemoApiStoreError } from "@/lib/demo-api-store";
import { type TenantInviteAcceptPayload } from "@/lib/tenant-contracts";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TenantInviteAcceptPayload;

    if (!payload.tenant_name || !payload.invite_id || !payload.invite_token || !payload.access_code) {
      return NextResponse.json(
        { detail: "tenant_name, invite_id, invite_token, and access_code are required" },
        { status: 400 },
      );
    }

    const result = acceptTenantInvite(payload);
    if (!result) {
      return NextResponse.json({ detail: "Invite not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (isDemoApiStoreError(error)) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    return NextResponse.json({ detail: "Tenant invite acceptance failed" }, { status: 500 });
  }
}
