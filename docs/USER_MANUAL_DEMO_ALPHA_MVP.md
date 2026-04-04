# NAMA User Manual: Demo, Alpha, and MVP

## 1. Who This Is For

This manual is for founders, operators, internal reviewers, and future developers who need to understand how to use NAMA without asking for live guidance every step of the way.

## 2. What To Expect

NAMA has three practical layers:
- Demo: the rehearseable founder journey
- Alpha: the stable operating preview
- MVP: the future durable product

The current repo is strongest in the Demo and Alpha layers.

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

### 3.2 Add Team Members

Open `/dashboard/team`.

You can:
- import employees from CSV
- invite an individual team member
- send bulk invites
- inspect invite and member status

### 3.3 Work A Lead

Open `/dashboard/leads`.

Use this page to:
- search and filter leads
- inspect contact context
- change stage
- open the related deal workspace

### 3.4 Review The Deal

Open `/dashboard/deals?case=...`.

Use this page to:
- review the commercial rationale
- inspect supplier comparison
- see quote and margin context
- move into finance or execution

### 3.5 Record Finance

Open `/dashboard/finance`.

Use this page to:
- send a quote
- record a deposit
- review the finance state
- move the case toward booking readiness

### 3.6 Execute Bookings

Open `/dashboard/bookings?case=...`.

Use this page to:
- release the guest pack
- review booking state
- confirm the handoff into traveler output

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

### 3.8 Use Super Admin

Open `/super-admin/login`.

Use this route to:
- access the control tower
- review tenant health
- inspect audit snapshots
- rotate credentials or sessions in test scenarios
- exit back to the login route when done

## 4. How To Use Alpha Safely

- Use Alpha like a rehearsal environment.
- Expect the core paths to work.
- Do not assume every long-tail module is production-complete.
- If a screen reads like a preview or sandbox, treat it that way.
- If a route redirects, that is intentional and should prevent dead ends.

## 5. What Not To Expect Yet

- live email delivery for every invite
- production-grade payments in every market
- full supplier booking truth across all adapters
- complete analytics truth for every module
- every long-tail module to be fully hardened

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

## 7. Demo Sequence For Presentations

1. Register a workspace.
2. Show team invite setup.
3. Move one lead into a deal.
4. Record a deposit in finance.
5. Release the booking guest pack.
6. Open the invoice and traveler PDF.
7. Finish in Super Admin to show audit and tenant oversight.

## 8. MVP View

For the future MVP, the user experience should become more durable:
- more state should live in the backend
- more screens should reflect live business truth
- decision and outcome data should become queryable
- supplier and payment actions should be backed by stronger integrations

