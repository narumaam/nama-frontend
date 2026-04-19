# NAMA OS — Knowledge Base Index

> Last updated: 2026-04-19 · Sprint 3+4
> This is the central index for all NAMA OS documentation. Start here.

---

## Quick Answers

### What is NAMA?

NAMA OS is an all-in-one operating system for travel agencies — it replaces WhatsApp lead chaos, manual quoting in spreadsheets, disconnected communication, and zero visibility with a single AI-powered platform. Built for boutique tour operators and DMCs in India (5–50 staff), deployed on Vercel (frontend) + Railway (backend) + Neon PostgreSQL.

### How many screens?

**43 screens** across public pages, onboarding, dashboard operations, documents and finance, configuration, admin-only, and external pages. Full list in `SCREENS_INVENTORY.md`.

### How many modules?

**20 modules** — 18 live + 2 newly built (Holidays and Intel). Full detail in `MODULES.md`.

### Tech stack in one line?

**Next.js 14.2 + TypeScript 5 + Tailwind 3.4 on Vercel · FastAPI 0.115 + Python 3.11 + SQLAlchemy 2.0 on Railway · Neon PostgreSQL + Upstash Redis · OpenRouter LLM + Resend email + Razorpay payments**

### How to deploy?

```bash
git push origin main
# Vercel auto-deploys the frontend
# Railway auto-deploys the backend
# Alembic migrations run automatically in the Dockerfile
```

### Who to contact?

**Prateek M** — hi@prateekm.com

---

## Documentation Files

| File | What It Covers |
|------|---------------|
| `MODULES.md` | All 20 product modules — routes, features, completion %, what remains |
| `TECH_STACK.md` | Every technology used: frontend, backend, database, AI, email, payments, auth, testing |
| `SCREENS_INVENTORY.md` | All 43 screens grouped by category with routes, descriptions, and role access |
| `DEVELOPER_HANDOVER.md` | Complete developer onboarding: setup, architecture, auth flow, deployment, gotchas |
| `PIPELINE.md` | Product roadmap: completed V1–Sprint 3+4, next sprint priorities, 60-day plan, parked items |
| `PRD.md` | Product Requirements Document: vision, users, problems solved, feature requirements per module, non-goals, metrics, pricing |
| `README.md` | This file — knowledge base index and quick reference |

---

## Related Files (Root Level)

| File | What It Covers |
|------|---------------|
| `CLAUDE.md` | Sprint-by-sprint project memory, pending actions, key technical decisions |
| `DEVELOPER_HANDOFF.md` | Earlier handover notes (legacy, superseded by `docs/DEVELOPER_HANDOVER.md`) |
| `RAILWAY_INCIDENT_REPORT.md` | Root cause analysis of the April 2026 crash loop (resolved) |
| `README.md` (root) | Public-facing repo README |

---

## Codebase Map

```
nama-frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/         ← 30+ dashboard pages
│   │   ├── api/               ← Next.js serverless API routes
│   │   ├── onboarding/        ← 7-step wizard
│   │   └── portal/[bookingId] ← Public customer portal
│   ├── components/            ← Shared UI: ErrorBoundary, GlobalSearch, ChecklistWidget, etc.
│   ├── lib/                   ← api.ts, api-auth.ts, currency.ts, tour.ts, rate-limit.ts
│   ├── emails/                ← React Email templates (Day 0/1/3/7 drip)
│   └── middleware.ts          ← Edge JWT verification (CRITICAL)
├── backend/
│   ├── app/
│   │   ├── api/v1/            ← All FastAPI REST endpoints
│   │   ├── core/              ← ai_client, email_service, webhook_dispatcher, routine_executor
│   │   ├── models/            ← SQLAlchemy ORM models (leads, bookings, rbac, etc.)
│   │   └── main.py            ← App entry point + router registration
│   └── alembic/               ← Database migrations
├── public/
│   └── widget.js              ← Self-contained embeddable lead capture widget
├── e2e/                       ← Playwright E2E tests (27 passing)
├── docs/                      ← This knowledge base
├── vercel.json                ← API proxy rules (CRITICAL)
└── next.config.mjs            ← Security headers + rewrites
```

---

## Key URLs

| Resource | URL |
|----------|-----|
| Production app | https://getnama.app |
| Backend API | https://intuitive-blessing-production-30de.up.railway.app |
| Backend health | https://intuitive-blessing-production-30de.up.railway.app/health |
| GitHub repo | https://github.com/narumaam/nama-frontend |
| Vercel project | nama-web |
| Railway project | intuitive-blessing |

---

## Current Status (2026-04-19)

- **Backend:** Healthy — `{"status":"healthy","version":"0.3.0"}`
- **Frontend:** Live on Vercel, auto-deploys on push to `main`
- **E2E tests:** 27/27 passing
- **Last major commit:** `1ba1007` — Sprint 3+4 complete
- **Active sprints completed:** V1 → V5 + Security + Hardening + Phase 1–3 + Sprint 2 + Sprint 3+4

---

## Role Quick Reference

| Role ID | Name | Key Access |
|---------|------|------------|
| R0 | Owner / Superadmin | All screens including Investor, Audit, Sentinel |
| R1 | Org Admin | All except Investor |
| R2 | Agency Admin | Operations + Config (no Admin screens) |
| R3 | Sales Manager | Leads, Quotations, Bookings, Comms |
| R4 | Ops Executive | Bookings, Visas, Documents |
| R5 | Finance Admin | Finance, Documents |

---

## Pending Actions (Environment Variables Required)

The following env vars are not yet set and will unlock specific features when added:

| Var | Where | Feature Unlocked |
|-----|-------|-----------------|
| `RESEND_API_KEY` | Railway + Vercel | All email: drip, reminders, invoices, alerts |
| `FRONTEND_URL` | Railway | Python → Next.js email delegation |
| `ENCRYPTION_KEY` | Railway | Secure SMTP password storage |
| `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` | Railway | WhatsApp Business API |
| `FACEBOOK_VERIFY_TOKEN` + `FACEBOOK_APP_SECRET` | Railway | Facebook/Instagram webhooks |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | Railway | Real payment links |
| `ANTHROPIC_API_KEY` | Railway | Claude direct (falls back to OpenRouter without this) |
| `PEXELS_API_KEY` | Railway | Live image search in Content library |

---

*This knowledge base is updated every sprint. For the most current sprint state, always check `CLAUDE.md` first.*
