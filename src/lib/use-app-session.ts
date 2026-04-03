"use client";

import { useEffect, useState } from "react";

import { readAppSession, type AppSession } from "@/lib/auth-session";

export function useAppSession() {
  const [session, setSession] = useState<AppSession | null>(() => readAppSession());

  useEffect(() => {
    function syncSession() {
      setSession(readAppSession());
    }

    window.addEventListener("storage", syncSession);
    window.addEventListener("nama-app-session-updated", syncSession as EventListener);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("nama-app-session-updated", syncSession as EventListener);
    };
  }, []);

  return session;
}
