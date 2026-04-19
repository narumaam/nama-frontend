# NAMA OS — Product Pipeline

> Last updated: 2026-04-19 · Sprint 3+4
> Living roadmap tracking what's done, what's next, what's planned, and what's parked.

---

## Completed — V1 through Sprint 3+4

### V1 Foundation
- Auth system (email + Google OAuth, HttpOnly JWT cookies)
- Leads CRM (pipeline, assignment, history)
- Itinerary Builder (day-by-day, blocks)
- Quotations (itemised, PDF, send)
- Bookings (confirmation, lifecycle)
- Vendors (profiles, pricing)
- Comms (12-template message library)
- Finance (payments, revenue dashboard)
- Dashboard KPIs (conversion %, pipeline value, activity)

### V2 Operations
- Leads HOT/WARM/COLD rebuild with new pipeline model
- Documents Hub (Invoice, Voucher, Booking Confirmation)
- Comms 12-template library expansion

### V3 Intelligence
- NAMA Copilot (floating AI widget + Paperclip context attachment)
- AI Lead Scoring (4th tab, LLM via OpenRouter + heuristic fallback, SVG ring)
- Smart Pricing benchmarks (live DB aggregates from itineraries table)

### V4 Experience
- Customer Portal (`/portal/[bookingId]` — public, no login)
- Live Trip Tracker embedded in Bookings

### V5 Network
- Vendor Marketplace (10 detailed vendors)
- Intelligence Sync API
- Intelligence Aggregate API
- Context Capture API

### Security Hardening
- HttpOnly JWT cookies (server-side via `/api/auth/set-cookie`)
- API key auth (`requireApiKey`) on all `/api/v1/*` routes
- Full JWT signature verification with jose (`jwtVerify`) in middleware
- CSP / HSTS / X-Frame-Options headers in `next.config.mjs`
- Rate limiting: Upstash sliding window (20 req/min intelligence, 10 auth, 60 context)
- React ErrorBoundary wrapping all dashboard children
- Audit Agent dashboard (16 checks, health score, auto-refresh 30s)

### Security Audit Batch (2026-04-18)
- Demo mode role fix: R3_SALES_MANAGER behaviour, hides R0/R1-only pages
- Page-level role guards on `/dashboard/investor`, `/dashboard/audit`, `/dashboard/status`
- Role guards on `/owner` (R0) and `/super-admin` (R0+R1)
- Demo cookie: SameSite changed from `lax` to `strict`
- Hardcoded Railway URL removed from login/register fallbacks
- Frontend proxy fix: browser always uses relative URLs (eliminates CORS failures)

### Phase 1 — Onboarding + Org (2026-04-19)
- Self-Onboarding Wizard v3 (7 steps, WOW animation, channel setup, Day 0 drip)
- Org & Control Room (5 tabs: intelligence, org chart, role builder, team, subscription)
- Landing Page rewrite (pain-focused copy, Before/After section, ambient CTA)
- AI Lead Scoring v2 (live LLM scoring with provider badge, loading spinner)

### Phase 2 — Backend RBAC + ABAC (2026-04-19)
- Full RBAC models: `roles`, `role_permissions`, `user_role_assignments`, `user_permission_overrides`, `permission_audit_log`
- JSONB ABAC conditions: geography, product_types, customer_types, deal_size, own_data_only, shift hours, valid_until
- `can()` dependency: `Depends(can("leads", "export"))` pattern
- CRUD API at `/api/v1/roles` with bulk permission replace and paginated audit log

### Phase 3 — DMC Marketplace + Content + Rates (2026-04-19)
- VendorRate child pricing (`cost_net_child`, `child_age_min/max`, `markup_amount`)
- DMC Rate Marketplace: cross-tenant public rate browsing and snap-to-library
- Rate Card CSV/Excel import (pandas, flexible alias matching, upsert)
- Itinerary → Rate Card pipeline (auto-lookup by date + season)
- Content Shared Library (master destinations, `is_shared`, `is_master`)
- Pexels image search + save to MediaAsset
- Server-side PDF (WeasyPrint) for quotations and invoices
- Vercel AI Gateway routing for all Claude/LLM calls

### Sprint 2 — Activation + Growth (2026-04-19)
- Email Drip (4 React Email templates: Day 0/1/3/7 via Resend JS SDK)
- Smart Pricing live DB aggregates with fallback benchmarks
- Bulk Lead CSV Import (500-row limit, 12-field map, dedup by email)
- Razorpay Payment Links (25% deposit from quotations)
- Automated Follow-up Reminders (cold/new/stale triggers, per-agent digest)
- Invoice Auto-generation from confirmed bookings
- Team Performance Reports (per-agent KPI table)
- Webhook System (HMAC-SHA256, 8 event types, Zapier-ready)
- Global Full-Text Search (DB-backed, 300ms debounce, grouped results)
- Multi-Currency Infrastructure (live FX rates, CurrencyProvider, CurrencySelector)

### Sprint 3+4 — Channel Integrations + Infrastructure (2026-04-19)
- Website Lead Capture Widget (`public/widget.js`, token-based, rate-limited)
- Per-Tenant SMTP/IMAP Email (Fernet-encrypted passwords, Message-ID threading)
- Facebook Lead Ads + Instagram DM Webhooks (HMAC, auto-lead creation)
- NAMA Routines Live Execution Engine (9 step handlers, shared context)
- Calendar Reminders Real API + iCal feed (`/api/v1/calendar/ics-feed`)
- Infrastructure Sentinel (Vercel + Railway + Neon usage monitoring)
- Role Builder fully wired to backend (`/api/v1/roles`)
- Onboarding AI Setup Step (AgencyConfig JSON DSL generation)
- Setup Checklist Widget + Product Tour (custom, no external packages)
- Content Library UI (Pexels search, destination editor, AI Enhance)

---

## Next Up — Immediate (Next Sprint)

These items are the top priorities for the sprint starting 2026-04-22:

### Holiday Management (just shipped — needs polish)
- [ ] Full CRUD for holiday package creation with pricing tiers
- [ ] Fixed-departure date management and seat availability
- [ ] PDF brochure generation for holiday packages
- [ ] Public shareable holiday package URLs

### NAMA Intel Hub (just shipped — needs polish)
- [ ] Real data wiring to intelligence aggregate API
- [ ] Competitor pricing signal feed
- [ ] Destination trend charts
- [ ] Export intelligence report as PDF

### Knowledge Base (`/docs` — this sprint)
- [x] `docs/MODULES.md` — all 20 modules with completion %
- [x] `docs/TECH_STACK.md` — full technology reference
- [x] `docs/SCREENS_INVENTORY.md` — 43 screens with routes and roles
- [x] `docs/DEVELOPER_HANDOVER.md` — onboarding guide
- [x] `docs/PIPELINE.md` — this file
- [x] `docs/PRD.md` — product requirements
- [x] `docs/README.md` — knowledge base index

### Customer Onboarding Analytics
- [ ] Track per-step completion rate in the 7-step wizard
- [ ] Identify drop-off points with event logging
- [ ] Funnel visualization in Audit Agent dashboard

### Automated Trial-to-Paid Conversion Emails
- [ ] Day 10 trial urgency email (2 days left)
- [ ] Day 14 trial-end email with Razorpay payment link
- [ ] Post-conversion welcome + setup call CTA

---

## Planned — Next 60 Days

### V6 Voice (2026-Q2)
- NAMA Voice: voice itinerary narration, agent training simulations
- Recommended stack: Coqui TTS + OpenVoice + Bark + OpenRouter
- High ROI: multi-language assistant for international DMCs
- Status: Research complete, not started

### Holiday Package PDF Brochures
- WeasyPrint templates for full-colour holiday package PDFs
- Shareable link with expiry and tracking
- Send from Comms module with WhatsApp integration

### Multi-Agency White-Label
- Custom domain support per tenant (`agency.getnama.app` or `nama.agencysite.com`)
- Brand colours and logo per tenant applied across all PDFs and emails
- White-label onboarding with agency's own branding

### Mobile App (React Native)
- iOS and Android app for field sales agents
- Core flows: lead capture, quick quote, booking status
- Push notifications for lead alerts and reminders
- Offline mode with sync

### Referral and Affiliate System
- Referral code generation per agency
- Commission tracking dashboard
- Automated payout to Razorpay linked accounts
- Leaderboard for top referrers

---

## Parked

These items are explicitly deprioritised and will not be built until resources permit:

### NAMA Voice — Research Complete, Not Started
- **Status:** Detailed research done, stack selected, no code written
- **Stack:** Coqui TTS + OpenVoice + Bark + OpenRouter
- **Reason parked:** High implementation complexity, low immediate revenue impact
- **Revisit when:** V5 nodes are fully live and MRR exceeds ₹5L/month

### Advanced ML Forecasting
- Demand forecasting for destination pricing
- Lead conversion probability modelling (beyond current heuristic scoring)
- Reason parked: Requires 6+ months of data accumulation first

### B2B Marketplace for Agents
- Peer-to-peer itinerary and rate sharing between NAMA tenants
- Reason parked: Requires critical mass of tenants (>100 active) first

---

*For the current codebase state, see `CLAUDE.md`. For module completion detail, see `MODULES.md`.*
