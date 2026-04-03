# Alpha Test Data Seeds

## Purpose

This file records the seeded and agent-driven test data available for alpha validation and walkthroughs.

## Seed Sources

- `src/lib/demo-scenarios.ts`
- `src/lib/demo-workflow.ts`
- `src/lib/demo-events.ts`
- `scripts/founder_flow_smoke.mjs`

## Available Scenario Seeds

### Founder

Creates a high-confidence founder walkthrough with:

- a registered tenant
- branding and domain settings
- banking details
- imported employees
- invites sent and accepted
- progressed lead/deal/finance/booking states
- invoice and traveler-PDF artifact state
- audit events

### Small Agency

Creates a smaller-team operating scenario for testing lighter organization setup and a shorter workflow path.

### Ops-Heavy DMC

Creates a scenario weighted toward operations and supplier-facing storylines.

### Invite Backlog QA

Creates a negative-path state focused on pending invites and stalled activation.

### Finance Overdue QA

Creates a negative-path state focused on overdue settlement and operational risk.

## What This Covers

- multiple registrations
- imported employee records
- invite generation
- accepted-user state
- progressed lead and booking states
- finance and artifact milestones
- timeline and audit history

## Verification Paths

- Seed directly in Super Admin Demo Lab.
- Run `npm run smoke:founder`.
- Run `npm run smoke:small-agency`.
- Run `npm run smoke:ops-dmc`.

## Current Limitation

These are alpha demo seeds, not production database fixtures. They are suitable for walkthroughs, validation, and repeatable QA in the current branch.
