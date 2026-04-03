# Alpha Closeout Checklist

## Purpose

This document closes the April alpha branch from product, engineering, QA, and handoff angles. It reflects the current state of `codex/apr6-alpha`, not the older pre-alpha docs.

## New Elements And Features To Close

- [x] Registration flow persists tenant profile, plan, branding, domain choice, and banking details.
- [x] White-label controls support a NAMA-hosted subdomain or a customer-owned domain.
- [x] Workspace branding flows into the dashboard shell and outbound artifact surfaces.
- [x] Screen-level help tips are available across onboarding and major dashboard screens.
- [x] Dense screens now include deeper section-level guidance.
- [x] Team workspace supports employee CSV template download and CSV upload.
- [x] Team workspace supports individual invite send.
- [x] Team workspace supports bulk invite send to selected employees.
- [x] Invite acceptance has a dedicated route.
- [x] Shared demo case and profile state drive more of the dashboard instead of page-local constants.
- [x] Lead, deal, finance, booking, invoice, traveler-PDF, and artifact states persist through the shared demo workflow layer.
- [x] Finance and bookings now display onboarding-derived settlement and remittance details.
- [x] Customer-facing quote, comms, itinerary export, invoice, and traveler-PDF surfaces inherit tenant profile settings.
- [x] Artifact hub supports quick case jumps and links to branded artifacts.
- [x] Invoice and traveler PDF routes support print-ready presentation and local status controls.
- [x] Demo pack route bundles invoice, traveler PDF, and audit context.
- [x] Super Admin includes tenant registry, MRR snapshot, active user approximation, invite backlog, lifecycle board, and system audit views.
- [x] Super Admin Demo Lab can seed healthy and negative-path scenarios.
- [x] Super Admin now has a distinct entry URL separate from tenant onboarding and workspace routes.
- [x] Founder smoke harness validates the golden path.
- [x] Small-agency and ops-heavy smoke scenarios validate additional seeded states.
- [x] Audit timeline supports filters, export, copy, printable report, and share-ready summary.
- [x] Demo pack and audit report include share/email-style proof controls.

## Alpha Module Status

### Strong For Alpha

- Registration and onboarding: stateful, revisitable, and linked to downstream surfaces.
- Dashboard shell and overview spine: coherent walkthrough entry and tenant-aware shell.
- Team and invite workflow: employee import, invite generation, bulk send, acceptance route.
- Leads to finance to bookings continuity: shared workflow state and downstream artifact connections.
- Finance, invoice, traveler PDF, artifacts, and demo pack: founder-facing output path is present.
- Super Admin control tower: seeded tenants, audit timeline, lifecycle board, and exports.
- Super Admin entry path: separated from customer and tenant-facing routes through `/super-admin/login`.
- Demo test scaffolding: smoke scenarios and Demo Lab seed/reset tools.

### Partial

- Deals: strong quote preview and case continuity, but still demo-state driven rather than real CRM persistence.
- Comms: outbound shells and brand continuity exist, but no live mail transport or threaded messaging backend.
- Content: rich preview surface exists, but not a full publish pipeline.
- DMC: supplier workspace framing exists, but not a full operator workflow.
- Itineraries: strong traveler-facing preview and export path, but not a full itinerary editor lifecycle.
- Analytics: present as a dashboard surface, but still preview-grade data.
- Autopilot, EKLA, Evolution: present as alpha framing surfaces, not full product modules.
- Backend APIs and adapters: enough for demo health and mock/sandbox behavior, not production-complete orchestration.

### Not Started Or Not Yet Closed

- Production-grade auth, tenant provisioning, session telemetry, RBAC, and audit immutability.
- Real invite email delivery and provider-backed tracking.
- Live payment capture, webhook processing, refunds, and reconciliation.
- End-to-end live sourcing flow using TBO, Amadeus, and Bokun from UI through backend orchestration.
- Production security hardening, secrets rotation, narrowed CORS, and deployment lockdown.
- Formal design adoption comparison against the external reference build.

## Page And Flow Status

| Area | Routes / Files | Status | Notes |
| --- | --- | --- | --- |
| Registration | `src/app/register/page.tsx` | Done for alpha | Persists plan, branding, banking, and tenant profile. |
| Invite acceptance | `src/app/invite/[inviteId]/page.tsx` | Done for alpha | Accept flow is present through demo workflow state. |
| Overview | `src/app/dashboard/page.tsx` | Done for alpha | Central walkthrough spine and tenant-aware shell. |
| Leads | `src/app/dashboard/leads/page.tsx` | Partial | Shared state exists, but still demo-oriented, not backend CRM. |
| Deals | `src/app/dashboard/deals/page.client.tsx` | Partial | Strong quote shell, but pipeline behavior is still preview-weighted. |
| Finance | `src/app/dashboard/finance/page.tsx` | Done for alpha | Settlement profile and invoice continuity are in place. |
| Bookings | `src/app/dashboard/bookings/page.tsx` | Done for alpha | Booking/payment/doc continuity exists across artifacts. |
| Itineraries | `src/app/dashboard/itineraries/page.tsx` | Partial | Export-preview quality is strong; full editorial workflow is still partial. |
| Team | `src/app/dashboard/team/page.tsx` | Done for alpha | CSV import, invite send, bulk send, and acceptance path. |
| Admin / Super Admin | `src/app/dashboard/admin/page.tsx` | Done for alpha | Demo Lab, lifecycle board, risk view, audit timeline. |
| Audit report | `src/app/dashboard/admin/audit-report/page.tsx` | Done for alpha | Printable, filterable proof artifact. |
| Artifacts hub | `src/app/dashboard/artifacts/page.tsx` | Done for alpha | Case jumps and artifact bundling entry point. |
| Invoice | `src/app/dashboard/invoices/[case]/page.tsx` | Done for alpha | Branded invoice route with status controls. |
| Traveler PDF | `src/app/dashboard/traveler-pdf/[case]/page.tsx` | Done for alpha | Branded traveler artifact route with status controls. |
| Demo pack | `src/app/dashboard/demo-pack/[case]/page.tsx` | Done for alpha | Bundle route for founder-ready proof artifacts. |
| Comms | `src/app/dashboard/comms/page.tsx` | Partial | Brand-safe shells, but no live provider send. |
| Content | `src/app/dashboard/content/page.tsx` | Partial | Presentational/editorial preview stage. |
| DMC | `src/app/dashboard/dmc/page.tsx` | Partial | Framing exists; depth remains to be built. |
| Analytics | `src/app/dashboard/analytics/page.tsx` | Partial | Preview and narrative analytics more than operational BI. |
| Autopilot | `src/app/dashboard/autopilot/page.tsx` | Partial | Alpha story surface. |
| EKLA | `src/app/dashboard/ekla/page.tsx` | Partial | Alpha story surface. |
| Evolution | `src/app/dashboard/evolution/page.tsx` | Partial | Alpha story surface. |

## M1 To M15 Module Status

This matrix is aligned to the current alpha repo and existing 15-module architecture narrative, while acknowledging that the legacy module labels in older docs need a later cleanup pass.

| Module | Working interpretation for alpha handoff | Status |
| --- | --- | --- |
| M1 | Tenant registration, setup, branding, and workspace provisioning preview | Done |
| M2 | Leads and CRM intake | Partial |
| M3 | Deals and proposal shaping | Partial |
| M4 | Finance, invoicing, and settlement visibility | Done |
| M5 | Bookings and traveler confirmation flow | Done |
| M6 | Team, employees, and invites | Done |
| M7 | Admin, Super Admin, tenant controls, audit | Done |
| M8 | Itineraries and traveler output | Partial |
| M9 | Content and storytelling workspace | Partial |
| M10 | Communications and outbound message shells | Partial |
| M11 | Supplier / DMC operations | Partial |
| M12 | Analytics and business health | Partial |
| M13 | Autopilot / agentic assistance surfaces | Partial |
| M14 | EKLA / knowledge-orchestration preview | Partial |
| M15 | Evolution / future-state narrative module | Partial |

## Security, Ports, And Technical Audit

### Current Open Ports Snapshot

Command used: `lsof -nP -iTCP -sTCP:LISTEN`

- `node` on `*:3001`
- `Electron` on `127.0.0.1:51148`
- `Google` on `127.0.0.1:9222`

### Security Findings To Close After Alpha

- `backend/app/main.py` uses wildcard CORS via `allow_origins=["*"]`.
- `backend/app/api/v1/auth.py` and `backend/app/api/v1/deps.py` fall back to `dev-only-secret-key`.
- `backend/app/api/v1/auth.py` explicitly notes password hashing is not implemented in the prototype login flow.
- `backend/app/main.py` runs `Base.metadata.create_all(bind=engine)` on startup.
- `backend/main.py` launches the older backend entrypoint on `0.0.0.0`, which is acceptable for local development but should be reviewed for deployment discipline.
- Super Admin access is separated by URL and an alpha-only client-side session gate. This helps demo audience separation, but it is not a production security control.

### Alpha Risk Summary

- Safe for controlled demo environments.
- Not yet safe to represent as production-grade security posture.
- Needs a dedicated hardening sprint before beta or customer pilot.

## API And External Integration Status

| Surface | Status | Current Evidence |
| --- | --- | --- |
| Demo API | Done for alpha | `backend/app/api/v1/demo.py` powers demo-first flows and mock case behaviors. |
| Payments API | Partial | `backend/app/api/v1/payments.py` exposes config and health posture, not full payment lifecycle. |
| Integrations status API | Partial | `backend/app/api/v1/integrations.py` reports env-backed readiness for Stripe, Razorpay, Resend, SendGrid, Bokun, Amadeus, TBO, WhatsApp. |
| Stripe / Razorpay | Partial | Health/config aware; no full checkout, webhook, or reconciliation closure in current branch. |
| TBO | Partial | `backend/app/adapters/tbo.py` supports mock, sandbox, and live mode scaffolding. |
| Amadeus | Partial | `backend/app/adapters/amadeus.py` supports mock, sandbox, and live mode scaffolding. |
| Bokun | Partial | `backend/app/adapters/bokun.py` supports mock, sandbox, and live mode scaffolding. |
| Sourcing orchestration | Partial | `backend/app/api/v1/sourcing.py` remains a thin readiness layer. |
| Content API | Partial | `backend/app/api/v1/content.py` has more substantive CRUD-style behavior than several other modules. |
| Bookings API | Partial | `backend/app/api/v1/bookings.py` is prototype-level and still mixed with mocked behavior. |

## Design Adoption Status

The adopted design build referenced by the product team has not been provided in this thread. Because of that, design adoption can only be marked as:

- Current alpha UI language: implemented and internally coherent.
- External reference-build adoption comparison: pending reference.
- Pixel-accurate parity audit: not yet possible.

## Test Data And Agent-Created Demo Data

Representative seeded data now exists through:

- `src/lib/demo-scenarios.ts`
- `scripts/founder_flow_smoke.mjs`
- Demo Lab controls in `src/app/dashboard/admin/page.tsx`

Current seeded scenarios:

- Founder journey
- Small agency
- Ops-heavy DMC
- Invite backlog QA
- Finance overdue QA

These scenarios create practical demo data for:

- tenant registrations
- employee imports
- invites
- accepted users
- lead progression
- deposits
- invoice state
- traveler-PDF state
- audit trails

## Closeout Recommendation

Alpha can be handed off as:

- a strong founder/demo build
- a testable seeded walkthrough environment
- a partial backend integration scaffold

Alpha should not yet be handed off as:

- a production-ready SaaS deployment
- a security-hardened customer environment
- a fully live OTA/payments/invite-mail system
