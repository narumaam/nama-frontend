import { NextRequest, NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";
import { listTenantWorkflowCases, updateTenantWorkflowCase } from "@/lib/demo-api-store";
import {
  type DemoWorkflowAction,
  type DemoWorkflowUpdatePayload,
} from "@/lib/demo-workflow-contracts";

const ACTION_ALLOWED_ROLES: Record<DemoWorkflowAction, string[]> = {
  "lead.set-stage": ["customer-admin", "sales", "super-admin"],
  "finance.send-quote": ["customer-admin", "sales", "finance", "super-admin"],
  "finance.record-deposit": ["customer-admin", "finance", "super-admin"],
  "booking.release-guest-pack": ["customer-admin", "operations", "super-admin"],
  "artifact.download-invoice": ["customer-admin", "finance", "operations", "viewer", "sales", "super-admin"],
  "artifact.mark-invoice-sent": ["customer-admin", "finance", "super-admin"],
  "artifact.mark-invoice-paid": ["customer-admin", "finance", "super-admin"],
  "artifact.download-traveler-pdf": ["customer-admin", "operations", "viewer", "sales", "super-admin"],
  "artifact.approve-traveler-pdf": ["customer-admin", "operations", "super-admin"],
  "artifact.share-traveler-pdf": ["customer-admin", "operations", "super-admin"],
};

export async function GET(request: NextRequest) {
  const tenantName = request.nextUrl.searchParams.get("tenant_name")?.trim() || "NAMA Demo";
  const session = await requireRouteSession({
    tenantName,
    allowedRoles: ["customer-admin", "sales", "finance", "operations", "viewer", "super-admin"],
  });
  if (session instanceof NextResponse) {
    return session;
  }

  const response = listTenantWorkflowCases(tenantName);
  return NextResponse.json({
    tenant_name: response.tenant_name,
    source: "local-demo",
    cases: response.cases,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as DemoWorkflowUpdatePayload;
  if (!payload.tenant_name || !payload.slug || !payload.action || !payload.patch) {
    return NextResponse.json({ detail: "tenant_name, slug, action, and patch are required" }, { status: 400 });
  }

  const allowedRoles = ACTION_ALLOWED_ROLES[payload.action];
  if (!allowedRoles) {
    return NextResponse.json({ detail: "Unknown workflow action" }, { status: 400 });
  }

  const session = await requireRouteSession({
    tenantName: payload.tenant_name,
    allowedRoles,
  });
  if (session instanceof NextResponse) {
    return session;
  }

  const response = updateTenantWorkflowCase(payload);
  return NextResponse.json({
    tenant_name: response.tenant_name,
    source: "local-demo",
    cases: response.cases,
  });
}
