# NAMA Developer Handoff Draft

## 1. What This Repo Is Right Now

This repository is a travel operating system with a strong founder-facing Demo/Alpha path and a growing backend contract layer. It is not yet a fully productionized MVP, but it is now coherent enough that a developer can continue from the current branch without guessing the product intent.

## 2. Current Branch State

- Branch: `codex/beta-foundations`
- Latest verified head before this doc pass: `7b2fc54`
- Key verified commands:
  - `npm run lint`
  - `npm run build`
  - `npm run smoke:founder`
  - `npm run smoke:tenant-roles`
  - `npm run smoke:super-admin`
  - `npm run smoke:route-audit`
  - backend pytest coverage for founder contracts, workflow, and session guards

## 3. What Is Already Working

- tenant registration and workspace provisioning
- tenant member invite and acceptance flow
- workspace login and Super Admin login
- signed session validation
- founder workflow progression across leads, deals, finance, bookings, invoices, and traveler docs
- admin / audit surfaces
- route-audit coverage for negative and invalid routes
- Stitch-style shell/onboarding visual direction
- analytics now links back into the live operating flow instead of feeling isolated

## 4. What Is Still Partial

- deeper productization of leads, deals, finance, bookings, comms, content, analytics, DMC, EKLA, and Evolution
- full backend truth for long-tail workflow modules
- persistent product-grade models for all core business objects
- production payment and supplier integrations
- full observability and release engineering around MVP rollout
- eventual decision-trace / learning-layer work should wait until Alpha is done

## 5. Important File Map

### Frontend

- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/register/page.tsx`
- `src/app/workspace/login/page.tsx`
- `src/app/super-admin/login/page.tsx`
- `src/app/dashboard/analytics/page.tsx`
- `src/app/dashboard/leads/page.tsx`
- `src/app/dashboard/deals/page.client.tsx`
- `src/app/dashboard/finance/page.tsx`
- `src/app/dashboard/bookings/page.tsx`
- `src/app/dashboard/invoices/[case]/page.tsx`
- `src/app/dashboard/traveler-pdf/[case]/page.tsx`
- `src/app/api/v1/demo/case/[slug]/route.ts`

### Frontend Contracts And State

- `src/lib/auth-session.ts`
- `src/lib/session-api.ts`
- `src/lib/demo-workflow.ts`
- `src/lib/demo-workflow-contracts.ts`
- `src/lib/demo-api-store.ts`
- `src/lib/demo-profile.ts`
- `src/lib/use-demo-workflow.ts`

### Backend

- `backend/app/main.py`
- `backend/app/api/v1/demo.py`
- `backend/app/api/v1/bookings.py`
- `backend/app/api/v1/financials.py`
- `backend/app/api/v1/payments.py`
- `backend/app/api/v1/tenant_sessions.py`
- `backend/app/api/v1/tenant_invites.py`
- `backend/app/api/v1/tenant_members.py`
- `backend/app/api/v1/demo_founder_contract_store.py`

### Docs

- `docs/PRD_3_3_DRAFT.md`
- `docs/ARCHITECTURE_OVERVIEW_DEMO_ALPHA_MVP.md`
- `docs/USER_MANUAL_DEMO_ALPHA_MVP.md`
- `docs/DEVELOPER_HANDOFF_DRAFT.md`

### Verification

- `scripts/founder_flow_smoke.mjs`
- `scripts/tenant_role_smoke.mjs`
- `scripts/super_admin_smoke.mjs`
- `scripts/route_audit_smoke.mjs`

## 6. Developer Setup

1. Install dependencies.
2. Run the frontend build and lint checks.
3. Run backend pytest for the founder/session contract suites.
4. Run the smoke suite sequentially, not in parallel.
5. Avoid deleting `.next` manually inside smoke runners; the current scripts are already structured to be build-safe.
6. Keep docs and code in sync with the current branch head, not an older mental model.

## 7. Working Rules For A Future Developer

- Do not revert user-authored or agent-authored changes unless explicitly instructed.
- Preserve the current Demo/Alpha experience while hardening the underlying truth.
- Keep same-origin local API routes and backend contract routes aligned.
- Treat visible state on invoice and traveler artifact screens as part of the product, not as a test-only concern.
- Keep smoke scripts honest; they should verify visible user state, not only hidden contract mutations.
- When you update a screen, check whether the corresponding user manual and architecture doc need a refresh too.

## 8. Recommended Next Build Order

1. Complete module-by-module readiness classification for the long-tail surfaces.
2. Continue hardening the backend truth behind the finance, booking, and supplier surfaces.
3. Expand docs for module owners and API contracts if another developer is introduced.
4. Prepare release notes and a small regression matrix before any deploy.
5. Only after Alpha is done, decide whether decision traces become an MVP build item.

## 9. Handoff Notes

- Demo and Alpha are currently good enough for rehearsal and iteration.
- MVP should be treated as a separate productization phase, not as a simple extension of demo state.
- A future developer should start by reading the architecture overview and PRD draft, then run the smoke suite before making changes.
- The first refactor pass should preserve the user-visible continuity that now exists across registration, team, leads, deals, finance, bookings, invoices, and traveler artifacts.
