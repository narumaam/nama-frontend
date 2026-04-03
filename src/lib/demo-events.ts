import { DEMO_PROFILE_STORAGE_KEYS } from "@/lib/demo-config";

export type DemoEventSeverity = "info" | "success" | "warning";

export type DemoEventRecord = {
  id: string;
  title: string;
  detail: string;
  tenant: string;
  createdAt: string;
  type: string;
  severity: DemoEventSeverity;
  caseSlug?: string;
  path?: string;
};

const DEMO_EVENTS_UPDATED = "nama-demo-events-updated";

function readJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function persistEvents(events: DemoEventRecord[]) {
  if (typeof window === "undefined") return events;
  window.localStorage.setItem(DEMO_PROFILE_STORAGE_KEYS.events, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent(DEMO_EVENTS_UPDATED, { detail: events }));
  return events;
}

export function getDemoEventsEventName() {
  return DEMO_EVENTS_UPDATED;
}

export function readDemoEventLog() {
  if (typeof window === "undefined") return [] as DemoEventRecord[];
  return readJson<DemoEventRecord[]>(window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEYS.events), []);
}

export function replaceDemoEventLog(events: DemoEventRecord[]) {
  return persistEvents(events);
}

export function appendDemoEvent(input: Omit<DemoEventRecord, "id" | "createdAt"> & { createdAt?: string }) {
  const nextEvent: DemoEventRecord = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt:
      input.createdAt ||
      new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    ...input,
  };

  return persistEvents([nextEvent, ...readDemoEventLog()].slice(0, 60));
}
