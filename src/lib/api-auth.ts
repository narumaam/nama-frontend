"use client";

import { readAppSession } from "@/lib/auth-session";

export function createApiAuthHeaders() {
  const session = readAppSession();
  if (!session?.accessToken) {
    return {} as Record<string, string>;
  }

  return {
    "x-nama-session-id": session.accessToken,
  } as Record<string, string>;
}
