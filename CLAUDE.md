# NAMA OS — Project Memory

## Current Status: ✅ LIVE · Backend + Frontend both operational

**Last major commit:** Playwright E2E suite — 27/27 passing (auth, leads, bookings, quotations)
**Latest deploy:** Vercel + Railway both auto-deploy on push to main
**Backend health:** `{"status":"healthy","version":"0.3.0"}` — confirmed 2026-04-18

---

## Roadmap Status

### ✅ Completed (V1–V5 + Security + Hardening)

**V1 Foundation:** Auth, Leads CRM, Itinerary Builder, Quotations, Bookings, Vendors, Comms, Finance, Dashboard KPIs

**V2 Operations:** Leads HOT/WARM/COLD rebuild, Documents Hub (Invoice/Voucher/Confirmation), Comms 12-template library

**V3 Intelligence:** NAMA Copilot (floating AI + Paperclip context), AI Lead Scoring (4th tab, SVG ring), Smart Pricing benchmarks

**V4 Experience:** Customer Portal (/portal/[bookingId] — public), Live Trip Tracker in Bookings

**V5 Network:** Vendor Marketplace (10 detailed vendors), Intelligence Sync API, Intelligence Aggregate API, Context Capture API

**Security Hardening:**
- HttpOnly cookies via server-side /api/auth/set-cookie
- API key auth (requireApiKey) on all /api/v1/* routes
- JWT shape validation in middleware (3-segment base64url, min 50 chars)
- /kinetic/:path* added to middleware matcher
- Full CSP/HSTS/X-Frame-Options headers in next.config.mjs
- vercel.json: /api/auth/* and /api/v1/* excluded from Railway proxy

**Hardening (latest batch):**
- Rate limiting: in-memory sliding window (src/lib/rate-limit.ts) — 20 req/min intelligence, 10 auth, 60 context
- React ErrorBoundary (src/components/ErrorBoundary.tsx) — wraps all dashboard children
- Global Search cmd+K (src/components/GlobalSearch.tsx) — searches modules/leads/itineraries/vendors
- Notification bell: replaced static dot with real dropdown + seed notifications
- EmptyState component (src/components/EmptyState.tsx) — reusable, ready to wire
- Audit Agent dashboard (/dashboard/audit) — 16 checks, health score, auto-refresh 30s
- framer-motion removed from package.json (~100KB bundle savings)

**Security Audit Batch (2026-04-18):**
- Demo mode nav fix: demo now acts as R3_SALES_MANAGER (hides Investor, Audit Agent, System Status)
- Page-level role guards added to /dashboard/investor (R0 only), /dashboard/audit (R0+R1), /dashboard/status (R0+R1)
- Role guards added to /owner (R0 only) and /super-admin (R0+R1)
- Settings ROLES + SEED_TEAM updated to canonical role IDs (R2_ORG_ADMIN, R3_SALES_MANAGER, R4_OPS_EXECUTIVE, R5_FINANCE_ADMIN)
- Demo cookie hardened: sameSite changed from 'lax' to 'strict'
- Hardcoded Railway URL removed from login.tsx and register.tsx fallbacks
- Middleware: full JWT signature verification with jose (jwtVerify) — already in place
- EmptyState wired to leads, bookings, clients pages
- **Frontend proxy fix (src/lib/api.ts):** browser on production now always uses relative URLs → vercel.json proxies to Railway, eliminating CORS failures on /api/v1/leads, /api/v1/bookings, /api/v1/quotations

### ✅ Phase 1 Features (2026-04-19)

**Self-Onboarding Wizard v2** (src/app/onboarding/page.tsx — 967 lines)
- 6-step wizard: Welcome → Live AI Triage Demo → Connect Channels → Build Team → AI Workspace → Launch
- Step 2 = WOW moment: WhatsApp bubble → 3-phase extraction animation → SVG ring 0→87% (requestAnimationFrame)
- Step 6: CSS confetti, elapsed time display, dual CTA (leads or dashboard)
- localStorage key `nama_onboarding_v2`, per-step timing labels

**Org & Control Room** (src/app/dashboard/org/page.tsx — 1311 lines, NEW)
- Tab 1 Founder Intelligence: KPI cards, revenue-leak AI banner, agent leaderboard, risk feed
- Tab 2 Org Chart: pure CSS flexbox tree with ghost Add Member leaves
- Tab 3 Role Builder: 6-role selector + 22-permission toggle matrix, inline role creation
- Tab 4 Team Management: inline invite, table, bulk actions, per-member menus
- Tab 5 Subscription: usage bars, plan comparison, CSS bar chart
- Wired into sidebar as "Org & Control" (R0/R1/R2, Building2 icon, New badge)

**Landing Page Rewrite** (src/app/page.tsx — 894 lines)
- Pain-focused hero copy, Pain section (3 dark scenario cards)
- AI Differentiators 2x2 grid with sample AI output blocks
- Before/After comparison section, final CTA with ambient glow
- "240+ agencies" social proof, all live triage demo retained

**AI Lead Scoring v2** (backend/app/api/v1/copilot.py + leads/page.tsx)
- POST /api/v1/copilot/score-lead → OpenRouter LLM scoring with heuristic fallback
- Leads AI tab shows live LLM score with provider badge, loading spinner

### ✅ Phase 2: Backend RBAC + ABAC (2026-04-19)

**Models** (`backend/app/models/rbac.py`):
- `roles`, `role_permissions`, `user_role_assignments`, `user_permission_overrides`, `permission_audit_log`
- JSONB ABAC conditions: geography, product_types, customer_types, deal_size, own_data_only, shift hours, valid_until

**Migration** (`d1e2f3a4b5c6_add_rbac_tables.py`):
- Merges heads: b2c3d4e5f6a7 + c3d4e5f6a7b8
- checkfirst=True, all 5 tables + composite indexes

**API** (`/api/v1/roles`):
- CRUD + bulk permission replace + GET /roles/check (ABAC evaluation)
- User ↔ role assignment + per-user grant/deny overrides + paginated audit log

**`can()` dep** (`deps.py`): `Depends(can("leads", "export"))` — override_deny → override_grant → roles → deny

### ✅ Phase 3: DMC Marketplace + Content + Rates + Onboarding (2026-04-19)

**VendorRate schema extended:**
- `markup_amount` (flat INR/USD override), `cost_net_child`, `child_age_min`, `child_age_max`
- `is_public` (DMC publishes gross rate), `visibility_type` (PRIVATE/PUBLIC/INVITE_ONLY)
- `Vendor.is_dmc` flag — marks vendor as a DMC that publishes to marketplace
- Migration: `e2f3a4b5c6d7_vendor_rate_child_pricing_dmc.py`

**DMC Rate Marketplace:**
- `GET /api/v1/marketplace/rates` — cross-tenant public rates (gross only, cost_net masked)
- `GET /api/v1/marketplace/rates/{id}` — single rate detail
- `POST /api/v1/marketplace/rates/{id}/snap` — copy rate into calling tenant's library
- Frontend: "Rate Marketplace" tab in /dashboard/vendors — filter, browse, snap rates
- "Publish as DMC" toggle on vendor settings

**Rate Card CSV/Excel Import:**
- `POST /api/v1/vendors/import` — fully implemented (was a stub)
- Flexible column alias matching, pandas parser, upsert logic, import summary response
- `GET /api/v1/vendors/import/template` — downloads CSV template
- Added pandas==2.2.3 + openpyxl==3.1.5 to requirements.txt

**Itinerary → Rate Card Pipeline:**
- `GET /api/v1/itineraries/rate-lookup?vendor_id=&date=` — auto-finds matching rate by date+season
- Frontend: vendor dropdown in itinerary block editor triggers live rate lookup
- "Rate locked" badge on blocks with applied rates

**Content Shared Library:**
- `Destination.is_shared`, `is_master`, `source_tenant_id` + `ContentBlock` same fields
- Migration: `f3a4b5c6d7e8_content_shared_library.py`
- `GET /api/v1/content/destinations?include_shared=true` — returns own + master library
- `GET /api/v1/content/image-search?q=` — Pexels API (falls back to Unsplash hardcoded)
- `POST /api/v1/content/image-search/save` — saves selected image as MediaAsset
- `seed_master_destinations()` — 10 NAMA-curated destinations ready to run

**Server-side PDF + Send Quote:**
- WeasyPrint replaces browser print dialog
- `POST /api/v1/documents/quotation-pdf` — returns PDF bytes
- `POST /api/v1/documents/send-quotation` — generates PDF + sends via Resend API
- Frontend: "Download PDF" + "Send to Client" modal on quotations page

**Vercel AI Gateway:**
- `backend/app/core/ai_client.py` — centralized `get_ai_client()` / `get_async_ai_client()`
- Routes through `https://gateway.ai.vercel.com/v1/{team_id}/nama-ai-gateway/anthropic` when env vars set
- All agent files + copilot.py + ai_budget.py updated to use centralized client
- **Railway action needed:** add `VERCEL_AI_GATEWAY_TEAM_ID=team_0ntK3Ywi8mYGSkVagPrRDXhd` + `VERCEL_AI_GATEWAY_NAME=nama-ai-gateway`

**Role Builder wired:**
- `rolesApi.list()`, `rolesApi.create()`, `rolesApi.updatePermissions()` added to `src/lib/api.ts`
- Save button in /dashboard/roles calls `PUT /api/v1/roles/{id}/permissions`
- Create Role calls `POST /api/v1/roles`
- Both /dashboard/roles and /dashboard/org Role Builder tab fully wired
- Backend roles pre-loaded on mount

**Onboarding AI Setup Step:**
- Step 3 replaced with AI Setup: describe agency → Claude generates AgencyConfig JSON DSL
- `POST /api/v1/copilot/generate-config` — keyword fallback config if LLM unavailable
- `POST /api/v1/onboarding/apply-config` — stores config per tenant
- `POST /api/v1/onboarding/seed-workspace` — creates 2 leads + 1 itinerary + 1 quotation on completion
- Dashboard welcome banner on first login (auto-dismisses)

**UX: Setup Checklist + Product Tour:**
- `src/components/ChecklistWidget.tsx` — floating "Get Started" widget (5 steps, localStorage-persisted)
- `src/components/ProductTour.tsx` + `src/lib/tour.ts` — custom tooltip tour, no external packages
- Leads page tour: 3 steps with `data-tour` targets
- Itineraries page tour: 2 steps with `data-tour` targets

**Content Library UI:**
- Pexels image search tab with quick-search chips
- Destination editor: AI Enhance button, cover image picker, meta-tag pills
- NAMA Master Library tab (10 shared destinations)
- "Use in itinerary" clipboard button on content blocks

### 🅱️ Parked — V6: NAMA Voice
**Recommended stack:** Coqui TTS + OpenVoice + Bark + OpenRouter
**High-ROI uses:** Voice itinerary narration, agent training sims, multi-language assistant
**Note:** OpenRouter worth pulling forward for Copilot model routing independently of voice.
**Status:** Research complete. Not started. Revisit when V5 nodes are live.

---

## Pending Actions (User Must Do)

🟡 **ANTHROPIC_API_KEY in Railway** — needed for Copilot Live AI mode
- Go to: Railway → `intuitive-blessing` service → Variables → add `ANTHROPIC_API_KEY`
- Without this, Copilot runs in demo/simulation mode (OpenRouter Llama fallback active)

🟡 **Vercel AI Gateway env vars in Railway** — needed for AI observability + caching
- Add: `VERCEL_AI_GATEWAY_TEAM_ID=team_0ntK3Ywi8mYGSkVagPrRDXhd`
- Add: `VERCEL_AI_GATEWAY_NAME=nama-ai-gateway`
- Without these, Claude calls go direct to api.anthropic.com (still works, just no gateway logging)

🟡 **PEXELS_API_KEY in Railway** — needed for live image search in Content library
- Get free key at: https://www.pexels.com/api/
- Add to Railway: `PEXELS_API_KEY=your_key`
- Without this, image search returns 20 hardcoded Unsplash fallback images

🟡 **RESEND_API_KEY in Railway** — needed for "Send Quote" email feature
- Get key at: https://resend.com (free tier: 100 emails/day)
- Add to Railway: `RESEND_API_KEY=re_...`
- Without this, PDF download still works but email sending returns graceful error

🟡 **Railway Static Outbound IP** — needed to fix automated runner blocking
- Go to: Railway → `intuitive-blessing` → Settings → Networking → Enable Static Outbound IP
- Whitelist the generated IP on any external APIs that block Railway

✅ **nama-web Vercel project env vars** — synced 2026-04-18
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NAMA_API_KEY`, `NEXT_PUBLIC_API_URL`, `NAMA_JWT_SECRET` (= Railway SECRET_KEY) all added

## Railway Crash Loop — Resolved 2026-04-18
Root causes fixed (see RAILWAY_INCIDENT_REPORT.md for full details):
1. `Base.metadata.create_all()` removed from `backend/app/main.py` module level
2. Gunicorn workers capped at 4 (`min((2*CPU)+1, 4)`) in `backend/gunicorn.conf.py`
3. `alembic upgrade heads` (plural) in Dockerfile and nixpacks.toml
4. `ix_leads_tenant_assigned_user` index gracefully skipped when column absent

---

## Remaining Known Issues (Non-blocking)
- ✅ Rate limiting: Upstash Redis — shared across all Vercel instances (2026-04-18)
- ✅ Copilot: OpenRouter (Llama 3.3 70B free) wired — live as of 2026-04-18
- ✅ AI Lead Scoring v2: POST /api/v1/copilot/score-lead (LLM via OpenRouter, heuristic fallback) — 2026-04-18
- Smart Pricing: static PRICING_BENCHMARKS — connect to Intelligence Aggregate API in V6
- ✅ E2E tests (Playwright) — 27/27 passing, committed 2026-04-18
- ✅ Sentry error monitoring — wired 2026-04-18, DSN in both Vercel projects
- WhatsApp: wa.me deep links, not Business API (fine for beta)
- PDF: browser print dialog, not server-side (fine for beta)

---

## Key Technical Decisions
- Stack: Next.js 14.2 App Router + TypeScript 5 + Tailwind 3.4, FastAPI on Railway, Neon PostgreSQL
- Demo mode: `nama_demo=1` cookie (SameSite=Strict) — acts as R3_SALES_MANAGER, hides R0/R1-only pages
- All R0/R1-only pages (investor, audit, status) have page-level role guards + redirect
- Seed data fallback on every page — all 18 modules work without backend
- Auth cookie: HttpOnly, set server-side via POST /api/auth/set-cookie
- API routes: Bearer token via NAMA_API_KEY env var (10 req/60s rate limit)
- Middleware JWT: full signature verification via jose jwtVerify (NAMA_JWT_SECRET required in Vercel)
- vercel.json: /api/auth/* and /api/v1/* are pass-through rules before Railway catch-all
- next.config.mjs rewrites: afterFiles (not beforeFiles) so local handlers match first

## File Risk Map
- 🔴 src/middleware.ts — breaks auth if wrong
- 🔴 vercel.json — breaks API routing if wrong
- 🔴 src/app/api/auth/set-cookie/route.ts — breaks real login if wrong
- 🟡 src/lib/api.ts — types used across 18 modules
- 🟡 src/lib/api-auth.ts — requireApiKey/requireSession used in all routes
- 🟡 src/app/dashboard/layout.tsx — affects all dashboard pages

## Repo
- GitHub: https://github.com/narumaam/nama-frontend
- Local: ~/Desktop/NAMA/07_Developer_Project
- Deployed: Vercel (auto-deploy on push to main)
- Backend: https://intuitive-blessing-production-30de.up.railway.app ✅ LIVE
