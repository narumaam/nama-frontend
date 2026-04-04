"use client";

import { useEffect, useState } from "react";

import {
  getDemoWorkflowEventName,
  readDemoWorkflowState,
  syncDemoWorkflowFromApi,
  syncTenantInvitesFromApi,
  type DemoWorkflowState,
} from "@/lib/demo-workflow";
import { readDemoProfile } from "@/lib/demo-profile";

export function useDemoWorkflow() {
  const [workflow, setWorkflow] = useState<DemoWorkflowState>(() => readDemoWorkflowState());

  useEffect(() => {
    const profile = readDemoProfile();
    let cancelled = false;

    function refreshWorkflow() {
      setWorkflow(readDemoWorkflowState());
    }

    refreshWorkflow();
    void Promise.all([syncTenantInvitesFromApi(profile.company), syncDemoWorkflowFromApi(profile.company)])
      .then(([, nextWorkflow]) => {
        if (!cancelled) {
          setWorkflow(nextWorkflow);
        }
      })
      .catch(() => {
        refreshWorkflow();
      });

    window.addEventListener("storage", refreshWorkflow);
    window.addEventListener(getDemoWorkflowEventName(), refreshWorkflow as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", refreshWorkflow);
      window.removeEventListener(getDemoWorkflowEventName(), refreshWorkflow as EventListener);
    };
  }, []);

  return workflow;
}
