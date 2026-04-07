# Demo, Alpha, And MVP Status Board

## Summary

This board is the short-form operating view of current readiness.

## Current Live Surfaces

- `getnama.app` is the public waitlist and brand entry.
- `demo.getnama.app` is the live app demo.
- `ekla.getnama.app` is the EKLA support surface.
- `kosha.getnama.app` is the Kosha remittance surface.

## Demo Status

### Strong

- registration
- workspace login
- team and invites
- leads
- deals
- finance
- bookings
- invoice
- traveler PDF
- super-admin access

### Partial But Usable

- analytics
- content
- comms
- DMC
- itineraries

### Contain Carefully

- autopilot
- EKLA
- evolution

### Live Adjacent Proof

- `ekla.getnama.app`
- `kosha.getnama.app`

## Safe Demo Route

Use this when you want the shortest credible live story:

1. `/register`
2. `/dashboard`
3. `/dashboard/leads`
4. `/dashboard/itineraries`
5. `/dashboard/deals?case=maldives-honeymoon`
6. `/dashboard/finance`
7. `/dashboard/bookings`
8. `/dashboard/invoices/maldives-honeymoon`
9. `/dashboard/traveler-pdf/maldives-honeymoon`
10. `/dashboard/admin?entry=super-admin`

If the walkthrough branches into analytics, content, or one of the narrative screens, return to the core route immediately after the point is made.

## Alpha Status

### Strong

- auth, sessions, and invite lifecycle
- founder-path continuity
- tenant-role behavior
- route integrity
- super-admin controls

### Partial

- CRM depth
- deal persistence
- analytics truth
- supplier and message provider depth

### Presenter Story

- Alpha is credible when shown as a bounded live operating layer, not a complete product claim.
- The founder path is the anchor; supporting surfaces should always return to the core route.
- Keep Autopilot, EKLA, and evolution as supporting context only.
- Use `ekla.getnama.app` and `kosha.getnama.app` as supporting live proof only if the audience asks for adjacent surfaces.

## MVP Status

### Ready To Start

- core auth/access foundation
- founder contract scaffolding
- deployment/env posture

### Main Build Targets

- durable commercial truth
- truthful sandbox external rails
- stronger operational analytics
- deeper module completion

### Handoff Rule

Do not describe Alpha support surfaces as MVP-complete. The MVP roadmap should stay separate from the live Demo/Alpha story until the next build phase starts.

## Module Snapshot

| Module | Demo | Alpha | MVP |
| --- | --- | --- | --- |
| Registration / Auth | Strong | Strong | Harden |
| Team / Invites | Strong | Strong | Expand |
| Leads | Strong | Partial | Durable |
| Deals | Strong | Partial | Durable |
| Finance | Strong | Strong | Harden |
| Bookings | Strong | Strong | Harden |
| Artifacts | Strong | Strong | Harden |
| Admin / Super Admin | Strong | Strong | Harden |
| Itineraries | Usable | Partial | Expand |
| Comms | Usable | Partial | Provider-backed |
| Content | Usable | Partial | Publish pipeline |
| DMC | Usable | Partial | Operational truth |
| Analytics | Usable | Partial | Trustworthy BI |
| Autopilot | Narrative | Partial | Productize |
| EKLA | Narrative | Partial | Productize |
| Evolution | Narrative | Partial | Productize |
