# NAMA User Manual: Demo, Alpha, and MVP

## 1. Who This Is For

This manual is for founders, operators, internal reviewers, and future developers who need to understand how to use NAMA without asking for live guidance every step of the way.

## 2. What To Expect

NAMA has three practical layers:
- Demo: the rehearseable founder journey
- Alpha: the stable operating preview
- MVP: the future durable product

The current repo is strongest in the Demo and Alpha layers.
Analytics, comms, content, autopilot, and evolution are useful walkthrough surfaces, but they are not all equally durable yet.

## 2.2 Module Reality Check

### Ready For Demo And Alpha

- registration
- team invites
- leads
- deals
- finance
- bookings
- invoices
- traveler PDF
- super-admin access
- dashboard shell

### Present But Partial

- analytics
- comms
- content
- DMC
- autopilot
- EKLA
- evolution
- itineraries

### Future MVP Truth

- persistent backend records for all workflow objects
- production payment and supplier integrations
- structured decision traces and outcome learning
- richer observability and release engineering

## 2.1 Fast Route Map

- Founder onboarding: `/register`
- Tenant member login: `/workspace/login`
- Super Admin login: `/super-admin/login`
- Overview: `/dashboard`
- Team: `/dashboard/team`
- Leads: `/dashboard/leads`
- Deals: `/dashboard/deals?case=...`
- Finance: `/dashboard/finance`
- Bookings: `/dashboard/bookings?case=...`
- Artifacts: `/dashboard/artifacts`
- Invoice: `/dashboard/invoices/[case]`
- Traveler PDF: `/dashboard/traveler-pdf/[case]`

## 3. How To Use The Demo

### 3.1 Register A Workspace

Open `/register`.

Enter:
- company name
- workspace operator
- plan
- branding or domain options if shown
- access code confirmation

After submission, the dashboard opens with the workspace identity in place.
If the route redirects, it should send you to the correct signed-in workspace or the matching login surface rather than leaving you stranded.

### 3.2 Add Team Members

Open `/dashboard/team`.

You can:
- import employees from CSV
- invite an individual team member
- send bulk invites
- inspect invite and member status
- use the invite handoff to move a teammate into workspace login without inventing a second onboarding path

### 3.3 Work A Lead

Open `/dashboard/leads`.

Use this page to:
- search and filter leads
- inspect contact context
- change stage
- open the related deal workspace
- confirm that the follow-on finance and booking state stays visible after the stage change

### 3.4 Review The Deal

Open `/dashboard/deals?case=...`.

Use this page to:
- review the commercial rationale
- inspect supplier comparison
- see quote and margin context
- move into finance or execution
- verify the case still resolves correctly after navigation or reload

### 3.5 Record Finance

Open `/dashboard/finance`.

Use this page to:
- send a quote
- record a deposit
- review the finance state
- move the case toward booking readiness
- check that invoice and traveler artifact screens reflect the updated finance state

### 3.6 Execute Bookings

Open `/dashboard/bookings?case=...`.

Use this page to:
- release the guest pack
- review booking state
- confirm the handoff into traveler output
- make sure the invoice and traveler PDF pages mirror the booking handoff

### 3.7 Review Customer Artifacts

Open:
- `/dashboard/invoices/[case]`
- `/dashboard/traveler-pdf/[case]`
- `/dashboard/artifacts`
- `/dashboard/demo-pack/[case]`

Use these pages to:
- verify branded invoice state
- verify traveler PDF release state
- print or save the customer-facing outputs
- show a coherent handoff from finance to booking to artifact output during a demo

### 3.8 Use Super Admin

Open `/super-admin/login`.

Use this route to:
- access the control tower
- review tenant health
- inspect audit snapshots
- rotate credentials or sessions in test scenarios
- exit back to the login route when done
- separate platform control from customer workspace behavior

## 4. How To Use Alpha Safely

- Use Alpha like a rehearsal environment.
- Expect the core paths to work.
- Do not assume every long-tail module is production-complete.
- If a screen reads like a preview or sandbox, treat it that way.
- If a route redirects, that is intentional and should prevent dead ends.
- If something looks stale after a reload, check the session first before assuming the page is broken.
- Keep the demo story focused on the connected spine: overview, leads, deals, finance, bookings, artifacts, and super-admin.

## 5. What Not To Expect Yet

- live email delivery for every invite
- production-grade payments in every market
- full supplier booking truth across all adapters
- complete analytics truth for every module
- every long-tail module to be fully hardened
- fully productized learning or decision-trace flows in the current release

## 6. Common Troubleshooting

### 6.1 I Cannot Sign In

Check that:
- the email matches the role being used
- the access code is the current one
- the session was not revoked

### 6.2 A Route Redirects Me Away

That usually means:
- the role does not have access to that screen
- the current session is missing or expired
- the route is meant for a different workspace layer

### 6.3 A State Change Does Not Appear

Refresh the page and confirm you are on the right case slug. The latest workflow state should be visible on the related downstream screen if the action was successful.

### 6.4 The Page Says Preview Or Sandbox

That wording is intentional on some surfaces. It means the screen is still part of the current Demo/Alpha story and should be presented honestly until the MVP backend truth is ready.

### 6.5 A Long-Tail Module Feels Narrative-Heavy

Treat that screen as a guided preview unless the module status in the PRD or handoff says it is ready. The core demo should not depend on those screens for a successful walkthrough.

## 7. Demo Sequence For Presentations

1. Register a workspace.
2. Show team invite setup.
3. Move one lead into a deal.
4. Record a deposit in finance.
5. Release the booking guest pack.
6. Open the invoice and traveler PDF.
7. Finish in Super Admin to show audit and tenant oversight.
8. If you want the cleanest story, end by returning to the dashboard overview so the shell continuity is visible.

## 8. MVP View

For the future MVP, the user experience should become more durable:
- more state should live in the backend
- more screens should reflect live business truth
- decision and outcome data should become queryable
- supplier and payment actions should be backed by stronger integrations
- the current demo language should gradually be replaced by product language as durability improves
