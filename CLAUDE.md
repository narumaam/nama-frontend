# NAMA OS — Project Memory

## Current Status: ✅ LIVE · Backend + Frontend both operational

**Last major commit:** security hardening batch — role guards, demo nav fix, role name consistency
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
- Settings ROLES + SEED_TEAM updated to canonical role IDs (R2_ORG_ADMIN, R3_SALES_MANAGER, R4_OPS_EXECUTIVE, R5_FINANCE_ADMIN)
- Demo cookie hardened: sameSite changed from 'lax' to 'strict'
- Hardcoded Railway URL removed from login.tsx and register.tsx fallbacks
- Middleware: full JWT signature verification with jose (jwtVerify) — already in place

### 🅱️ Parked — V6: NAMA Voice
**Recommended stack:** Coqui TTS + OpenVoice + Bark + OpenRouter
**High-ROI uses:** Voice itinerary narration, agent training sims, multi-language assistant
**Note:** OpenRouter worth pulling forward for Copilot model routing independently of voice.
**Status:** Research complete. Not started. Revisit when V5 nodes are live.

---

## Pending Actions (User Must Do)

🟡 **ANTHROPIC_API_KEY in Railway** — needed for Copilot Live AI mode
- Go to: Railway → `intuitive-blessing` service → Variables → add `ANTHROPIC_API_KEY`
- Without this, Copilot runs in demo/simulation mode

🟡 **nama-web Vercel project** — needs same env vars as nama-frontend
- Both Vercel projects deploy the same GitHub repo but need the same env vars
- `nama-web` is missing: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = `463772221773-4496rcm416r76u26heqva3gq1anvifj5.apps.googleusercontent.com`
- Add at: Vercel → nama-web → Settings → Environment Variables → redeploy
- Also confirm: `NAMA_API_KEY`, `NEXT_PUBLIC_API_URL`, `NAMA_JWT_SECRET` match between both projects

## Railway Crash Loop — Resolved 2026-04-18
Root causes fixed (see RAILWAY_INCIDENT_REPORT.md for full details):
1. `Base.metadata.create_all()` removed from `backend/app/main.py` module level
2. Gunicorn workers capped at 4 (`min((2*CPU)+1, 4)`) in `backend/gunicorn.conf.py`
3. `alembic upgrade heads` (plural) in Dockerfile and nixpacks.toml
4. `ix_leads_tenant_assigned_user` index gracefully skipped when column absent

---

## Remaining Known Issues (Non-blocking)
- Rate limiting: in-memory only — not shared across Vercel instances (V6: Upstash Redis)
- Copilot: real SSE wired to Railway backend — needs ANTHROPIC_API_KEY to activate
- AI scoring (computeAIScore): client-side heuristics — move to Railway ML endpoint in V6
- Smart Pricing: static PRICING_BENCHMARKS — connect to Intelligence Aggregate API in V6
- No E2E tests (Playwright) — add before enterprise rollout
- No Sentry error monitoring — add post-launch (free tier or self-hosted GlitchTip)
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
