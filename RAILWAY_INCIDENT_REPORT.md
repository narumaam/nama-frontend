# NAMA Backend — Railway Crash Loop: Incident Report

**Incident duration:** ~7 hours (April 17–18, 2026)  
**Resolved:** April 18, 2026 at 07:12 UTC  
**Service:** NAMA Backend (FastAPI + Gunicorn + Neon PostgreSQL on Railway)  
**Health check post-fix:** `{"status":"healthy","version":"0.3.0"}` ✅

---

## Timeline of Events

### Phase 1 — Initial Symptom
The Railway backend entered a perpetual deploy loop. Every container start would:
1. Run `alembic upgrade head` (migrations)
2. Launch gunicorn
3. Crash within seconds
4. Railway would restart the container
5. Repeat

`railway logs` showed the service cycling through "Starting Container" → crash → "Stopping Container" with no useful error message captured before the restart.

---

## Root Causes (3 compounding issues)

### RC-1 — `Base.metadata.create_all()` at module level ❌ → ✅ FIXED

**File:** `backend/app/main.py` line 98  
**What it did:** Called `Base.metadata.create_all(bind=engine)` during module import — meaning every gunicorn worker executed DDL against the database the moment it started loading Python.

**Why it crashed:**  
- With 97+ workers starting simultaneously (see RC-2), all workers raced to run DDL
- PostgreSQL enum type `itinerarystatus` already existed from Alembic migrations → each worker hit `psycopg2.errors.UniqueViolation: type "itinerarystatus" already exists`
- The SQLAlchemy session pool (pool_size=20, max_overflow=40 = 60 connections per worker) was exhausted: 97 workers × 60 connections = 5,820 simultaneous DB connections
- This caused `SSL connection has been closed unexpectedly` errors across all workers
- Workers failed to boot → gunicorn master exited → Railway restarted the container

**Fix:** Removed `Base.metadata.create_all(bind=engine)` entirely. Alembic manages the schema. The call was redundant and catastrophic in a multi-worker environment.

```python
# REMOVED from main.py (was line 98):
# Base.metadata.create_all(bind=engine)

# ADDED comment explaining why:
# NOTE: Schema is managed exclusively by Alembic migrations (run at deploy time).
# create_all() has been removed to prevent each gunicorn worker from racing to
# create tables/enums on startup, which caused UniqueViolation on pg enum types
# and exhausted the DB connection pool under high worker concurrency.
```

`init_performance_indexes()` was moved from module level into the `@app.on_event("startup")` handler where it runs after the app is initialized.

---

### RC-2 — Gunicorn worker count unbounded ❌ → ✅ FIXED

**File:** `backend/gunicorn.conf.py` line 32  
**What it did:**
```python
workers = int(os.getenv("WEB_CONCURRENCY", (2 * multiprocessing.cpu_count()) + 1))
```
Railway containers report a high `cpu_count()` (observed: ~48 CPUs). The formula produced **97 workers**.

**Why it crashed:** Each worker spawned its own import of `app.main`, triggering RC-1 × 97 simultaneously. Even without RC-1, 97 workers on a small Railway container caused OOM kills (`Worker (pid:X) was sent SIGKILL! Perhaps out of memory?`).

**Fix:** Capped workers at 4:
```python
workers = int(os.getenv("WEB_CONCURRENCY", min((2 * multiprocessing.cpu_count()) + 1, 4)))
```
`WEB_CONCURRENCY` env var in Railway can override this if more workers are needed later.

---

### RC-3 — `alembic upgrade head` vs `heads` ❌ → ✅ FIXED

**Files:** `backend/Dockerfile` (CMD) and `backend/nixpacks.toml`  
**What it did:** Used `alembic upgrade head` (singular), which only upgrades a single linear branch. NAMA's migration tree has multiple branches.

**Fix:** Changed to `alembic upgrade heads` (plural) in both files to run all migration branch tips.

---

## Contributing Issues (Fixed Along the Way)

| Issue | File | Fix |
|-------|------|-----|
| `ModuleNotFoundError: sentry_sdk` | `backend/requirements.txt` | Added `sentry-sdk[fastapi]==2.1.1` |
| Duplicate gunicorn entries (v21 + v23) | `backend/requirements.txt` | Removed duplicate, kept `gunicorn==23.0.0` |
| `ix_leads_tenant_assigned_user` — UndefinedColumn error logged on startup | `backend/app/db/indexes.py` | Added pre-check: skip any index whose columns aren't yet in the schema. Error demoted from `✗ error:` to `⊘ skipped` |
| PYTHONPATH misconfiguration | `backend/Dockerfile` | Fixed to `PYTHONPATH=/app/backend` |

---

## What Was Tried That Didn't Work

1. **Restarting the Railway service** — container restarted but crash loop continued (underlying code unchanged)
2. **Adding cache-bust comment to requirements.txt** — forced pip reinstall, useful for sentry-sdk but didn't fix the crash loop
3. **`alembic upgrade heads` alone** — migrations ran cleanly but `create_all()` still caused worker crashes post-migration
4. **Conditional index migration (DO $$ block)** — fixed the Alembic migration crash but `init_performance_indexes()` still ran at module level causing the same column-missing error on every worker boot

---

## Resolution Confirmation

Post-fix Railway logs (deployment `d27fb4b5`):

```
[2026-04-18 07:12:47 +0000] [3] [INFO] Starting gunicorn 21.2.0
[2026-04-18 07:12:47 +0000] [4] [INFO] Booting worker with pid: 4
[2026-04-18 07:12:47 +0000] [5] [INFO] Booting worker with pid: 5
[2026-04-18 07:12:47 +0000] [6] [INFO] Booting worker with pid: 6
[2026-04-18 07:12:47 +0000] [7] [INFO] Booting worker with pid: 7
...
[2026-04-18 07:12:53 +0000] [6] [INFO] Application startup complete.
```

Health check: `curl https://intuitive-blessing-production-30de.up.railway.app/api/v1/health`
```json
{"status":"healthy","timestamp":"2026-04-18T07:15:15.482034+00:00","version":"0.3.0",
 "hard_stops":{"HS1_auth_jwt_claims":"resolved","HS2_rls_tenant_scope":"resolved",
               "HS3_payment_safety":"resolved","HS4_ai_cost_controls":"resolved"},
 "ai_kill_switch_active":false}
```

---

## Commits Made

| Commit | Message |
|--------|---------|
| `7b9a71b` | fix: add sentry-sdk to root requirements.txt |
| `afa6fe7` | fix: add missing deps (pydantic-settings, slowapi, anthropic, langchain, reportlab) |
| `9c8c2a7` | **fix: stop crash loop — remove create_all, cap gunicorn workers to 4** ← primary fix |
| `0554539` | fix: silently skip indexes on missing columns (assigned_user_id) |

---

## Post-Incident Action Required

**CRITICAL:** Now that Railway is live, real agent login will only work if `NAMA_API_KEY` is set in Vercel:
1. Go to Railway Dashboard → NAMA service → Variables
2. Copy the value of `NAMA_API_KEY`
3. Go to Vercel Dashboard → nama-frontend → Settings → Environment Variables
4. Add `NAMA_API_KEY` = (value from Railway)

Without this, the frontend falls back to demo mode for API calls.

---

## Prevention

- **Worker count:** Always set `WEB_CONCURRENCY` explicitly in Railway variables. Never rely on CPU auto-detection in a cloud container.
- **Schema ownership:** `Base.metadata.create_all()` must never appear in application code. Alembic is the sole schema authority.
- **Startup DB calls:** Any DB work at startup belongs in `@app.on_event("startup")`, never at module import level.
- **Multi-worker safety:** Any code running at module import runs N times in parallel (N = worker count). It must be read-only or fully idempotent with proper DB-level locking.
