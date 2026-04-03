"use client";

import { useEffect, useState } from "react";

import { clearAppSession, readAppSession, type AppSession, writeAppSession } from "@/lib/auth-session";
import { appSessionFromContract, fetchCurrentSession } from "@/lib/session-api";

export function useAppSession() {
  const [session, setSession] = useState<AppSession | null>(() => readAppSession());

  useEffect(() => {
    async function syncSessionFromServer() {
      try {
        const current = await fetchCurrentSession();
        if (!current) {
          clearAppSession();
          setSession(null);
          return;
        }

        const nextSession = writeAppSession(appSessionFromContract(current), { dispatch: false });
        setSession(nextSession);
      } catch {
        setSession(readAppSession());
      }
    }

    function syncSessionFromStorage() {
      setSession(readAppSession());
    }

    void syncSessionFromServer();
    window.addEventListener("storage", syncSessionFromStorage);
    window.addEventListener("nama-app-session-updated", syncSessionFromStorage as EventListener);

    return () => {
      window.removeEventListener("storage", syncSessionFromStorage);
      window.removeEventListener("nama-app-session-updated", syncSessionFromStorage as EventListener);
    };
  }, []);

  return session;
}
