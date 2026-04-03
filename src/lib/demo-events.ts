import { DEMO_PROFILE_STORAGE_KEYS } from "@/lib/demo-config";

export type DemoEventSeverity = "info" | "success" | "warning";

export type DemoEventRecord = {
  id: string;
  title: string;
  detail: string;
  tenant: string;
  createdAt: string;
  createdAtMs?: number;
  type: string;
  severity: DemoEventSeverity;
  caseSlug?: string;
  path?: string;
};

export type DemoEventCategory = "All" | "commercial" | "team" | "delivery";
export type DemoEventRange = "All" | "24h" | "7d" | "30d";

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
  const now = Date.now();
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
    createdAtMs: input.createdAtMs || now,
    ...input,
  };

  return persistEvents([nextEvent, ...readDemoEventLog()].slice(0, 60));
}

export function getDemoEventTimestamp(event: DemoEventRecord) {
  if (typeof event.createdAtMs === "number") return event.createdAtMs;
  const parsed = Date.parse(event.createdAt.replace(" · ", " "));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function matchesDemoEventCategory(event: DemoEventRecord, category: DemoEventCategory) {
  if (category === "All") return true;
  if (category === "team") return event.type.includes("invite");
  if (category === "commercial") return event.type.includes("invoice") || event.type.includes("deposit") || event.type.includes("tenant_registered");
  return event.type.includes("traveler") || event.type.includes("guest_pack") || event.type.includes("lead_stage");
}

export function matchesDemoEventRange(event: DemoEventRecord, range: DemoEventRange) {
  if (range === "All") return true;
  const timestamp = getDemoEventTimestamp(event);
  if (!timestamp) return false;
  const now = Date.now();
  const diff = now - timestamp;
  if (range === "24h") return diff <= 24 * 60 * 60 * 1000;
  if (range === "7d") return diff <= 7 * 24 * 60 * 60 * 1000;
  return diff <= 30 * 24 * 60 * 60 * 1000;
}

export function filterDemoEvents(
  events: DemoEventRecord[],
  filters: {
    tenant?: string;
    category?: DemoEventCategory;
    caseSlug?: string;
    severity?: DemoEventSeverity | "All";
    range?: DemoEventRange;
  }
) {
  return events.filter((event) => {
    const tenantMatch = !filters.tenant || filters.tenant === "All" || event.tenant === filters.tenant;
    const caseMatch = !filters.caseSlug || filters.caseSlug === "All" || event.caseSlug === filters.caseSlug;
    const categoryMatch = matchesDemoEventCategory(event, filters.category ?? "All");
    const severityMatch = !filters.severity || filters.severity === "All" || event.severity === filters.severity;
    const rangeMatch = matchesDemoEventRange(event, filters.range ?? "All");
    return tenantMatch && caseMatch && categoryMatch && severityMatch && rangeMatch;
  });
}
