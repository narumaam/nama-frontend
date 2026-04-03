"use client";

import { useEffect, useState } from "react";

import { getDemoEventsEventName, readDemoEventLog, type DemoEventRecord } from "@/lib/demo-events";

export function useDemoEvents() {
  const [events, setEvents] = useState<DemoEventRecord[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(readDemoEventLog());

    refresh();
    const eventName = getDemoEventsEventName();
    window.addEventListener(eventName, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return events;
}
