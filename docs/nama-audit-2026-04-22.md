# NAMA Audit — 2026-04-22

## Executive Summary

NAMA has a broad, impressive frontend surface and a real modular product direction, but the current build is a hybrid of:

- production-routed pages that are visually complete,
- backend-powered modules that appear real when the backend is healthy,
- demo/fallback-heavy modules that degrade gracefully,
- partially connected flows where handoff exists at the UI layer but does not yet complete the full operational lifecycle end-to-end.

The strongest connected areas today are:

- authentication and dashboard shell,
- quotations,
- bookings,
- documents,
- finance,
- communications,
- Dynamix page 1 and page 2 flow into quotation and booking entry points.

The weakest areas today are:

- truthful product-state reporting inside internal status pages,
- some infrastructure/security hygiene,
- several modules that are still stub/beta behind polished UI,
- Dynamix full downstream operational stitching after quotation creation.

## What Is Built vs Pending

### Built or Mostly Built

- Public marketing site and onboarding surfaces
- Login, register, forgot password
- Dashboard shell, navigation, role-gated internal areas
- Leads, quotations, bookings, finance, documents, vendors, content, comms
- Dynamix hidden route family with builder/send/approval flow
- Capture widget proxy and demo mode
- Vercel production deployment flow
- Railway rewrite plumbing for `/api/*`

### Partially Built or Degraded

- Smart pricing and some intelligence features rely on fallback benchmarks or seed data
- Visa/document OCR pipeline is explicitly placeholder-backed in parts of the backend
- White-label/customer portal is visually present but not fully proven as a live tenant flow
- Reports, contracts, routines, automations, sentinel, integrations are substantial but not uniformly production-hardened
- Some modules present polished UI while relying on fallback/demo behavior when backend/envs are missing

### Pending / Not Fully Real Yet

- Fully live corporate travel workflow
- End-to-end contract/e-sign maturity
- True vendor marketplace / bidding maturity
- Several external integrations only become real when env-backed services are configured
- Full Dynamix downstream lifecycle automation into confirmations, vouchers, invoices, and finance records

## X-Ray Audit

### Design and UX

Strengths:

- Strong ambition and breadth
- Dashboard visual language is coherent
- Dynamix now has a distinct sub-product identity
- Public landing page is commercially strong

Issues:

- Internal “status” surfaces overstate module completeness
- Some pages are production-grade, others are clearly seed/demo-backed but visually indistinguishable from live modules
- There are multiple design languages across the product: dashboard, Dynamix, Intentra, public site
- Some modules use dense seed data that can mask missing backend connectivity

Recommended direction:

- Split module labels into `Live`, `Partial`, `Demo-backed`, `Stub`
- Add visible operational state badges when a module is using fallback/demo mode
- Consolidate shared page patterns for analytics/ops modules

## Workflow Connectivity

### Core NAMA Spine

The codebase’s real operational spine is:

1. Leads / Queries
2. Itineraries
3. Quotations
4. Payments
5. Bookings
6. Documents
7. Finance
8. Comms / follow-up

This spine exists conceptually and in route structure, but different modules are connected at different maturity levels.

### Dynamix Connectivity

Dynamix is **partially connected**, not fully disconnected and not fully integrated.

What is connected:

- Dynamix quote flow uses `quotationsApi.create(...)`
- Dynamix send flow intentionally hands off into the existing Quotations module
- Dynamix builder links into existing Bookings, Quotations, and Comms entry points
- Dynamix missing-destination and weather routes are now part of the live route family

What is not fully connected:

- Dynamix does not automatically create a downstream booking lifecycle record after quotation acceptance
- Dynamix handoff into Quotations is partly mediated by local storage (`src/lib/dynamix-handoff.ts`)
- Vouchers, confirmations, invoices, and finance are not automatically chained from a finalized Dynamix package
- The documents/finance lifecycle remains a separate core-NAMA pathway rather than a completed Dynamix-native orchestration

Conclusion:

Dynamix is currently a **front-door packaging and quote-shaping experience** that hands into NAMA modules, but it is not yet a fully stitched end-to-end module graph through confirmations, vouchers, invoices, and ops.

## Security Review

### Issues Found

1. `.env.local` was tracked in git
   - Fixed in this audit: file removed from tracking and `.gitignore` updated.

2. `/api/v1/health` was not treated as public in middleware even though public pages use it
   - Fixed in this audit by adding it to the public middleware allowlist.

3. Public repo exposure risk
   - The repo contains operational architecture and env naming that should ideally not be public.
   - Some demo tokens/placeholders and infrastructure metadata are visible.
   - `.vercel` itself is ignored, which is good.

4. Plaintext secret storage warning in backend comments
   - `backend/app/api/v1/sentinel.py` explicitly notes TODO encryption for sentinel API keys.

5. Structural session checks exist in some frontend route utilities
   - `src/lib/api-auth.ts` session validation is shape-based for certain frontend proxy routes, not signature verification.
   - The edge middleware does verify JWT signatures, which is better, but auth logic is split and deserves consolidation.

6. Large amount of demo fallback behavior
   - This is a product risk more than a vulnerability, but it can create false confidence in operational readiness.

### Overall Security Assessment

- Frontend deploy posture: acceptable for staging/controlled production
- Repo hygiene posture: needs tightening
- Secret-management posture: mixed
- Public-repo posture: not ideal for a live operating system

## Can the GitHub Repo Be Made Private?

Yes.

Making the GitHub repo private does **not** break the live website as long as:

- Vercel and Railway remain connected to the repo or branch with valid access,
- deploy keys / GitHub app access remain intact,
- team members who need code access are explicitly granted access.

Important distinction:

- Website access: unaffected by repo privacy
- Human/collaborator repo access: must be granted explicitly
- AI access in a future session: depends on what workspace/repo access exists in that session

Recommendation:

- Make the repo private
- rotate any secrets that may ever have been committed historically
- audit Git history for sensitive values before assuming privacy alone is enough

## Recommended Next Steps

### Highest Priority

1. Finish Dynamix downstream integration:
   - quotation accepted -> booking created
   - booking created -> confirmation/voucher/doc pipeline
   - document lifecycle -> finance ledger visibility

2. Reclassify internal module/status dashboards to reflect truth

3. Audit git history for env leakage, then make repo private

4. Encrypt or rework sensitive config storage paths flagged in backend comments

### Medium Priority

1. Unify auth strategy across middleware and frontend API proxies
2. Add explicit “demo/fallback mode” UI labels on fallback-powered modules
3. Normalize design system usage across ops modules and specialty modules

### Lower Priority

1. Expand the Dynamix local theme pass across the remaining subpages
2. Tighten route-by-route production-readiness scoring
