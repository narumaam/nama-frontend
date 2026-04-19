# NAMA OS — Developer Handover Document

> Last updated: 2026-04-19 · Sprint 3+4
> The definitive onboarding guide for any developer joining or taking over the NAMA OS codebase.

---

## 1. Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Git
- A Neon PostgreSQL database (or the shared dev credentials)

### Clone and Install

```bash
# Clone the repo
git clone https://github.com/narumaam/nama-frontend
cd nama-frontend

# Install frontend dependencies
npm install

# Set up backend
cd backend
pip install -r requirements.txt
cd ..
```

### Environment Variables (Local Dev)

Create a `.env.local` file in the repo root:

```env
# Required for frontend to function at all
NEXT_PUBLIC_API_URL=http://localhost:8000
NAMA_API_KEY=your-api-key-here
NAMA_JWT_SECRET=your-jwt-secret-here

# Google OAuth (optional locally)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Email (optional — drip and invoice emails won't fire without this)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=NAMA OS <onboarding@getnama.app>

# Upstash (optional — rate limiting falls back to in-memory without this)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Sentry (optional locally)
NEXT_PUBLIC_SENTRY_DSN=...
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
NAMA_API_KEY=your-api-key-here
NAMA_JWT_SECRET=your-jwt-secret-here
RESEND_API_KEY=re_...
ENCRYPTION_KEY=your-fernet-key  # generate: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
OPENROUTER_API_KEY=sk-or-...
```

### Run Dev

```bash
# Terminal 1 — Frontend
npm run dev
# Runs at http://localhost:3000

# Terminal 2 — Backend
cd backend
uvicorn app.main:app --reload --port 8000
# Runs at http://localhost:8000

# Terminal 3 — Database migrations (run once, then as needed)
cd backend
alembic upgrade heads
```

---

## 2. Architecture Overview

```
nama-frontend/           ← Git repo root
├── src/                 ← Next.js frontend (App Router)
│   ├── app/             ← All pages and API routes
│   │   ├── (public)/    ← Unauthenticated pages
│   │   ├── dashboard/   ← All authenticated dashboard pages
│   │   └── api/         ← Next.js serverless API routes
│   ├── components/      ← Shared UI components
│   ├── lib/             ← Utilities: api.ts, auth.ts, currency.ts, tour.ts
│   └── emails/          ← React Email templates
├── backend/             ← FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/      ← All REST endpoints
│   │   ├── core/        ← email_service, ai_client, webhook_dispatcher, routine_executor
│   │   ├── models/      ← SQLAlchemy ORM models
│   │   └── main.py      ← FastAPI app + router registration
│   └── alembic/         ← Migration scripts
├── public/              ← Static assets including widget.js
├── e2e/                 ← Playwright E2E tests
├── vercel.json          ← Routing rules (CRITICAL — see section 6)
├── next.config.mjs      ← Security headers + rewrites
└── CLAUDE.md            ← Project memory (read this first)
```

---

## 3. Critical Files

### Red — Breaking if Wrong

| File | Why Critical | What Breaks |
|------|-------------|-------------|
| `src/middleware.ts` | JWT verification on Edge; runs before every protected request | All auth — users get locked out or bypass security |
| `vercel.json` | API proxy rules from Vercel to Railway | All `/api/v1/*` calls fail with 404 or CORS errors |
| `src/app/api/auth/set-cookie/route.ts` | Sets the HttpOnly JWT cookie | Login flow breaks — JWT never persisted |

### Yellow — High Impact

| File | Why Important | Impact if Wrong |
|------|--------------|-----------------|
| `src/lib/api.ts` | All API client types and fetch wrappers; used across all 18 modules | Type errors and broken fetches across the entire app |
| `src/lib/api-auth.ts` | `requireApiKey()` and `requireSession()` used in all Next.js API routes | Auth on all serverless routes breaks |
| `src/app/dashboard/layout.tsx` | Dashboard shell: sidebar, header, auth check, CurrencyProvider | All dashboard pages broken |

---

## 4. Auth Flow

```
1. User submits login form
   → POST /api/v1/auth/login (Railway backend)
   → Railway validates credentials, returns { access_token: "eyJ..." }

2. Next.js receives token
   → POST /api/auth/set-cookie (Next.js serverless route)
   → Sets HttpOnly cookie: nama_token=eyJ...; SameSite=Strict; Secure; Path=/

3. Subsequent page loads
   → Edge middleware (src/middleware.ts) runs
   → Reads nama_token cookie
   → Validates: 3-segment base64url format + min 50 chars + full jose jwtVerify() signature check
   → Fails → redirect to /login
   → Passes → request proceeds

4. API calls from dashboard pages
   → src/lib/api.ts sends relative URL (e.g., /api/v1/leads)
   → Vercel edge proxies to Railway (vercel.json catch-all rule)
   → Railway reads Bearer token from Authorization header OR nama_token cookie
   → Returns data
```

### JWT Shape Expected by Middleware

```
eyJ[header].[payload].[signature]
 ↑ 3 segments, base64url encoded, total length > 50 chars
```

---

## 5. Demo Mode

Demo mode lets anyone try NAMA without credentials, showing seed data.

**How it works:**
1. User clicks "Try Demo" on the landing page
2. `POST /api/auth/set-cookie` is called with a special demo payload
3. Cookie `nama_demo=1` is set (SameSite=Strict)
4. Middleware detects `nama_demo=1` → allows through without JWT validation
5. Every page/component checks for demo mode and returns seed data arrays
6. Demo user is treated as `R3_SALES_MANAGER` — cannot see Investor, Audit, Sentinel, Status

**Seed data fallback:** Every page has a try/catch around API calls. On any error (or in demo mode), it falls back to hardcoded seed arrays. This means the UI always shows something useful.

---

## 6. API Routing

### The Problem (Solved)

In production, the frontend runs on Vercel and the backend on Railway — different domains. Calling Railway directly from the browser causes CORS failures.

### The Solution

`src/lib/api.ts` always uses relative URLs in production:
```typescript
const BASE_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || '')
```

`vercel.json` proxies all `/api/v1/*` calls to Railway:
```json
{
  "rewrites": [
    { "source": "/api/v1/:path*", "destination": "https://intuitive-blessing-production-30de.up.railway.app/api/v1/:path*" }
  ]
}
```

**Pass-through rules** (handled by Next.js, NOT proxied to Railway):
- `/api/auth/*` — HttpOnly cookie routes in Next.js
- `/api/email/*` — Email send routes in Next.js

### Local Development

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`. The frontend will call the local backend directly.

---

## 7. Database

### Neon PostgreSQL

- Serverless PostgreSQL — connection pooling built in
- Never use `Base.metadata.create_all()` in application code — use Alembic only
- Async SQLAlchemy sessions via `get_db()` dependency in `backend/app/deps.py`

### Running Migrations

```bash
cd backend

# Apply all pending migrations
alembic upgrade heads    # NOTE: "heads" (plural) to merge all migration branches

# Create a new migration
alembic revision --autogenerate -m "add_my_table"

# Rollback one step
alembic downgrade -1
```

### Migration Chain (ordered)

```
baseline
  → d1e2f3a4b5c6  rbac tables (roles, permissions, assignments, overrides, audit_log)
  → e2f3a4b5c6d7  vendor_rates child pricing + DMC flag
  → f3a4b5c6d7e8  content shared library (is_shared, is_master fields)
  → a1b2c3d4e5f6  webhook_endpoints
  → (clients migration)
  → i6j7k8l9m0n1  routines
  → j7k8l9m0n1o2  tenant_email_config (SMTP/IMAP)
  → k8l9m0n1o2p3  leadsource_website enum
```

---

## 8. Deployment

### Frontend (Vercel)

```bash
git push origin main
# Vercel auto-deploys from main branch
# Build: next build
# Deploy preview: every PR gets a preview URL
```

Vercel project: `nama-web`
Production URL: `https://getnama.app`

### Backend (Railway)

```bash
git push origin main
# Railway auto-deploys from main branch
# Build: Dockerfile (installs deps, runs alembic upgrade heads, starts Gunicorn)
```

Railway project: `intuitive-blessing`
Backend URL: `https://intuitive-blessing-production-30de.up.railway.app`

### Health Check

```bash
curl https://intuitive-blessing-production-30de.up.railway.app/health
# Expected: {"status":"healthy","version":"0.3.0"}
```

---

## 9. Environment Variables

### Railway (Backend) — Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `NAMA_API_KEY` | Shared API key for frontend → backend authentication |
| `NAMA_JWT_SECRET` | Secret for signing and verifying JWTs |
| `ENCRYPTION_KEY` | Fernet key for SMTP/IMAP password encryption |
| `FRONTEND_URL` | `https://getnama.app` — for backend email delegation to Next.js |
| `RESEND_API_KEY` | `re_...` — all transactional email |

### Railway (Backend) — Optional but Recommended

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | LLM routing (Llama 3.3 70B free) — Copilot + lead scoring |
| `ANTHROPIC_API_KEY` | Claude direct (deferred, falls back to OpenRouter) |
| `VERCEL_AI_GATEWAY_TEAM_ID` | `team_0ntK3Ywi8mYGSkVagPrRDXhd` |
| `VERCEL_AI_GATEWAY_NAME` | `nama-ai-gateway` |
| `WHATSAPP_TOKEN` | Meta Cloud API permanent token |
| `WHATSAPP_PHONE_ID` | Meta WhatsApp phone ID |
| `WHATSAPP_APP_SECRET` | For HMAC webhook verification |
| `FACEBOOK_VERIFY_TOKEN` | Any random string for Meta webhook setup |
| `FACEBOOK_APP_SECRET` | From Meta App Dashboard |
| `RAZORPAY_KEY_ID` | Payment links (test: `rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `PEXELS_API_KEY` | Image search in Content library |

### Vercel (Frontend) — Required

| Variable | Description |
|----------|-------------|
| `NAMA_API_KEY` | Same value as Railway |
| `NAMA_JWT_SECRET` | Same value as Railway |
| `NEXT_PUBLIC_API_URL` | `https://intuitive-blessing-production-30de.up.railway.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `RESEND_API_KEY` | For Next.js email routes |
| `UPSTASH_REDIS_REST_URL` | Rate limiting Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting Redis token |
| `SENTRY_DSN` | Error monitoring |

---

## 10. Known Gotchas

### zsh Bracket Quoting

When using `curl` or shell commands with dynamic route brackets like `/dashboard/bookings/[id]`, zsh interprets `[id]` as a glob pattern. Always quote:
```bash
# Wrong (zsh glob error)
curl http://localhost:3000/dashboard/bookings/[id]

# Right
curl 'http://localhost:3000/dashboard/bookings/[id]'
```

### .git/index.lock on FUSE Mount

If the repo is on a FUSE-mounted filesystem (e.g., SSHFS), git operations may leave a stale `.git/index.lock` file. Remove it manually:
```bash
rm .git/index.lock
```

### framer-motion Removed

framer-motion was removed to save ~100KB of bundle. Do NOT add it back. All animations use:
- CSS `transition` and `animation` classes (Tailwind)
- Native `requestAnimationFrame` for custom animations (e.g., SVG ring in onboarding)

### Alembic "heads" vs "head"

Always run `alembic upgrade heads` (plural) — NAMA has multiple migration branches that were merged. Using `alembic upgrade head` (singular) may fail or apply only one branch.

### Gunicorn Worker Cap

`backend/gunicorn.conf.py` caps workers at `min((2*CPU)+1, 4)`. Do not increase this on Railway's free tier — it causes OOM crashes (this was the root cause of the April 2026 crash loop incident).

### Demo Cookie SameSite

The `nama_demo=1` cookie is `SameSite=Strict`. It will not be sent on cross-site navigations. Users must navigate directly to the site after the cookie is set. This is intentional for security.

### Neon Connection Pooling

The Neon connection string should use the pooler endpoint (`-pooler` suffix in the hostname) in production. Without pooling, Railway workers will exhaust connection limits quickly.

---

*For product context, see `PRD.md`. For the full module list, see `MODULES.md`. For deployment status, see `CLAUDE.md`.*
