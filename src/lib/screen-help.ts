import type { ScreenHelpContent } from "@/components/screen-info-tip";

export const SCREEN_HELP: Record<string, ScreenHelpContent> = {
  register: {
    title: "Workspace Onboarding",
    description: "Use this screen to define the tenant profile before entering the workspace.",
    bullets: [
      "Company Name and Workspace Operator set the visible tenant identity.",
      "Business Profile and Market Defaults control role, language, gateway, and base currency behavior.",
      "Currency Model and Plan Fit explain how the tenant should operate inside the workspace.",
    ],
  },
  registerBusiness: {
    title: "Business Profile",
    description: "Use this section to describe what kind of travel business the tenant actually is.",
    bullets: [
      "A tenant can carry more than one identity, so this is intentionally multi-select.",
      "The selected roles shape the operating model shown across the workspace.",
      "Keep this focused on business model, not plan or team structure.",
    ],
  },
  registerMarket: {
    title: "Market Defaults",
    description: "This section sets the operating market anchor before deeper workspace setup begins.",
    bullets: [
      "Country drives the default language, billing gateway, and base currency choice.",
      "These defaults establish how the workspace behaves by market and region.",
      "Use this to explain that regional behavior changes by tenant rather than staying global.",
    ],
  },
  registerCurrency: {
    title: "Currency Model",
    description: "This section explains the difference between one accounting base currency and optional selling currencies.",
    bullets: [
      "The base currency stays tied to the selected operating market.",
      "Additional currencies expand quoting flexibility without changing the reporting anchor.",
      "This becomes the bridge into later finance and commerce controls.",
    ],
  },
  registerBanking: {
    title: "Banking & Settlement",
    description: "Use this section to capture the tenant's settlement details in one place during onboarding.",
    bullets: [
      "Capture beneficiary, bank, branch, account, and routing details together.",
      "Include the billing address so invoicing and payouts start from the same source of truth.",
      "This keeps finance setup visible early without claiming live payouts are already connected.",
    ],
  },
  registerPreview: {
    title: "Workspace Preview",
    description: "This summary helps the user confirm the tenant defaults before entering the dashboard.",
    bullets: [
      "Use it as a readback of the selected business type, market, commerce, and banking settings.",
      "The values here should feel like a clear handoff into the rest of the workspace.",
      "It reinforces that onboarding is defining the workspace, not collecting payment details yet.",
    ],
  },
  registerPlan: {
    title: "Plan Fit",
    description: "This section frames subscription fit as guided recommendation rather than a hard commercial step.",
    bullets: [
      "Use plan selection to explain operating depth, not live billing commitment.",
      "Each card maps the tenant to a fuller control model inside the product.",
      "The recommendation should feel commercially clear without overcommitting live billing behavior.",
    ],
  },
  overview: {
    title: "Operations Overview",
    description: "This screen is the walkthrough spine for the alpha and connects the main operating layers.",
    bullets: [
      "Top metrics summarize case volume, urgency, and deposit exposure.",
      "The guided journey shows the order to click through the workflow.",
      "Priority Cases and focus cards help anchor the walkthrough around the same case set.",
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
  integrations: {
    title: "Integration Vault",
    description: "This screen shows the current readiness of external rails and provider connections across the operating system.",
    bullets: [
      "Connection cards distinguish live-ready rails from providers that still need credentials.",
      "Use this screen as an operator control view, not as a setup wizard.",
      "The goal is to show which commercial, communication, and supply rails are available to activate next.",
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
    description: "This is the omnichannel CRM layer for website, phone, email, and messaging intake.",
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
  teamAccess: {
    title: "Access Control Layer",
    description: "This section is the permission logic behind the visible team workspace.",
    bullets: [
      "Permission Matrix explains who can view, act, and escalate across the tenant.",
      "Role Templates show reusable staffing patterns across the tenant.",
      "Admin Summary keeps the visible naming decisions aligned with the rest of the page.",
    ],
  },
  teamModes: {
    title: "Workflow Modes",
    description: "Use these modes to switch the story from invites into structure, roles, assignments, and branding.",
    bullets: [
      "Invite and Bulk explain user creation paths.",
      "Roles, Hierarchy, and Structure explain access design and reporting logic.",
      "Assign and Brand finish the story with ownership mapping and white-label controls.",
    ],
  },
  teamBrand: {
    title: "White-label Controls",
    description: "This mode shows how tenant branding becomes configurable only after explicit enablement.",
    bullets: [
      "The toggle protects branding settings until white label is turned on.",
      "Workspace name, badge, support, domain, and accent fields are the tenant-editable identity layer.",
      "The domain can be either a NAMA-hosted subdomain or the customer's own connected domain, with clear brand setup guidance.",
      "The summary panel shows the visible product impact of those branding controls.",
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
  adminGovernance: {
    title: "Platform Governance Layer",
    description: "This section explains how platform-owner controls differ from tenant-admin controls.",
    bullets: [
      "Tenant Action Queue highlights the commercial or operational items needing attention.",
      "Template Inheritance shows what starts at platform level before local overrides happen.",
      "Use this to position Super Admin as governance, not day-to-day agency execution.",
    ],
  },
  adminTenants: {
    title: "Tenant & Subscription Health",
    description: "This section is the rollup of tenant commercial status, adoption, and risk.",
    bullets: [
      "Each tenant card combines plan tier, seats, renewal timing, and health status.",
      "Global Controls summarize the major control surfaces available to the platform owner.",
      "This is the fastest way to explain why Super Admin exists at all.",
    ],
  },
  adminRegional: {
    title: "Regional Commerce Routing",
    description: "This section models how subscription and payment behavior changes by market.",
    bullets: [
      "Country-specific cards define language, base currency, extras, and gateway patterns.",
      "The selected market feeds the pricing simulator and FX explanation nearby.",
      "Use it to show geo-aware logic instead of one-size-fits-all billing.",
    ],
  },
  adminFx: {
    title: "Localization & FX Controls",
    description: "This section explains how pricing, rates, language, and routing stay flexible but governed.",
    bullets: [
      "Localization rules show the default decision path for language, currency, and gateway.",
      "FX Rate Stack explains live-rate, buffered, and manual-lock behavior.",
      "The simulator translates those controls into a concrete regional plan price.",
    ],
  },
  adminPlans: {
    title: "Subscription Plans",
    description: "This section frames the commercial packaging the platform owner manages across tenants.",
    bullets: [
      "Each plan maps to a deeper operating model, not just a higher number.",
      "Use the cards to explain packaging from Starter through Enterprise.",
      "Keep this anchored to platform packaging, not tenant-specific usage alone.",
    ],
  },
  analytics: {
    title: "Analytics Workspace",
    description: "This screen presents analytics for pipeline value, ROI, response efficiency, and agent performance.",
    bullets: [
      "KPI cards summarize the top-level health of the active pipeline.",
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
      "Agency Stack and story cards explain how the operating model fits together.",
      "Control Signals are the key proof points to call out live.",
    ],
  },
  evolution: {
    title: "Agentic Evolution",
    description: "This is the learning and optimization layer for the operating system.",
    bullets: [
      "Top KPIs summarize improvement, accuracy, and learning cycles.",
      "Recursive Self-Improvement Feed explains what the system is learning from recent behavior.",
      "Configuration and health panels frame the screen as supervised optimization, not unchecked autonomy.",
    ],
  },
};
