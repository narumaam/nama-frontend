"use client";

import { useEffect, useState } from "react";

import { getDemoMembersEventName, readDemoMemberRegistryState, type DemoMemberRegistryState } from "@/lib/demo-members";

export function useDemoMembers() {
  const [members, setMembers] = useState<DemoMemberRegistryState>(() => readDemoMemberRegistryState());

  useEffect(() => {
    function syncMembers() {
      setMembers(readDemoMemberRegistryState());
    }

    window.addEventListener("storage", syncMembers);
    window.addEventListener(getDemoMembersEventName(), syncMembers as EventListener);

    return () => {
      window.removeEventListener("storage", syncMembers);
      window.removeEventListener(getDemoMembersEventName(), syncMembers as EventListener);
    };
  }, []);

  return members;
}
