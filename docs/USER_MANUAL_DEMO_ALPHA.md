# User Manual: Demo And Alpha

## Who This Is For

This manual is for founders, demo presenters, internal reviewers, and the next developer who needs to understand the current usable flow.

## 1. Register A Workspace

Open `/register`.

Enter:

- company name
- operator name
- admin access code
- plan selection

This creates the tenant-facing workspace entry state.

## 2. Enter The Dashboard

After registration, the system routes into `/dashboard`.

Use the left navigation to move between:

- overview
- leads
- deals
- finance
- bookings
- team
- admin
- artifacts

## 3. Import Employees And Send Invites

Open `/dashboard/team`.

From here you can:

- upload the employee CSV
- save employee records
- send individual invites
- send bulk invites

Accepted users continue through the invite acceptance route and then workspace login.

## 4. Run The Founder Journey

Recommended path:

1. `/dashboard/leads`
2. `/dashboard/deals`
3. `/dashboard/finance`
4. `/dashboard/bookings`
5. `/dashboard/invoices/[case]`
6. `/dashboard/traveler-pdf/[case]`
7. `/dashboard/artifacts`

This is the strongest safe Demo and Alpha path today.
If you open a supporting screen like analytics, content, comms, DMC, autopilot, EKLA, or evolution, come back to the founder path immediately after the point is made.

## 5. Use Super Admin

Open `/super-admin/login`.

This is separate from customer and tenant entry routes.

Use it to:

- review tenant health
- inspect session and audit posture
- open the audit report

## 6. What To Avoid Overselling

The following areas exist, but should be described carefully:

- analytics
- content
- comms
- DMC
- autopilot
- EKLA
- evolution

These are present and useful for narrative continuity, but several are still support-layer screens rather than fully operational product surfaces.

## 7. Recommended Demo Narrative

- Start at registration
- Show team and invite activation
- Walk the same case across leads, deals, finance, and bookings
- Open branded invoice and traveler PDF
- End in Super Admin with audit visibility

## 8. Safe Route Summary

If time is tight, use this order and stop there:

1. `/register`
2. `/dashboard`
3. `/dashboard/leads`
4. `/dashboard/deals?case=maldives-honeymoon`
5. `/dashboard/finance`
6. `/dashboard/bookings`
7. `/dashboard/invoices/maldives-honeymoon`
8. `/dashboard/traveler-pdf/maldives-honeymoon`
9. `/dashboard/admin?entry=super-admin`

That route is the clearest present-day Alpha story and is the safest one for tomorrow’s live handoff.

## 9. Operational Notes

- Run smokes sequentially, not in parallel
- Use founder smoke for the main journey
- Use tenant-role smoke for permissions and side effects
- Use route-audit smoke after a successful build
