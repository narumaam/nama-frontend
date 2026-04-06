# Hosted Demo Route Map

## Goal

This is the safest hosted investor-demo route for the current `codex/beta-foundations` branch.

Use this sequence for live walkthroughs. It prioritizes the strongest working surfaces and avoids the weakest narrative-only modules unless they are explicitly introduced as appendix material.

## Live Surface Map

- `getnama.app`: public waitlist and brand entry
- `demo.getnama.app`: live app demo
- `ekla.getnama.app`: EKLA support surface
- `kosha.getnama.app`: Kosha remittance surface

## Primary Demo Path

1. `/register`
2. `/dashboard`
3. `/dashboard/team`
4. `/dashboard/leads`
5. `/dashboard/deals?case=maldives-honeymoon`
6. `/dashboard/finance`
7. `/dashboard/bookings?case=maldives-honeymoon`
8. `/dashboard/invoices/maldives-honeymoon`
9. `/dashboard/traveler-pdf/maldives-honeymoon`
10. `/dashboard/artifacts`
11. `/super-admin/login`
12. `/dashboard/admin?entry=super-admin`
13. `/dashboard/admin/audit-report`

## Safe Secondary Screens

These are acceptable appendix screens if the main route is already landed cleanly:

- `/dashboard/analytics`
- `/dashboard/comms`
- `/dashboard/dmc`
- `/dashboard/content`
- `/dashboard/itineraries`

Use these only as supporting proof that the product is becoming a broader operating system. Do not let them replace the main founder flow.

If the presenter wants to widen the story outside the main founder path, `ekla.getnama.app` and `kosha.getnama.app` are better live proofs than the most conceptual dashboard screens.

## Screens To Contain Carefully

These screens are still more conceptual than operational and should not be treated as the backbone of a hosted investor demo:

- `/dashboard/autopilot`
- `/dashboard/ekla`
- `/dashboard/evolution`

If shown, present them as roadmap-adjacent control layers or operating concepts, not as the strongest proof of product readiness.

## Operator Rules

- Always start from the registration or dashboard path, not from a conceptual module.
- Prefer the `maldives-honeymoon` case for live walkthrough continuity.
- If the presenter wants to show tenant control, use Team after Overview, not before Registration.
- If a secondary screen feels too speculative in the moment, skip it and return to Finance, Bookings, Artifacts, or Admin.

## Backup Path

If any supporting page feels unstable or too explanatory, use this compressed route:

1. `/register`
2. `/dashboard`
3. `/dashboard/leads`
4. `/dashboard/deals?case=maldives-honeymoon`
5. `/dashboard/finance`
6. `/dashboard/bookings?case=maldives-honeymoon`
7. `/dashboard/invoices/maldives-honeymoon`
8. `/dashboard/admin?entry=super-admin`

## Verification

The current core route has already been strengthened by:

- `npm run lint`
- `npm run build`
- `npm run smoke:founder`
- `npm run smoke:tenant-roles`
- `npm run smoke:super-admin`
- `npm run smoke:route-audit`
