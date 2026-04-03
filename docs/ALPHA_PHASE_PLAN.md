# Alpha Remaining Development Plan

## Goal

This plan closes the current alpha and sequences the remaining work into Phase 1 and Phase 2, using the branch state in `codex/apr6-alpha` as the baseline.

## Phase 1

Phase 1 converts the current founder/demo alpha into a reliable pilot-ready product shell.

### Product Priorities

- Finish real workspace creation and tenant provisioning.
- Replace demo-only auth with secure sign-in, password hashing, session handling, and role-based access.
- Turn team invites into provider-backed email invites with resend, expiry, revoke, and acceptance tracking.
- Make lead, deal, finance, booking, and artifact states durable against a real backend, not only local demo storage.
- Add a proper audit ledger with immutable event semantics for tenant, financial, and artifact actions.
- Expand Super Admin into a reliable operational console for tenant health, active usage, and subscription state.

### Integration Priorities

- Complete payment-provider test environments for Stripe and Razorpay.
- Build webhook handling and subscription lifecycle accounting.
- Build one complete travel-sourcing happy path using sandbox credentials for TBO, Amadeus, and Bokun.
- Align content, bookings, and sourcing APIs into one coherent itinerary generation path.

### Platform Priorities

- Lock down CORS by environment.
- Remove dev fallback secrets in non-local modes.
- Add structured environment validation on startup.
- Replace auto table creation in production paths with migrations-only deployment.
- Introduce logging, monitoring, and error-reporting discipline.

### Delivery Target For Phase 1

- pilot-safe environment
- controlled customer demos
- test-mode billing and supplier connectivity
- auditable operator workflow for the core path

## Phase 2

Phase 2 turns the pilot shell into a deeper multi-module operating product.

### Product Priorities

- Expand CRM depth across lead management, follow-up calendars, and sales pipeline intelligence.
- Build richer itinerary creation, approvals, revisions, and customer collaboration loops.
- Complete supplier-side and DMC workflows.
- Turn content and communications into integrated publishing and distribution systems.
- Deepen analytics, revenue reporting, renewal insights, and operator health signals.
- Mature Autopilot, EKLA, and Evolution into distinct functional modules rather than alpha narrative surfaces.

### Experience Priorities

- Complete design-system consolidation against the adopted reference build once shared.
- Add accessibility QA, keyboard coverage, and responsive consistency across all modules.
- Add customer-facing portals with stronger document, payment, and communication continuity.

### Commercial Priorities

- Production billing and subscription lifecycle handling.
- Domain onboarding automation and SSL/custom-domain verification flows.
- Asset upload, brand-kit management, and richer white-label controls.

### Delivery Target For Phase 2

- beta-ready multi-tenant product
- deeper operator workflows
- customer-facing portal continuity
- integrated commercial operations

## M1 To M15 Delivery Matrix

| Module | Alpha status | Phase 1 target | Phase 2 target |
| --- | --- | --- | --- |
| M1 Registration and tenant setup | Done | Real provisioning and secure auth | Self-serve onboarding polish |
| M2 Leads | Partial | Durable CRM state and actions | Deeper sales workflow and follow-up intelligence |
| M3 Deals | Partial | Durable proposal lifecycle | Customer collaboration and approvals |
| M4 Finance | Done | Real billing rails and subscriptions | Advanced revenue ops and reconciliation |
| M5 Bookings | Done | Real backend workflow persistence | Supplier-confirmation depth and servicing |
| M6 Team and invites | Done | Provider-backed invite mail and roles | Organization management maturity |
| M7 Admin and audit | Done | Strong operations console and ledger | Advanced governance and reporting |
| M8 Itineraries | Partial | End-to-end generated itinerary flow | Full editorial and approval lifecycle |
| M9 Content | Partial | Better content management backbone | Publishing and distribution depth |
| M10 Comms | Partial | Provider-backed outbound actions | Multi-channel threaded engagement |
| M11 DMC / supplier ops | Partial | Sandbox-backed supplier path | Deeper vendor operations |
| M12 Analytics | Partial | More truthful health and subscription metrics | Advanced BI and forecasting |
| M13 Autopilot | Partial | Useful assistive actions around the core flow | Broader orchestration |
| M14 EKLA | Partial | Better knowledge-layer grounding | Mature knowledge operations |
| M15 Evolution | Partial | Keep as roadmap / strategy narrative | Expand into productized strategic intelligence |

## Recommended Order

1. Security and auth hardening
2. Durable backend state for the core founder flow
3. Invite email and subscription/payment test rails
4. Travel-supplier sandbox orchestration
5. Design-system consolidation and accessibility
6. Deeper module expansion
