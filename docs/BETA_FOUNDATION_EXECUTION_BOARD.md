# Beta Foundation Execution Board

## Purpose

This board converts the alpha handoff into a beta foundation plan. It starts from `codex/apr6-alpha` at the point where the founder demo, Super Admin split, seeded scenarios, and smoke coverage are all in place.

## Beta Goal

Move from a strong founder/demo alpha to a pilot-safe product foundation with secure access, durable backend truth, and honest test-mode integrations.

## Workstreams

### 1. Auth And Access

Status: In progress

Outcome:

- Replace alpha-only access gates with real authentication and role-based access control.

Execution checklist:

- [x] choose auth model for beta: in-house contract-backed auth and signed cookie sessions
- [x] implement password hashing and secure credential storage
- [x] define roles for Super Admin, customer admin, finance, sales, ops, and viewer users
- [x] protect tenant routes and Super Admin routes with server-backed session checks
- [x] remove demo-only credential shortcuts from production-bound paths
- [ ] document access-control matrix

### 2. Tenant And Workspace Provisioning

Status: In progress

Outcome:

- Turn registration from demo profile setup into real tenant creation and workspace provisioning.

Execution checklist:

- [x] persist tenant registration to backend storage for the beta auth/member contract layer
- [ ] persist plan, branding, banking, and domain preferences to backend
- [ ] introduce tenant IDs and workspace ownership model
- [x] create tenant bootstrap flow after registration
- [ ] make `/register` an editable settings flow backed by backend truth

### 3. Workflow State And Backend Truth

Status: Partial

Outcome:

- Move the core founder journey out of browser demo state into durable backend-backed entities.

Execution checklist:

- [ ] define backend entities for leads, deals, bookings, invoices, traveler artifacts, and invites
- [x] map current demo workflow state to backend models
- [x] replace local persistence with API-backed mutations in the core path
- [ ] preserve seeded demo scenarios without coupling the product to localStorage
- [ ] add migration-safe data model notes

### 4. Invite Delivery And Team Activation

Status: In progress

Outcome:

- Move team invites from demo-link generation to provider-backed delivery and tracked acceptance.

Execution checklist:

- [ ] select email provider path for beta
- [x] generate signed invite tokens with expiry and revoke support
- [ ] add invite resend and cancel actions
- [ ] track invite send, open, accept, and failure states
- [ ] preserve CSV employee import with backend persistence

### 5. Payments And Subscription Rails

Status: Not started

Outcome:

- Support truthful test-mode billing and payment lifecycle handling.

Execution checklist:

- [ ] wire Stripe test-mode subscription lifecycle
- [ ] wire Razorpay test-mode subscription lifecycle
- [ ] add webhook handlers and signature verification
- [ ] reconcile subscription state into Super Admin metrics
- [ ] connect invoice/payment states to backend truth

### 6. Supplier Sandbox Path

Status: In progress

Outcome:

- Deliver one honest sandbox sourcing path using the existing adapters.

Execution checklist:

- [ ] choose first supplier-backed beta path across TBO, Amadeus, and Bokun
- [ ] wire sourcing endpoint beyond readiness-only behavior
- [ ] connect at least one UI workflow to sandbox-backed supplier results
- [ ] mark sandbox versus mock versus live modes clearly in UI and docs
- [ ] document supported and unsupported supplier actions

### 7. Super Admin And Audit Hardening

Status: Partial

Outcome:

- Preserve the control-tower story while making it operationally safer and more truthful.

Execution checklist:

- [x] replace alpha-only session gate with real role-backed access
- [x] move audit events to durable backend storage
- [x] distinguish active sessions from accepted invites in metrics
- [ ] track subscription truth from billing systems rather than plan heuristics
- [ ] define tenant lifecycle states formally

### 8. Security And Deployment Hardening

Status: In progress

Outcome:

- Remove alpha-only security shortcuts and make deployment safer.

Execution checklist:

- [x] narrow CORS by environment
- [x] remove dev fallback secrets outside local development
- [x] replace auto table creation with migrations in controlled environments
- [x] validate required env vars on startup
- [x] document port, secret, and integration handling by environment
- [ ] add logging and error-reporting expectations

### 9. Design System And UX Consolidation

Status: Partial

Outcome:

- Carry the alpha visual quality into a stable system and compare it against the external adopted build when available.

Execution checklist:

- [ ] capture reusable patterns from the alpha branch into a formal design system layer
- [ ] review responsive and accessibility gaps across key flows
- [ ] compare the product against the adopted reference build once shared
- [ ] close high-visibility visual inconsistencies across dashboard, artifacts, and Super Admin

## Recommended Beta Order

1. Auth and access
2. Tenant/workspace provisioning
3. Core workflow backend truth
4. Invite delivery
5. Payments and subscriptions
6. Supplier sandbox path
7. Super Admin hardening
8. Security and deployment hardening
9. Design consolidation

## Exit Criteria For Beta Foundations

- secure role-backed access is in place
- the founder path runs on backend truth, not local-only state
- invites are provider-backed in test mode
- subscription metrics reflect billing-system truth
- one supplier sandbox path is demonstrably real
- Super Admin metrics are no longer only heuristic
- the system is materially safer than alpha for pilot use
