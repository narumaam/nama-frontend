"use client";

import { useEffect, useState } from "react";

import { readDemoProfile } from "@/lib/demo-profile";
import { getDemoMembersEventName, readDemoMemberRegistryState, syncTenantMembersFromApi, type DemoMemberRegistryState } from "@/lib/demo-members";

export function useDemoMembers() {
  const [members, setMembers] = useState<DemoMemberRegistryState>(() => readDemoMemberRegistryState());

  useEffect(() => {
    const profile = readDemoProfile();
    let cancelled = false;

    function syncMembers() {
      setMembers(readDemoMemberRegistryState());
    }

    syncMembers();
    void syncTenantMembersFromApi(profile.company)
      .then((nextMembers) => {
        if (!cancelled) {
          setMembers(nextMembers);
        }
      })
      .catch(() => {
        syncMembers();
      });

    window.addEventListener("storage", syncMembers);
    window.addEventListener(getDemoMembersEventName(), syncMembers as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncMembers);
      window.removeEventListener(getDemoMembersEventName(), syncMembers as EventListener);
    };
  }, []);

  return members;
}
