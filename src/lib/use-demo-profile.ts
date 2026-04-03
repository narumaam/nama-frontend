"use client";

import { useEffect, useState } from "react";

import { readDemoProfile, type DemoProfile } from "@/lib/demo-profile";

export function useDemoProfile() {
  const [profile, setProfile] = useState<DemoProfile>(() => readDemoProfile());

  useEffect(() => {
    function refreshProfile() {
      setProfile(readDemoProfile());
    }

    window.addEventListener("storage", refreshProfile);
    window.addEventListener("nama-demo-profile-updated", refreshProfile as EventListener);

    return () => {
      window.removeEventListener("storage", refreshProfile);
      window.removeEventListener("nama-demo-profile-updated", refreshProfile as EventListener);
    };
  }, []);

  return profile;
}
