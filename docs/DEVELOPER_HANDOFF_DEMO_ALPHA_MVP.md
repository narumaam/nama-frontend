# Developer Handoff

## Branch And Current State

- Primary working branch: `codex/beta-foundations`
- Current head should be checked before new work begins
- Strongest verified path is the founder journey plus tenant-role and super-admin access flows

## Live Surfaces

- `getnama.app` is the public waitlist and brand entry.
- `demo.getnama.app` is the live app demo.
- `ekla.getnama.app` is the EKLA support surface.
- `kosha.getnama.app` is the remittance surface.

## What Is Reliable Today

- Auth, sessions, invites, and workspace activation
- Founder-path continuity from leads to artifacts
- Super Admin route separation
- Build and smoke coverage for key routes
- Live domain splits for waitlist, demo, EKLA, and Kosha

## What Needs Attention First

1. CRM/deals backend truth
2. Communications provider-backed flow
3. Supplier / DMC operational truth
4. Analytics trustworthiness
5. Documentation consolidation

## Key Frontend Areas

- `src/app/register/page.tsx`
- `src/app/workspace/login/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/leads/page.tsx`
- `src/app/dashboard/deals/page.client.tsx`
- `src/app/dashboard/finance/page.tsx`
- `src/app/dashboard/bookings/page.tsx`
- `src/app/dashboard/invoices/[case]/page.tsx`
- `src/app/dashboard/traveler-pdf/[case]/page.tsx`
- `src/app/dashboard/team/page.tsx`
- `src/app/dashboard/admin/page.tsx`

## Key Backend Areas

- `backend/app/api/v1/tenant_members.py`
- `backend/app/api/v1/tenant_invites.py`
- `backend/app/api/v1/tenant_sessions.py`
- `backend/app/api/v1/demo.py`
- `backend/app/api/v1/demo_workflow_store.py`
- `backend/app/api/v1/demo_founder_contract_store.py`
- `backend/app/api/v1/bookings.py`
- `backend/app/api/v1/financials.py`
- `backend/app/api/v1/payments.py`

## Test Commands

- `npm run lint`
- `npm run build`
- `npm run smoke:founder`
- `npm run smoke:tenant-roles`
- `npm run smoke:super-admin`
- `npm run smoke:route-audit`
- backend founder/session/workflow pytest suites

## Implementation Guidance

- Keep build and smoke runs sequential because `.next` can conflict
- Avoid widening preview-only language on weak modules
- Prefer API-first state changes over local-only page state
- Treat Demo, Alpha, and MVP as one codebase with different maturity layers, not separate products
- Keep the live domain map explicit so `getnama.app`, `demo.getnama.app`, `ekla.getnama.app`, and `kosha.getnama.app` do not drift back onto the wrong project

## Post-Alpha Reminder

The “decision trace / context graph / learning layer” concept should be reviewed after Alpha closeout, not during the current Alpha stabilization push.
