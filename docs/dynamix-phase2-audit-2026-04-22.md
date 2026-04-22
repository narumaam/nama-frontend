# Dynamix Phase 2 Audit — 2026-04-22

## What Changed

- Rebuilt `/dynamix/builder` into a package-detail page closer to the Pickyourtrail customization pattern while preserving the existing NAMA DYNAMIX visual language.
- Kept itinerary drag-and-drop on page 2 and added an inline `Add activity` flow so customization happens inside the itinerary instead of in disconnected side UI.
- Strengthened Dynamix lifecycle stitching so the route family can create or carry:
  - CRM lead
  - itinerary
  - quotation
  - booking draft
- Tightened Dynamix auth/session behavior so server-side Dynamix APIs use the same primary session source as the rest of the app.
- Added ownership checks for persisted Dynamix search results.
- Consolidated middleware security behavior into one active middleware file.
- Hardened payment-link creation against tenant/quotation mismatches.

## What Is Now Better

### UX / Flow

- Page 2 now behaves like a proper holiday detail workspace:
  - hero/media
  - trip summary
  - inclusions/exclusions
  - itinerary customization
  - trust/commercial context
  - final actions
- Add-activity decisions now happen inside the itinerary context, which is closer to the customization loop the reference experience handles well.
- The builder now shows clearer downstream handoff awareness into Bookings, Documents, Finance, Quotations, and Comms.

### Lifecycle Stitching

- Dynamix send can now create live upstream records before quotation creation.
- Approval can create a live booking draft using the backend booking contract.
- Quotations dashboard can preload lead and itinerary IDs from the Dynamix handoff.

### Security / QC

- Root middleware now carries both:
  - auth verification
  - CSP / X-Frame-Options hardening
- `x-user-id` forwarding now uses the backend `user_id` claim instead of incorrectly treating `sub` as the user ID.
- Dynamix auth helpers now prefer the primary `nama_auth` session and forwarded verified headers.
- `/api/dynamix/results` is now session-aware for persisted search reads.
- Payment links now validate quotation existence and tenant ownership before creation.
- Login now fails if secure session-cookie setup fails.
- Frontend API client now attempts refresh-token flow before forced logout on `401`.

## Remaining Gaps

### High-value but not fully completed

- The platform still uses `nama_token` in `localStorage` as a fallback/session convenience layer.
- A full zero-localStorage auth model is still pending if we want the frontend to rely only on HttpOnly cookie + refresh flow.
- Dynamix still hands into downstream NAMA modules rather than auto-triggering every document/finance artifact from one single approval event.

### Recommended next phase

1. Remove persistent access-token storage from `localStorage`.
2. Move the frontend to cookie-first session hydration with refresh-token renewal.
3. Add an automated post-booking orchestration path:
   - confirmation document
   - voucher generation
   - invoice generation
   - finance entry follow-through
4. Add integration tests around:
   - login -> cookie set -> refresh -> logout
   - Dynamix search ownership isolation
   - quotation -> booking -> payment-link path

## Current Read

Dynamix is now much closer to a coherent sub-product rather than a chain of adjacent prototype screens. The main page-to-page travel-design flow is materially stronger, page 2 is more aligned with a modern package customization experience, and the live NAMA module handoff is more credible and safer than before.
