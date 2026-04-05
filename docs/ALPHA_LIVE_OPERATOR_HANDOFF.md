# Alpha Live Operator Handoff

## Purpose

This is the short operator-facing handoff for the Alpha-live slice that should be shown tomorrow morning.

It is written to keep the live story credible, bounded, and easy to present without overclaiming maturity.

## Branch And Safety Baseline

- Primary branch: `codex/beta-foundations`
- Use the latest pushed state only after a successful build and smoke pass
- Keep build and smoke runs sequential because `.next` can conflict

## What Is Safe To Show

Use these as the backbone of the presentation:

- `/register`
- `/workspace/login`
- `/dashboard`
- `/dashboard/leads`
- `/dashboard/deals?case=maldives-honeymoon`
- `/dashboard/finance`
- `/dashboard/bookings`
- `/dashboard/invoices/maldives-honeymoon`
- `/dashboard/traveler-pdf/maldives-honeymoon`
- `/dashboard/team`
- `/dashboard/admin`
- `/super-admin/login`

## Recommended Alpha-Live Narrative

1. Register a workspace.
2. Enter the dashboard through the real member/login path.
3. Open the overview and then the founder demo pack.
4. Walk the core case through leads, deals, finance, bookings, invoice, and traveler PDF.
5. Show team/invite continuity only if needed.
6. End with super-admin visibility and the audit posture.

## What To Avoid Overselling

These areas are present, but should be described as continuity or supporting layers rather than fully mature product surfaces:

- analytics
- content
- comms
- DMC
- itineraries
- autopilot
- EKLA
- evolution

## Presenter Notes

- Use overview as the return point if the walk branches into any supporting screen.
- Keep the core deal case as the anchor for the story.
- If you open Autopilot, EKLA, Evolution, Analytics, or Content, return immediately to leads, the core deal, finance, or bookings.
- Do not frame the learning layer as production autonomous retraining.
- Do not frame the support screens as the end of the demo.

## Verification Sequence

Run these in order:

1. `npm run lint`
2. `npm run build`
3. `npm run smoke:founder`
4. `npm run smoke:tenant-roles`
5. `npm run smoke:super-admin`
6. `npm run smoke:route-audit`

If any step fails, fix only the blocker that affects the live Alpha path.

## Next Fix Order After Alpha-Live

1. CRM and deals durability
2. Comms/provider-backed flow
3. Supplier and DMC truth
4. Analytics trustworthiness
5. Documentation consolidation

## Post-Alpha Reminder

Decision traces, context graphs, and learning-layer productization should be reviewed after Alpha closeout, not during the current Alpha stabilization push.
