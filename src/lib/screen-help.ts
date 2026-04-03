import type { ScreenHelpContent } from "@/components/screen-info-tip";

export const SCREEN_HELP: Record<string, ScreenHelpContent> = {
  register: {
    title: "Workspace Onboarding",
    description: "Use this screen to define the tenant profile before entering the preview workspace.",
    bullets: [
      "Company Name and Workspace Operator set the visible tenant identity.",
      "Business Profile and Market Defaults control role, language, gateway, and base currency behavior.",
      "Currency Model and Plan Fit explain how the tenant should operate inside the alpha preview.",
    ],
  },
  overview: {
    title: "Operations Overview",
    description: "This screen is the walkthrough spine for the alpha and connects the main operating layers.",
    bullets: [
      "Top metrics summarize case volume, urgency, and deposit exposure.",
      "Canonical Preview Journey shows the order to click through the workflow.",
      "Priority Cases and Preview Focus help the presenter anchor the narrative around the same case set.",
    ],
  },
  leads: {
    title: "Leads & Contacts",
    description: "This is the CRM control layer for inbound capture, owner load, fit scoring, and follow-up scheduling.",
    bullets: [
      "Use search, source filters, and stage views to narrow the live queue.",
      "Scheduler and enrichment panels explain next actions and public-context strengthening.",
      "Lead cards are the bridge into Deals and the rest of the workflow.",
    ],
  },
  deals: {
    title: "Deal Intelligence",
    description: "This screen resolves a selected case and shows its conversion path across triage, itinerary, supplier, finance, and execution.",
    bullets: [
      "Case header confirms which routed case is currently active.",
      "Orchestration and continuity cards explain how the layers fit together.",
      "The panels below show the rich case payload used by the rest of the alpha workflow.",
    ],
  },
  finance: {
    title: "Finance Control",
    description: "This page explains margin visibility, deposit timing, collection priority, and execution release readiness.",
    bullets: [
      "Use the KPI strip for quote, profit, deposit, and margin context.",
      "Collection Queue and Guardrails explain what finance is protecting.",
      "Case cards and ledger rows show how finance stays attached to the same case set.",
    ],
  },
  autopilot: {
    title: "Autopilot Command Center",
    description: "This screen summarizes what the agent swarm is doing and which cases need human attention now.",
    bullets: [
      "Attention Feed is the main case-priority surface.",
      "Agent Swarm cards explain which automated roles are running and what they are doing.",
      "Use the active focus card to jump from autopilot into the selected deal.",
    ],
  },
  comms: {
    title: "Comms Command",
    description: "This is the omnichannel CRM layer for website, phone, email, and placeholder messaging rails.",
    bullets: [
      "Omnichannel Intake shows the source cards that feed the same CRM story.",
      "Transcript and follow-up queue explain what the team should do next.",
      "Use the deal shortcut to follow the same case deeper into the workflow.",
    ],
  },
  dmc: {
    title: "DMC Contract Hub",
    description: "This page shows how supplier-side documents are normalized back into quote and ops inputs.",
    bullets: [
      "Supplier Directory and Normalized Fields explain what becomes structured data.",
      "Contract Intake & Normalization shows how messy inputs are reviewed and published.",
      "Travel Agent Communication and Service Provider Threads show how supplier truth flows back into the case.",
    ],
  },
  bookings: {
    title: "Booking Execution Hub",
    description: "This screen covers the post-sale handoff once a case moves into documents, confirmations, and operations.",
    bullets: [
      "Execution Continuity explains the checkpoints from finance release to guest delivery.",
      "Travel, Documents, Payments, and Operations tabs split execution into operational views.",
      "Dispatch Checklist and Next Actions show what still needs to happen before release.",
    ],
  },
  team: {
    title: "Team & Access",
    description: "This is the customer-admin workspace for invites, hierarchy, naming, assignments, and white-label controls.",
    bullets: [
      "Workflow Modes switch between invites, bulk import, roles, hierarchy, structure, assignments, and branding.",
      "Access Control and hierarchy sections explain how permissions and reporting lines work.",
      "Brand mode now includes the white-label toggle and locked branding controls.",
    ],
  },
  admin: {
    title: "Platform Control",
    description: "This is the super-admin layer for subscriptions, template inheritance, tenant health, and regional commerce routing.",
    bullets: [
      "Tenant Action Queue and Tenant Health summarize commercial risk and adoption.",
      "Regional Commerce and FX Controls explain how pricing and gateways vary by market.",
      "Subscription Plans and Rules describe platform-level governance rather than tenant-level operations.",
    ],
  },
  analytics: {
    title: "Analytics Workspace",
    description: "This screen presents preview analytics for pipeline value, ROI, response efficiency, and agent performance.",
    bullets: [
      "KPI cards summarize the top-level health of the preview pipeline.",
      "Charts and leaderboards show performance by time, channel, and team.",
      "Use this screen as a readout layer, not as an operational control surface.",
    ],
  },
  content: {
    title: "Asset Library",
    description: "This page is the reusable content and media library for templates, brochures, itineraries, and regional assets.",
    bullets: [
      "Header actions cover bulk ingest and new asset template creation.",
      "Stats and filters explain asset volume, type, region, and state.",
      "The asset table is the main browsing surface for reusable content blocks.",
    ],
  },
  itineraries: {
    title: "Itinerary Workspace",
    description: "This is the trip-design canvas for editing day plans, product blocks, and traveler-facing flow.",
    bullets: [
      "The left timeline switches between trip days.",
      "The main canvas shows the currently selected day narrative and attached blocks.",
      "Use this screen to explain how structured itinerary content is assembled before export.",
    ],
  },
  ekla: {
    title: "Ekla",
    description: "This page explains the autonomous operator narrative behind the workflow.",
    bullets: [
      "The top panels explain what Ekla automates across capture, quote, follow-up, and execution.",
      "Agency Stack and story cards help pitch the product concept in the preview.",
      "Control Signals are the presenter-safe proof points to call out live.",
    ],
  },
  evolution: {
    title: "Agentic Evolution",
    description: "This is the preview-safe learning and optimization layer for the operating system.",
    bullets: [
      "Top KPIs summarize improvement, accuracy, and learning cycles.",
      "Recursive Self-Improvement Feed explains what the system is learning from recent behavior.",
      "Configuration and health panels frame the screen as supervised optimization, not unchecked autonomy.",
    ],
  },
};
