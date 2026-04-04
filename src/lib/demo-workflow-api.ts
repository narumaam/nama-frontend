import { apiUrl } from "@/lib/api";
import { createApiAuthHeaders } from "@/lib/api-auth";
import {
  type DemoWorkflowSyncResponse,
  type DemoWorkflowUpdatePayload,
} from "@/lib/demo-workflow-contracts";

export async function fetchDemoWorkflowCases(tenantName: string) {
  const response = await fetch(`${apiUrl("/demo/workflow")}?tenant_name=${encodeURIComponent(tenantName)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Demo workflow request failed: ${response.status}`);
  }

  return (await response.json()) as DemoWorkflowSyncResponse;
}

export async function applyDemoWorkflowAction(payload: DemoWorkflowUpdatePayload) {
  const response = await fetch(apiUrl("/demo/workflow"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Demo workflow update failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as DemoWorkflowSyncResponse;
}
