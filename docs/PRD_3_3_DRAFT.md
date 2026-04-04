# NAMA PRD v3.3 Draft

## 1. Product Vision

NAMA is the operating system for travel businesses that turns a fragmented agency workflow into one coherent tenant workspace. The product must help a founder register a branded workspace, activate staff, work leads through deals and finance, execute bookings, and produce customer-facing artifacts with enough truth and continuity to support a live demo, an Alpha release, and an eventual MVP.

## 2. Product Philosophy

- The product should feel like a single operating system, not a collection of disconnected pages.
- The founder journey must always be the shortest path to value.
- Demo and Alpha should be believable, deterministic, and repeatable.
- UI surfaces may be visually rich, but the underlying state transitions must stay honest.
- Anything that looks production-like should either be backed by contract truth or clearly marked as preview/sandbox.

## 3. Release Targets

### Demo

The Demo release must let a founder practice the story end to end:
- register a workspace
- activate a tenant
- invite team members
- progress a lead into a deal
- record finance activity
- release bookings and traveler artifacts
- inspect admin and audit surfaces

### Alpha

The Alpha release must feel operationally stable:
- signed-in access must persist correctly
- route guards must prevent dead ends
- demo flows must survive reloads and localStorage loss
- key surfaces must read like one product
- proof artifacts and admin reporting must stay coherent

### MVP

The MVP should move the core journey from demo-state truth to durable product truth:
- persistent backend entities for tenants, members, invites, sessions, leads, deals, bookings, invoices, and artifacts
- authenticated write paths for core workflow actions
- real payment and supplier rails where supported
- event and decision tracking that can be used for reporting and learning

## 4. Primary Users

- Founder / business owner
- Customer admin
- Sales operator
- Finance operator
- Operations operator
- Super Admin / platform operator
- Internal reviewer / demo operator

## 5. Core User Journeys

### 5.1 Workspace Setup

The user registers a workspace, picks a plan, sets branding and support details, and enters a workspace admin access code. The system provisions the tenant member record, issues a session, and lands the user in the dashboard.

### 5.2 Team Activation

The user imports employees, sends invites, and accepts a generated invite route. Invites should produce a visible handoff into workspace login, not a dead-end page.

### 5.3 Lead To Deal

The user opens leads, inspects a contact, progresses stage, and opens the related deal workspace. The deal view should explain the case, the rationale, the supplier/commercial state, and the next action.

### 5.4 Deal To Finance

The user sends a quote, records a deposit, and sees finance state propagate into invoices and booking readiness. The finance state must be visible on the finance screen and downstream artifact screens.

### 5.5 Booking To Artifacts

The user releases the guest pack, marks invoices as paid, and dispatches the traveler PDF. Those actions must surface on the bookings, invoice, and traveler artifact pages as visible status transitions.

### 5.6 Super Admin Oversight

The platform operator logs in through a separate path, reviews tenant health and audit data, rotates credentials when needed, and exits cleanly back to the login route.

## 6. Module Breakdown

### Demo / Alpha Core

| Module | Current status | Notes |
| --- | --- | --- |
| Registration | Ready | Tenant onboarding is operational and branded |
| Team / invites | Ready | Invite acceptance and tenant member activation work |
| Leads | Ready | Stage changes flow through the workflow contract |
| Deals | Ready | Same-origin case route exists and resolves correctly |
| Finance | Ready | Deposit and finance state are visible and testable |
| Bookings | Ready | Guest pack release and booking readiness are coherent |
| Invoices | Ready | Invoice state and finance state are visible |
| Traveler PDF | Ready | Dispatch state and guest-pack state are visible |
| Super Admin | Ready | Separate access path and audit visibility exist |
| Dashboard shell | Ready | Stitch-style hierarchy is in place |

### MVP Path

| Module | Current status | Notes |
| --- | --- | --- |
| Query triage | Partial | Strong demo intent, still needs deeper backend truth |
| Itinerary generation | Partial | Visual flow exists, more durable backend modeling needed |
| Bidding / sourcing | Partial | Good demo scaffolding, supplier truth still limited |
| Dynamic pricing | Partial | Present as logic and UI, not fully hardened |
| Payments | Partial | Contract exists, but production rails are not the current goal |
| OCR / docs | Partial | Useful concept, not fully productionized |
| Analytics | Partial | Dashboard surfaces exist, but metrics are not yet full truth |
| Marketing / nurture | Partial | Surface exists, delivery stack not complete |
| White-label portals | Partial | Brand system is strong, broader portal depth remains |
| Corporate OS | Partial | Useful direction, not full vertical maturity |
| Integration vault | Partial | Environment and contract work exist, broader secrets flow remains |
| Finance ledger | Partial | Foundational truth is improving, full ledgering remains |
| Sentinel auditor | Partial | Route and smoke audit exist, full observability still needed |
| Evolution engine | Conceptual | Roadmap item, not alpha-critical |

## 7. APIs And Integrations

### Current Contract Surfaces

- tenant members
- tenant invites
- tenant sessions
- credential reset flows
- demo workflow state
- founder bookings
- founder financials
- founder payments
- auth audit

### External Integrations

- Payment rails are treated as test-mode or readiness-first unless explicitly promoted.
- Supplier adapters exist as scaffolding and should be treated honestly in the UI and docs.
- Demo state is bridged through same-origin Next API routes when `NEXT_PUBLIC_API_URL` is unset.

## 8. Edge Cases And Failure Handling

- Invite links may be expired or already used.
- Sessions may be invalid, revoked, or missing.
- Access codes may be wrong or rotated.
- A route may resolve to a fallback case if the requested slug is invalid.
- Some pages should explicitly show that a state is preview/sandbox rather than production truth.
- Dead-end navigation should redirect to the right login or root route instead of failing silently.

## 9. Non-Functional Requirements

- Lint must pass.
- Build must pass.
- Demo and Alpha smokes must pass sequentially.
- Negative route checks must not expose dead ends.
- Auth/session checks must be server-backed where applicable.
- Visual language must stay coherent across dashboard, onboarding, and artifact screens.

## 10. MVP Roadmap Snapshot

1. Harden durable backend entities for all core workflow objects.
2. Close supplier, booking, and payment truth gaps.
3. Add structured decision and outcome tracking.
4. Introduce stronger analytics and audit surfaces.
5. Expand white-label and portal depth.

## 11. Acceptance Criteria For This Draft

- The Demo path is explainable and repeatable.
- Alpha is stable enough for operator rehearsal.
- MVP work is clearly separated from demo-only behavior.
- The document can be handed to a developer without extra verbal context.

