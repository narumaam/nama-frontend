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

### 🅱️ Parked — V6: NAMA Voice
**Recommended stack:** Coqui TTS + OpenVoice + Bark + OpenRouter
**High-ROI uses:** Voice itinerary narration, agent training sims, multi-language assistant
**Note:** OpenRouter worth pulling forward for Copilot model routing independently of voice.
**Status:** Research complete. Not started. Revisit when V5 nodes are live.

---

## Pending Actions (User Must Do)

🟡 **ANTHROPIC_API_KEY in Railway** — needed for Copilot Live AI mode (revisit Tuesday)
- Go to: Railway → `intuitive-blessing` service → Variables → add `ANTHROPIC_API_KEY`
- Without this, Copilot runs in demo/simulation mode

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
