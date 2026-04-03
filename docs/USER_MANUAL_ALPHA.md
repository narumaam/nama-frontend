# User Manual For Alpha

## Who This Is For

This manual is for founders, demo operators, and internal reviewers using the current alpha branch.

## 1. Register A Workspace

Go to `/register`.

Fill in:

- company and operator details
- subscription plan
- white-label settings
- domain preference
- support contact
- banking and billing details

Submit the form to create the current workspace profile for the demo environment.

## 2. Open The Dashboard

After registration, the app routes into the dashboard.

Use the shell to move between:

- overview
- leads
- deals
- finance
- bookings
- team
- admin
- artifacts
- other preview modules

The shell adapts to the active tenant branding where supported.

## 3. Import Employees And Send Invites

Open `/dashboard/team`.

From this page you can:

- download the employee CSV template
- upload an employee list
- select one employee and send an individual invite
- select multiple employees and send a bulk invite

Accepted invites can be opened through the generated invite route.

## 4. Progress The Core Case Flow

Use the main workflow screens in sequence:

1. Leads
2. Deals
3. Finance
4. Bookings
5. Artifacts

These screens share the demo workflow state, so actions taken in one stage appear downstream in the next stage.

## 5. Review Branded Outputs

Use:

- `/dashboard/invoices/[case]`
- `/dashboard/traveler-pdf/[case]`
- `/dashboard/artifacts`
- `/dashboard/demo-pack/[case]`

These routes reflect the active tenant’s brand, support details, workspace domain, and remittance information where available.

## 6. Use Super Admin

Start from `/super-admin/login`.

This is the separate platform-control entry URL for NAMA internal operators. Customer users should continue through `/register` and tenant workspace routes.

From there, continue into `/dashboard/admin`.

In the current alpha, the Super Admin route uses a lightweight session gate designed for demo separation. It is not the final production auth model.

Use this page to:

- inspect seeded tenants
- review MRR and tenant-health signals
- seed demo scenarios
- reset demo data
- view the tenant lifecycle board
- filter the activity timeline
- export or print audit outputs

For a printable report, open `/dashboard/admin/audit-report`.

## 7. Demo Lab

Inside Super Admin, Demo Lab lets you:

- seed a founder journey
- seed a small-agency scenario
- seed an ops-heavy DMC scenario
- seed negative QA paths such as invite backlog and finance overdue
- reset the demo state

This is the fastest way to prepare repeatable walkthrough data.

## 8. Smoke Tests

Available commands:

- `npm run build`
- `npm run lint`
- `npm run smoke:founder`
- `npm run smoke:small-agency`
- `npm run smoke:ops-dmc`

Run smoke scenarios sequentially, not in parallel, because the harness resets local build output as part of its run.

## 9. Known Limits In Alpha

- Invite emails are demo-link driven, not provider-delivered.
- Payments and supplier integrations are readiness or sandbox scaffolds, not full live operations.
- Some modules are preview-grade and intentionally partial.
- Security posture still needs a dedicated hardening pass before production or customer pilot use.

## 10. Recommended Demo Sequence

1. Seed the founder or small-agency scenario in Super Admin.
2. Review registration and branding setup.
3. Show team import and invite flow.
4. Walk the lead to finance to booking continuity.
5. Open the invoice, traveler PDF, and demo pack.
6. End on the Super Admin audit report and lifecycle board.
