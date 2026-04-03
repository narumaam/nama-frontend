# NAMA Post-Monday Incorporation Roadmap

Date: April 3, 2026
Baseline freeze: `d37c122` - `Clarify Monday demo journey continuity`

## Purpose

This roadmap defines what to incorporate into the live NAMA repo after the Monday demo without destabilizing the frozen story. It separates source material into three buckets:

- `Steal now`: low-risk upgrades that deepen the current story without changing the core Monday flow.
- `Steal after Monday`: larger features or structural additions that deserve their own implementation pass.
- `Archive only`: useful references, but not worth direct incorporation into the live product path.

The working assumption is that `/Users/radhika/Documents/New project/nama-live` remains the product baseline and all external sources are donor material, not replacement candidates.

## Source Priority

### Tier 1: Primary donor sources

1. `Desktop/NAMA/06_UI_Module_Library`
2. `Downloads/nama`
3. `Desktop/NAMA/11_Stitch_Itinerary_Builder` and `Downloads/stitch_itinerary_builder (8).zip`
4. `Downloads/NAMA_Master_PRD_v3.1.pages`

### Tier 2: Low-priority references

1. `Desktop/Intentra-main`
2. `Downloads/nama-v2.zip`
3. `Downloads/nama-travel-ecosystem-visualiz*.zip`

## What To Steal Now

These are the highest-value additions that align directly with already-shipped Monday surfaces.

### 1. Leads and CRM depth

Take from:

- `smart_lead_inbox`
- `smart_lead_inbox_refined_1`
- `smart_lead_inbox_refined_2`
- `autonomous_lead_engine`
- `refined_autonomous_lead_engine_control`
- `updated_lead_management_1`
- `lead_pipeline_v3_comprehensive`
- `lead_pipeline_stages`

Why now:

- The live repo already has a strong `leads` story, but these donor screens add richer lead intelligence, denser pipeline visibility, and clearer AI-assisted control states.
- This strengthens the current Monday narrative without changing its route order.

Target surfaces:

- `/dashboard/leads`
- `/dashboard/autopilot`
- `/kinetic`

Recommended scope:

- Better stage density and source-level filtering
- Lead health, SLA, and confidence indicators
- More explicit enrichment cards and owner-assignment controls
- Stronger “AI prepared / human approved” visual language

### 2. Deals / quote workspace refinement

Take from:

- `quote_proposal_view_refined_2`
- `updated_quotation_invoicing_1`
- `updated_quotation_invoicing_2`
- `vendor_comparison_engine_dark`
- `vendor_bidding_engine_v3`
- `dmc_query_decomposition`

Why now:

- The live deal flow is already central to the demo.
- These patterns deepen commercial logic, quote comparability, and negotiation clarity without forcing a new product concept.

Target surfaces:

- `/dashboard/deals`

Recommended scope:

- Clearer quote-to-margin narrative
- Better vendor comparison layout
- More structured “why this quote” rationale
- Cleaner approval, send, and fallback state handling

### 3. DMC contract and supplier intelligence polish

Take from:

- `nama_contract_ai_ingestion`
- `ai_contract_ingestion_standardization`
- `refined_ai_contract_ingestion_standardization`
- `refined_supplier_marketplace_travel_confluence_system_1`
- `refined_supplier_marketplace_travel_confluence_system_2`
- `dmc_contract_management`
- `dmc_vendor_directory`

Why now:

- DMC normalization is already part of the frozen Monday story.
- These sources can improve clarity, trust, and depth inside an existing demo-safe surface.

Target surfaces:

- `/dashboard/dmc`

Recommended scope:

- Better parsed-versus-needs-review states
- Structured contract extraction summaries
- Vendor directory and agreement cards
- Stronger normalization audit trail

### 4. Bookings execution hardening

Take from:

- `operations_booking_tracker_1`
- `operations_booking_tracker_2`
- `booking_workspace_flow`
- `booking_workspace_light_mode`
- `booking_workspace_with_language_support`
- `voucher_generator_light_mode`
- `travel_voucher_light`

Why now:

- Bookings already anchors “execution continuity” in Monday.
- These sources add operational density and handoff confidence, especially around documents and execution ownership.

Target surfaces:

- `/dashboard/bookings`

Recommended scope:

- Stronger execution timeline
- Better voucher/doc pack representation
- Language-aware guest pack state
- Clearer ops, supplier, and finance ownership blocks

### 5. Team and access management polish

Take from:

- `role_management_light_mode`
- `role_management_dark_mode`
- `role_permissions_dark_mode`
- `staff_management_light_mode_1`

Why now:

- Team and access is already a shipped Monday surface.
- These upgrades fit the current admin/team story and improve credibility for multi-tenant travel organizations.

Target surfaces:

- `/dashboard/team`
- `/dashboard/admin`

Recommended scope:

- Sharper RBAC matrix visualization
- Role inheritance and permission views
- Cleaner invite and bulk-upload patterns
- More explicit hierarchy language from L1-L5

## What To Steal After Monday

These are important, but they add new operating depth or require backend and data-model work beyond a safe demo-layer polish pass.

### 1. Full itinerary builder system

Take from:

- `ai_itinerary_builder`
- `nama_ai_itinerary_builder`
- `ai_itinerary_builder_refined_1`
- `ai_itinerary_builder_refined_2`
- `ai_itinerary_builder_detailed_map`
- `ai_itinerary_builder_enhanced_map_detail`
- `ai_itinerary_builder_weather_overlay_1`
- `ai_itinerary_builder_weather_overlay_2`
- `itinerary_builder`
- `itinerary_builder_light_mode`
- `itinerary_builder_command_center`
- `stitch_itinerary_builder/booking_workspace_mobile`

Reason to defer:

- This deserves a coherent itinerary product strategy, not a piecemeal page transplant.
- It likely needs shared itinerary state, reusable day-block schemas, map/weather abstractions, and export logic.

### 2. Finance, treasury, and reconciliation

Take from:

- `global_treasury_finance`
- `nama_global_treasury_markup_rules`
- `nama_digital_wallet_1`
- `nama_digital_wallet_2`
- `multi_currency_ledger_light`
- `multi_currency_ledger_dark`
- `financial_dashboard_light`
- `financial_reconciliation_v3`
- `vendor_payments_reconciliation_light`
- `vendor_payments_reconciliation_dark`
- `corporate_billing_invoicing`
- `gst_vat_return_helper_light`
- `high_fidelity_invoice_generator`
- `tax_invoice_light`

Reason to defer:

- This is high-value but high-risk because it touches payment logic, margin truth, tax handling, and ledger semantics.
- It should follow a proper product pass on finance objects and reporting flows.

### 3. White-label, portal, and customer-facing mobile layers

Take from:

- `white_label_configuration`
- `advanced_white_label_configuration_travel_confluence_system_1`
- `advanced_white_label_configuration_travel_confluence_system_2`
- `ultimate_white_label_configuration_travel_confluence_system`
- `customer_mobile_experience`
- `nama_demo_mobile_traveler_experience`
- `nama_mobile_itinerary_hub`
- `customer_mobile_experience`

Reason to defer:

- This expands the product perimeter from operator OS into customer delivery.
- It deserves a separate architecture decision around branding, auth, tenant domains, and mobile/PWA packaging.

### 4. Corporate, compliance, visa, and fixed departures

Take from:

- `corporate_travel_light_mode`
- `corporate_compliance_expenses_light`
- `corporate_compliance_expenses_dark`
- `visa_application_form_light`
- `visa_application_form_dark`
- `nama_visa_specialist_console_2`
- `nama_visa_specialist_console_3`
- `inventory_management_dark`
- `operational_manifest_portal_v3`

Reason to defer:

- These align strongly with the PRD, but they open whole new operating tracks that are only lightly represented in the current demo.
- They should be implemented as dedicated verticals after the core DMC/agency flow is stabilized.

### 5. Voice, AI persona, and advanced orchestration

Take from:

- `ai_voice_persona_config`
- `ai_voice_persona_refined_light`
- `ai_voice_persona_refined_dark`
- `ai_voice_assistant_light_mode`
- `ai_voice_logic_builder_dark`
- `ai_voice_credit_management_light_1`
- `ai_voice_credit_management_light_2`
- `voice_credits_ledger_dark`
- `live_ai_call_monitor`
- `dashboard_voice_enabled`

Reason to defer:

- Strong differentiator, but outside the frozen Monday story.
- Needs decisions about telephony, usage billing, voice credits, logging, and governance.

## What To Archive Only

These sources are best kept as reference material, not active incorporation targets.

### 1. `Desktop/Intentra-main`

Archive only because:

- It does not appear to align tightly with the NAMA operating-system direction.
- It adds little incremental value compared with the stronger donor sources.

### 2. `Downloads/nama-travel-ecosystem-visualiz*.zip`

Archive only because:

- These are concept and ecosystem framing artifacts, not implementation-ready product surfaces.
- Useful for storytelling, not for direct feature work.

### 3. Duplicate or superseded variants

Archive only because:

- Many donor folders are alternate visual explorations of the same idea.
- We should keep one chosen direction per capability instead of blending multiple variants into a confused UX.

Examples:

- Multiple dashboard variants
- Multiple flight negotiator variants
- Multiple executive hub variants
- Repeated mobile/demo-video concept screens

### 4. `Intentra-main`-style unrelated structures

Archive only because:

- They risk distracting implementation effort away from the DMC/agency core.
- They are not necessary to deepen the existing live product baseline.

## PRD 3.1 Coverage Table

Note: the file named `NAMA_Master_PRD_v3.1.pages` identifies itself internally as `Version 3.0 Consolidated Edition`. The table below uses the extracted PRD headings plus the live repo state as of the freeze commit.

| PRD area | Status | Notes |
| --- | --- | --- |
| Executive narrative: AI-native travel OS for DMCs/agencies/operators | Already covered | Strongly expressed across landing, register, dashboard, Ekla, Autopilot, and Kinetic. |
| 5-level hierarchy and RBAC direction | Partially covered | Present in Team/Admin UX and docs, but not yet a fully enforced cross-product RBAC system. |
| 6-step registration and trial journey | Partially covered | Onboarding captures business type, market, currency, gateway, and team context, but not the full PRD trial, billing, SSO, and invitation system. |
| Multi-channel lead capture | Already covered | Website, WhatsApp, email, and phone are clearly represented in the Monday flow. |
| Lead pipeline CRM | Already covered | Live leads page already demonstrates stage, owner, scheduler, and enrichment. |
| Quotation generator and commercial conversion workspace | Already covered | Deals flow is core to the demo, though post-Monday it should gain deeper comparison and approval states. |
| Document management / OCR / visa workflows | Partially covered | DMC contract normalization and booking docs exist, but passport OCR and visa operations are not yet a full surface. |
| Client communications hub | Partially covered | Communication threads are represented in-story, but not yet as a dedicated unified communication operating module. |
| Supplier registry / grading / rate parsing | Partially covered | DMC hub shows normalization and supplier lanes, but registry depth and formal grading remain limited. |
| Booking management / vouchers / lifecycle tracking | Already covered | Bookings page supports execution continuity, documents, payments, and operational handoff. |
| Itinerary builder | Partially covered | Itinerary logic is embedded in deal and story flow, but the full builder product is not yet realized as a first-class module. |
| Analytics and reporting | Partially covered | Dashboard, Autopilot, and Kinetic provide operating visibility, but formal KPI reporting and forecasting are still thin. |
| White-label portal | Missing later | Only lightly implied today; needs dedicated tenant-facing product work. |
| Finance dashboard / P&L / cash forecasting | Partially covered | Margin and payment checkpoints appear in deals/bookings/admin, but true finance depth and ledgering are still later work. |
| Corporate and fixed departures | Missing later | Not meaningfully implemented in the live flow yet. |
| AI agent architecture / autonomous swarm story | Already covered | Ekla, Autopilot, and Kinetic communicate the agentic operating model very clearly. |
| AI cost controls / throttling / spend dashboards | Missing later | Present in PRD, not yet represented in the live product surfaces. |
| Mobile-responsive design principle | Already covered | Explicitly hardened for the main Monday surfaces. |
| Offline-tolerant critical workflows | Missing later | Not currently surfaced or validated as a product guarantee. |
| API-first architecture | Partially covered | Backend API exists and demo APIs are live, but product-level API posture is not yet expressed in UX/admin tooling. |
| White-label-ready customer-facing surfaces | Missing later | Same gap as white-label portal. |
| Audit-complete logging | Partially covered | Some governance and health concepts exist, but not a complete audit layer visible end-to-end. |
| AI human-review guardrails | Partially covered | Monday story communicates approval checkpoints, but explicit confidence gates and block/amber/red guardrails are still incomplete. |
| Holiday product types and booking component matrix | Missing later | Not yet exposed as a formal operating framework. |
| SaaS subscriptions and multi-currency billing | Partially covered | Market, currency, and gateway are demoed; full subscription lifecycle and billing controls are not complete. |
| Security/compliance posture | Partially covered | Compliance is mentioned, but detailed security, retention, and encrypted-document operations are not implemented as visible product layers. |

## Recommended Execution Order After Monday

### Phase 1: Deepen the shipped demo story

1. Leads and CRM density
2. Deals and quote clarity
3. DMC contract normalization polish
4. Bookings execution polish
5. Team/Admin RBAC polish

Goal:

- Make the existing Monday story feel more complete and enterprise-ready without changing its structure.

### Phase 2: Promote latent modules into real product surfaces

1. Itinerary builder
2. Finance and reconciliation
3. Unified communications
4. Supplier registry and vendor intelligence

Goal:

- Turn implied capabilities into true operating modules with shared data and workflow semantics.

### Phase 3: Expand product perimeter

1. White-label portal
2. Corporate and fixed departures
3. Visa/compliance verticals
4. Voice and advanced AI operator tooling
5. Offline/mobile delivery

Goal:

- Move from a powerful internal OS demo to a broader platform with customer-facing and enterprise-grade extensions.

## Final Recommendation

The live repo should remain the only active implementation branch. External materials should be treated as targeted donors:

- borrow UI patterns and information architecture from `06_UI_Module_Library`
- borrow product taxonomy and alternate scaffolding from `Downloads/nama`
- borrow richer post-demo operating modules from `stitch_itinerary_builder`
- use the PRD package as the benchmark for sequencing and coverage, not as a literal implementation blueprint

The immediate post-Monday move is not a rebuild. It is a controlled enrichment of the current baseline.
