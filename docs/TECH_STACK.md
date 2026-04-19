# NAMA OS — Technical Stack

> Last updated: 2026-04-19 · Sprint 3+4
> Complete reference for every technology decision in NAMA OS. Updated each sprint.

---

## Summary (One Line)

**Next.js 14.2 + TypeScript 5 + Tailwind 3.4 on Vercel · FastAPI 0.115 + Python 3.11 + SQLAlchemy 2.0 on Railway · Neon PostgreSQL + Upstash Redis · OpenRouter LLM + Resend email + Razorpay payments**

---

## Frontend

### Core Framework

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 14.2.35 | App Router, SSR, API routes, Edge middleware |
| React | 18.x | UI component model |
| TypeScript | 5.x | Type safety across all src/ |
| Tailwind CSS | 3.4.1 | Utility-first styling |

### Key Libraries

| Library | Version | Role |
|---------|---------|------|
| lucide-react | 0.446.0 | Icon system (replaces heroicons) |
| jose | 5.9.6 | JWT verification on Edge middleware |
| clsx + tailwind-merge | 2.1.0 / 2.2.0 | Conditional className utilities |
| class-variance-authority | 0.7.0 | Component variant management |
| @react-oauth/google | 0.12.1 | Google OAuth one-tap login |
| @sentry/nextjs | 8.x | Error monitoring (client + server + edge) |
| @upstash/redis | 1.34.0 | Rate limiting state (shared across Vercel instances) |
| @upstash/ratelimit | 2.0.5 | Sliding window rate limiter |
| resend | 4.0.0 | Transactional email sending (JS SDK) |
| @react-email/components | 0.0.22 | HTML email template components |
| @react-email/render | 1.0.0 | Server-side email template rendering |

### Removed / Intentionally Excluded

- **framer-motion** — removed (saved ~100KB bundle). All animations use CSS transitions or `requestAnimationFrame`.
- No jQuery, no moment.js, no lodash.

---

## Backend

### Core Framework

| Technology | Version | Role |
|------------|---------|------|
| FastAPI | 0.115 | REST API framework, async request handling |
| Python | 3.11 | Runtime |
| Uvicorn | latest | ASGI server (workers managed by Gunicorn) |
| Gunicorn | 23 | Process manager; workers capped at `min((2*CPU)+1, 4)` |
| SQLAlchemy | 2.0 | ORM, async DB sessions |
| Alembic | 1.13 | Database migration management |

### Key Python Packages

| Package | Role |
|---------|------|
| pandas 2.2.3 | CSV/Excel import parsing (leads, vendors) |
| openpyxl 3.1.5 | Excel file support for rate card import |
| WeasyPrint | Server-side PDF rendering (invoices, quotations) |
| httpx | Async HTTP client for outbound API calls |
| cryptography (Fernet) | Per-tenant SMTP password encryption at rest |
| python-jose | JWT creation and validation |
| passlib | Password hashing (bcrypt) |
| pydantic v2 | Request/response schema validation |

### API Authentication

- All `/api/v1/*` routes require `X-API-Key: <NAMA_API_KEY>` header (`requireApiKey` dependency)
- Session routes additionally verify the JWT from the HttpOnly cookie
- RBAC `can()` dependency: `Depends(can("leads", "export"))` — checks overrides → roles → deny

---

## Database

### Primary Database — Neon PostgreSQL (Serverless)

- Serverless PostgreSQL with auto-scaling compute
- Connection pooling via Neon's built-in pooler
- Alembic manages all schema migrations — never use `create_all()` at module level

### Migration Chain (as of 2026-04-19)

```
baseline
  → rbac (d1e2f3a4b5c6)
  → vendor_rates (e2f3a4b5c6d7)
  → content_shared (f3a4b5c6d7e8)
  → webhook_endpoints (a1b2c3d4e5f6)
  → clients
  → routines (i6j7k8l9m0n1)
  → email_config (j7k8l9m0n1o2)
  → leadsource_website (k8l9m0n1o2p3)
```

Run: `alembic upgrade heads` (plural — merges all heads)

### Cache / Rate Limiting — Upstash Redis

- Upstash serverless Redis (HTTP-based, works on Vercel Edge)
- Used for: FX rate caching (1hr TTL), sliding window rate limiting
- Sliding window: 20 req/min for intelligence endpoints, 10 for auth, 60 for context capture

---

## AI / ML

### LLM Routing

| Provider | Model | Used For |
|----------|-------|----------|
| OpenRouter | Llama 3.3 70B (free tier) | Copilot responses, lead scoring, routine AI steps |
| Anthropic Claude | claude-3-5-sonnet (deferred) | High-quality generation when ANTHROPIC_API_KEY set |
| Vercel AI Gateway | Proxy layer | Observability, caching, model routing |

### AI Features

- **Lead Scoring:** `POST /api/v1/copilot/score-lead` — LLM scoring with heuristic fallback
- **Agency Config Generation:** `POST /api/v1/copilot/generate-config` — keyword fallback if LLM unavailable
- **AI Summarise step** in Routines — OpenRouter Llama 3.3
- **Centralized client:** `backend/app/core/ai_client.py` — `get_ai_client()` / `get_async_ai_client()`

### AI Gateway (Vercel)

When `VERCEL_AI_GATEWAY_TEAM_ID` and `VERCEL_AI_GATEWAY_NAME` are set, all Claude calls route through:
```
https://gateway.ai.vercel.com/v1/{team_id}/nama-ai-gateway/anthropic
```

---

## Infrastructure

### Frontend Hosting — Vercel

- Auto-deploys on push to `main` branch
- Edge middleware runs `src/middleware.ts` (JWT verification via jose)
- `vercel.json` rewrites: `/api/auth/*` and `/api/v1/*` excluded from Railway proxy; all other `/api/*` proxied
- CSP / HSTS / X-Frame-Options headers set in `next.config.mjs`

### Backend Hosting — Railway

- Auto-deploys on push to `main` branch
- `nixpacks.toml` drives build; `Procfile` runs Gunicorn
- `alembic upgrade heads` runs in Dockerfile before app start
- Project name: `intuitive-blessing`

### API Routing (Browser → Backend)

```
Browser (production)
  → Relative URL /api/v1/...
  → Vercel Edge (vercel.json catch-all)
  → Railway backend https://intuitive-blessing-production-30de.up.railway.app
```

This eliminates all CORS failures. Never use the Railway URL directly from the browser.

---

## Email

| Component | Technology | Role |
|-----------|------------|------|
| Transactional send | Resend API + JS SDK (`resend` v4) | All outbound email from Next.js routes |
| Email templates | React Email (`@react-email/components`) | Day 0/1/3/7 drip, welcome, re-engage |
| Per-tenant SMTP | Python `smtplib` via `email_service.py` | Send from agency's own domain |
| Per-tenant IMAP | Python `imaplib` via `email_service.py` | Poll for reply ingestion + threading |
| SMTP password storage | Fernet encryption (requires `ENCRYPTION_KEY`) | Secure credential storage in Neon |

### Email Templates

Located at `src/emails/`:
- `NamaEmailBase.tsx` — base layout with header/footer
- `WelcomeEmail.tsx` — Day 0 onboarding welcome
- `DayOneEmail.tsx` — Day 1 tips
- `DayThreeEmail.tsx` — Day 3 social proof
- `DaySevenEmail.tsx` — Day 7 re-engagement

Preview any template: `GET /api/email/preview?day=0`

---

## Payments

| Provider | Used For |
|----------|----------|
| Razorpay | Payment links for deposit collection from quotations |

- `POST /api/v1/payments/create-link` creates a Razorpay payment link
- Default: 25% of quotation value
- Falls back to a demo URL if `RAZORPAY_KEY_ID` is not set (non-breaking)

---

## Monitoring & Observability

| Tool | Scope | Setup |
|------|-------|-------|
| Sentry | Frontend errors (client + server + edge) | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| Sentry | Backend Python errors | Configured in FastAPI app startup |
| Prometheus | Backend metrics endpoint (`/metrics`) | Exposed by FastAPI |
| Infrastructure Sentinel | Vercel / Railway / Neon usage | `backend/app/api/v1/sentinel.py` + `/dashboard/sentinel` |

---

## Auth

### Flow

1. User submits credentials → `POST /api/v1/auth/login` (Railway)
2. Railway returns signed JWT
3. Next.js `/api/auth/set-cookie` sets HttpOnly `nama_token` cookie (SameSite=Strict)
4. Subsequent requests: cookie sent automatically; Edge middleware calls `jose.jwtVerify()`
5. Middleware validates 3-segment base64url shape + minimum 50-char payload + full signature

### Demo Mode

- Cookie: `nama_demo=1` (SameSite=Strict, set server-side)
- Middleware allows access; all pages fall back to seed data
- Demo user acts as `R3_SALES_MANAGER` — hides Investor, Audit Agent, Sentinel, System Status

### Role Hierarchy

| ID | Name |
|----|------|
| R0 | Owner / Superadmin |
| R1 | Org Admin |
| R2 | Agency Admin |
| R3 | Sales Manager |
| R4 | Ops Executive |
| R5 | Finance Admin |

---

## Testing

| Tool | Version | Coverage |
|------|---------|----------|
| Playwright | 1.44.0 | E2E tests — 27/27 passing as of 2026-04-18 |
| TypeScript strict mode | — | All `src/` files type-checked |
| ESLint | 8.x + eslint-config-next 14.2.15 | Lint on all `.ts/.tsx` files |

Test files: `e2e/` directory. Config: `playwright.config.ts`.

---

## Security Hardening

- **HttpOnly cookies** — JWT never exposed to JavaScript
- **Full JWT signature verification** — `jose.jwtVerify()` on every Edge middleware invocation
- **Rate limiting** — Upstash sliding window on all sensitive endpoints
- **CSP headers** — `next.config.mjs` sets Content-Security-Policy, HSTS, X-Frame-Options
- **RBAC + ABAC** — `can()` dependency with JSONB condition evaluation (geography, deal size, shift hours, etc.)
- **Fernet encryption** — SMTP/IMAP passwords encrypted at rest
- **HMAC-SHA256** — all outbound webhook payloads signed

---

*For module-level detail, see `MODULES.md`. For screen routes, see `SCREENS_INVENTORY.md`. For deployment runbook, see `DEVELOPER_HANDOVER.md`.*
