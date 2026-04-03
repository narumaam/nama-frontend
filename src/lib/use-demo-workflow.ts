"use client";

import { useEffect, useState } from "react";

import { getDemoWorkflowEventName, readDemoWorkflowState, type DemoWorkflowState } from "@/lib/demo-workflow";

export function useDemoWorkflow() {
  const [workflow, setWorkflow] = useState<DemoWorkflowState>(() => readDemoWorkflowState());

  useEffect(() => {
    function refreshWorkflow() {
      setWorkflow(readDemoWorkflowState());
    }

    window.addEventListener("storage", refreshWorkflow);
    window.addEventListener(getDemoWorkflowEventName(), refreshWorkflow as EventListener);

    return () => {
      window.removeEventListener("storage", refreshWorkflow);
      window.removeEventListener(getDemoWorkflowEventName(), refreshWorkflow as EventListener);
    };
  }, []);

  return workflow;
}
