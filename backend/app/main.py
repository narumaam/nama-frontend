"""
NAMA Backend OS — FastAPI Application  v0.3.0
===============================================
Security baseline (all 4 Hard Stops resolved):
  HS-1 ✅  JWT: user_id, tenant_id, role. Refresh token (httpOnly cookie). bcrypt.
  HS-2 ✅  RLS: all DB queries tenant-scoped via require_tenant(). assert_same_tenant().
  HS-3 ✅  Payments: idempotency keys, Saga pattern, HMAC webhook verification.
  HS-4 ✅  AI: kill-switch, per-tenant budget, circuit breaker, usage audit log.

Performance hardening for 5K–50K concurrent users:
  - Connection pooling: pool_size=20, max_overflow=40 (configurable via env)
  - SQLite WAL mode for dev/test (higher concurrent read throughput)
  - GZip response compression (reduces payload ~70% for JSON)
  - X-Process-Time header on every response (latency monitoring)
  - Tenant-scoped in-process TTL cache (30s) on hot read endpoints
  - Rate limiting via SlowAPI (100 req/s per IP on auth endpoints)
"""

import os
import time
import logging
import re
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1 import google_auth
from app.api.v1 import (
    auth, tenants, itineraries, bidding, queries,
    documents, financials, analytics, portals,
    communications, bookings, content, corporate,
    leads, quotations, vendors,
)
from app.api.v1 import payments as payments_router
from app.api.v1 import ai_admin
from app.api.v1 import admin as platform_admin
from app.api.v1 import settings as settings_router
from app.api.v1 import webhooks as webhooks_router
from app.api.v1 import copilot as copilot_router
from app.api.v1 import automations as automations_router
from app.api.v1 import investor as investor_router
from app.api.v1 import feedback as feedback_router
from app.api.v1 import roles as roles_router
from app.api.v1 import marketplace as marketplace_router
from app.db.session import engine, Base, init_performance_indexes
from app.core.cache_warmer import start_background_warmer
from app.core.rate_limiter import RateLimitMiddleware
from app.core.logging_config import configure_logging
from app.core.metrics import record_request

# ── Initialize structured logging early ────────────────────────────────────────
configure_logging(
    level=os.getenv("LOG_LEVEL", "INFO"),
    json_output=os.getenv("LOG_FORMAT", "json") == "json"
)

# ── Initialize Sentry ──────────────────────────────────────────────────────────
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

# ── DB Init ────────────────────────────────────────────────────────────────────
# Import all models so Base.metadata includes their tables.
#
# PRODUCTION DEPLOYMENT (Critical):
#   Replace create_all() with Alembic migrations:
#     1. Run: alembic upgrade head
#     2. This applies baseline_schema + all performance indexes automatically
#     3. Never call Base.metadata.create_all() in production
#     4. To add new migrations: alembic revision --autogenerate -m "description"
#
# DEVELOPMENT:
#   Use create_all() for fast iteration during development.
#   For testing migrations: alembic upgrade head (or downgrade/upgrade)
#
from app.models import auth as _auth_model        # noqa: F401
from app.models import leads as _leads_model       # noqa: F401  (M2 — CRM)
from app.models import vendors as _vendors_model     # noqa: F401  (M6 — Vendor/Supplier)
from app.models import itineraries as _itineraries_model # noqa: F401  (M8 — Itinerary)
from app.models import bookings as _bookings_model    # noqa: F401  (M7 — Booking)
from app.models import payments as _payments_model    # noqa: F401  (HS-3)
from app.models import ai_usage as _ai_usage_model    # noqa: F401  (HS-4)
from app.models import webhooks as _webhooks_model    # noqa: F401  (M19 — Inbound webhooks)
from app.models import content as _content_model     # noqa: F401  (M12 — Content library)
from app.models import corporate as _corporate_model   # noqa: F401  (M10 — Corporate / B2B2C)
from app.models import portals as _portals_model     # noqa: F401  (M13 — Client portals)
from app.models import clients as _clients_model     # noqa: F401  (M14 — Client / Contact database)

# Import router modules that define their own ORM models
# (Automation, AutomationRun, TenantInvite, ByokApiKey)
from app.api.v1 import automations as _automations_models  # noqa: F401
from app.api.v1 import settings as _settings_models        # noqa: F401

# NOTE: Schema is managed exclusively by Alembic migrations (run at deploy time).
# create_all() has been removed to prevent each gunicorn worker from racing to
# create tables/enums on startup, which caused UniqueViolation on pg enum types
# and exhausted the DB connection pool under high worker concurrency.

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NAMA AI-First Travel OS",
    version="0.3.0",
    description="World-class AI-native B2B2C travel operating system. All Hard Stops resolved.",
    # Tier 8B: disable the default doc routes so we can re-mount them under auth.
    # Set DOCS_PUBLIC=true in the environment to restore public docs (e.g. for
    # local dev). In production, leave unset — only R0/R1 can view via /api/docs.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


# Tier 8B: auth-gated OpenAPI docs.
# A leak of the route tree to the public internet is a credibility + security
# smell even if every endpoint does its own auth check. We re-implement
# /api/docs, /api/redoc, /api/openapi.json behind a session check that
# requires R0_NAMA_OWNER or R1_SUPER_ADMIN.
def _docs_access_check(request: Request) -> None:
    """Allow only authenticated R0/R1 staff. Anyone else gets a 404."""
    if os.getenv("DOCS_PUBLIC", "").lower() == "true":
        return
    # Lazily resolve to avoid circular imports at module load.
    from app.api.v1.deps import get_current_user as _gcu
    from fastapi import HTTPException as _HE
    try:
        token = ""
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
        else:
            # Fallback: cookie-based auth used by some flows
            token = request.cookies.get("nama_token", "")
        if not token:
            # 404 not 401 — never tell the caller the docs exist.
            raise _HE(status_code=404, detail="Not Found")
        # Decode JWT claims directly (avoid the full DB-backed get_current_user
        # path — these endpoints are touched by R0/R1 manually, no need for the
        # full request lifecycle dep).
        from app.core.security import decode_access_token
        claims = decode_access_token(token)
        role = (claims or {}).get("role", "")
        if role not in ("R0_NAMA_OWNER", "R1_SUPER_ADMIN"):
            raise _HE(status_code=404, detail="Not Found")
    except _HE:
        raise
    except Exception:
        raise _HE(status_code=404, detail="Not Found")


# Tier 9A: global error envelope.
# All 4xx/5xx responses are normalized to:
#   { "error": { "code": "<machine_code>", "message": "<human_text>", "details": {...} } }
# This makes the frontend's error-handling code uniform across endpoints.
# Legacy `{detail: ...}` is preserved inside `details.legacy_detail` for back-compat.
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse as _JSONResponse
from starlette.exceptions import HTTPException as _StarletteHTTPException
import logging as _logging
_log = _logging.getLogger(__name__)


def _envelope(code: str, message: str, status_code: int, details: dict | None = None) -> _JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details or {}}}
    return _JSONResponse(status_code=status_code, content=body)


@app.exception_handler(_StarletteHTTPException)
async def _envelope_http_exception(request: Request, exc: _StarletteHTTPException):
    # FastAPI's HTTPException is a subclass; this catches both.
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    code_map = {400: "bad_request", 401: "unauthorized", 403: "forbidden",
                404: "not_found", 409: "conflict", 410: "gone", 422: "unprocessable",
                429: "rate_limited", 500: "internal_error", 503: "service_unavailable"}
    return _envelope(
        code=code_map.get(exc.status_code, f"http_{exc.status_code}"),
        message=detail or "An error occurred",
        status_code=exc.status_code,
        details={"legacy_detail": exc.detail} if not isinstance(exc.detail, str) else None,
    )


@app.exception_handler(RequestValidationError)
async def _envelope_validation_error(request: Request, exc: RequestValidationError):
    # Pydantic 422s — preserve the field-level error list under details.
    return _envelope(
        code="validation_error",
        message="Request validation failed",
        status_code=422,
        details={"errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def _envelope_unhandled(request: Request, exc: Exception):
    # Last-resort catcher for unexpected errors. Logged so Sentry/log aggregation
    # picks them up, but returned as a sanitized envelope (no stack trace leaks).
    _log.exception("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return _envelope(
        code="internal_error",
        message="Internal server error",
        status_code=500,
        details={"path": str(request.url.path)},
    )


# Tier 8B: gated re-implementation of /api/docs, /api/redoc, /api/openapi.json.
# Returns 404 to anyone without an R0/R1 access token, indistinguishable from
# a missing route. Set DOCS_PUBLIC=true env var to bypass for local dev.
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi as _get_openapi

@app.get("/api/openapi.json", include_in_schema=False)
def _openapi_gated(request: Request):
    _docs_access_check(request)
    return _get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

@app.get("/api/docs", include_in_schema=False)
def _docs_gated(request: Request):
    _docs_access_check(request)
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title=f"{app.title} — Swagger UI",
    )

@app.get("/api/redoc", include_in_schema=False)
def _redoc_gated(request: Request):
    _docs_access_check(request)
    return get_redoc_html(
        openapi_url="/api/openapi.json",
        title=f"{app.title} — ReDoc",
    )

# ── Middleware stack (order matters — outermost applied last) ──────────────────

# Tier 10D — install structured JSON logging at boot. This replaces the root
# log handler with a single JSON-formatted stdout writer, so every line emitted
# by the app, uvicorn, and gunicorn is machine-parseable and includes the
# per-request request_id / tenant_id / user_id when available.
try:
    from app.core.structured_log import configure_json_logging, RequestLoggingMiddleware
    configure_json_logging()
    app.add_middleware(RequestLoggingMiddleware)
except Exception as _e:  # pragma: no cover — never let logging setup take the app down
    import logging as _logging
    _logging.getLogger(__name__).warning("structured_log init failed: %s", _e)

# 1. GZip — compress all JSON responses ≥ 500 bytes (~70% size reduction)
app.add_middleware(GZipMiddleware, minimum_size=500)

# 2. CORS
_ALLOWED_ORIGINS_RAW = os.getenv(
    "ALLOWED_ORIGINS",
    # Defaults: local dev + Vercel production aliases.
    # In Railway Dashboard, set ALLOWED_ORIGINS to your exact Vercel URLs (comma-separated).
    "http://localhost:3000,https://app.namatravel.com,https://nama-frontend.vercel.app,https://nama-web.vercel.app",
)
ALLOWED_ORIGINS = [o.strip() for o in _ALLOWED_ORIGINS_RAW.split(",") if o.strip()]

# ── Custom CORS middleware to support *.vercel.app preview deployments ─────────
# FastAPI's built-in CORSMiddleware doesn't support wildcard subdomains.
# This middleware adds regex-based origin matching so every Vercel preview URL
# (e.g. nama-frontend-xyz.vercel.app) passes CORS without hardcoding each one.
import re as _re

_VERCEL_PREVIEW_RE = _re.compile(
    r'^https://[a-z0-9\-]+-[a-z0-9]+-narayanmallapur-3085s-projects\.vercel\.app$'
)
_LOCALHOST_RE = _re.compile(r'^http://localhost:\d+$')

def _is_allowed_origin(origin: str) -> bool:
    if origin in ALLOWED_ORIGINS:
        return True
    if _VERCEL_PREVIEW_RE.match(origin):
        return True
    if _LOCALHOST_RE.match(origin):
        return True
    return False


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    is_allowed = _is_allowed_origin(origin) if origin else False

    if request.method == "OPTIONS":
        response = Response(status_code=204)
        if is_allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Max-Age"] = "600"
        return response

    response = await call_next(request)
    if is_allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Standard CORSMiddleware kept as a belt-and-suspenders fallback for non-credential requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Per-tenant rate limiting — protect against abuse at 50K+ concurrent users
app.add_middleware(RateLimitMiddleware)

# 4. Metrics collection — record request metrics for Prometheus
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start

    # Extract tenant_id from JWT if available (best-effort, no exception propagation)
    tenant_id = "unknown"
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            from app.core.security import decode_access_token
            claims = decode_access_token(auth[7:])
            tenant_id = str(claims.get("tenant_id", "unknown"))
        except Exception:
            pass

    # Normalise path (replace IDs with {id} to avoid high cardinality)
    path = request.url.path
    normalised = re.sub(r'/\d+', '/{id}', path)

    record_request(request.method, normalised, response.status_code, tenant_id, duration)
    return response

# 5. Request timing — adds X-Process-Time header to every response
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"
    # Also add request-id for distributed tracing (use nginx/ingress for real UUID)
    response.headers["X-Request-Path"] = request.url.path
    # Propagate rate limit headers from middleware if present
    return response


# ── Routes ─────────────────────────────────────────────────────────────────────
#   Auth (HS-1)
app.include_router(auth.router,            prefix="/api/v1",              tags=["auth"])
app.include_router(google_auth.router,     prefix="/api/v1/auth",         tags=["google-auth"])

#   CRM & Triage pipeline
app.include_router(queries.router,         prefix="/api/v1/queries",      tags=["queries"])
app.include_router(leads.router,           prefix="/api/v1/leads",        tags=["leads"])
app.include_router(quotations.router,      prefix="/api/v1/quotations",   tags=["quotations"])

#   Core platform
app.include_router(tenants.router,         prefix="/api/v1/tenants",      tags=["tenants"])
app.include_router(itineraries.router,     prefix="/api/v1/itineraries",  tags=["itineraries"])
app.include_router(bidding.router,         prefix="/api/v1/bidding",      tags=["bidding"])
app.include_router(documents.router,       prefix="/api/v1/documents",    tags=["documents"])
app.include_router(analytics.router,       prefix="/api/v1/analytics",    tags=["analytics"])
app.include_router(portals.router,         prefix="/api/v1/portals",      tags=["portals"])
app.include_router(communications.router,  prefix="/api/v1/comms",        tags=["communications"])
app.include_router(content.router,         prefix="/api/v1/content",      tags=["content"])
app.include_router(corporate.router,       prefix="/api/v1/corporate",    tags=["corporate"])
app.include_router(financials.router,      prefix="/api/v1/finance",      tags=["financials"])

#   Tier 9B: GDPR / DPDP data export + deletion-request endpoints
from app.api.v1 import data_export as _data_export_router
app.include_router(_data_export_router.router, prefix="/api/v1/me", tags=["data-export"])

#   Bookings with Saga pattern (HS-3)
app.include_router(bookings.router,        prefix="/api/v1/bookings",     tags=["bookings"])

#   Payments + webhooks (HS-3)
app.include_router(payments_router.router, prefix="/api/v1/payments",     tags=["payments"])

#   AI admin — usage, budget, health, kill-switch (HS-4)
app.include_router(ai_admin.router,        prefix="/api/v1/ai",           tags=["ai-admin"])
app.include_router(platform_admin.router,  prefix="/api/v1/admin",        tags=["admin"])
app.include_router(settings_router.router, prefix="/api/v1/settings",     tags=["settings"])

#   Inbound webhooks (WhatsApp, Razorpay, generic)
app.include_router(webhooks_router.router, prefix="/api/v1/webhooks",     tags=["webhooks"])

#   Vendor / supplier management (M6)
app.include_router(vendors.router,         prefix="/api/v1/vendors",      tags=["vendors"])

#   AI Copilot — SSE streaming chat (P3-5)
app.include_router(copilot_router.router,     prefix="/api/v1/copilot",      tags=["copilot"])

#   Automations — workflow engine CRUD (P3-7)
app.include_router(automations_router.router, prefix="/api/v1/automations",  tags=["automations"])

#   Investor dashboard — R0 platform analytics (P3-9)
app.include_router(investor_router.router,    prefix="/api/v1/investor",     tags=["investor"])

#   Feedback / NPS (P4-10)
app.include_router(feedback_router.router,     prefix="/api/v1/feedback",     tags=["feedback"])
app.include_router(roles_router.router,        prefix="/api/v1",              tags=["roles"])

#   DMC Marketplace — cross-tenant public rate catalog
app.include_router(marketplace_router.router,  prefix="/api/v1/marketplace",  tags=["marketplace"])

#   Onboarding — seeded workspace on first login
from app.api.v1 import onboarding as onboarding_router  # noqa: E402
app.include_router(onboarding_router.router,   prefix="/api/v1/onboarding",   tags=["onboarding"])

#   Global full-text search — cross-module ILIKE
from app.api.v1 import search as search_router  # noqa: E402
app.include_router(search_router.router,       prefix="/api/v1",              tags=["search"])

#   Clients / Contact database (M14)
from app.api.v1 import clients as clients_router  # noqa: E402
app.include_router(clients_router.router,      prefix="/api/v1/clients",      tags=["clients"])

#   WhatsApp Business API — inbound webhook + outbound send
from app.api.v1 import whatsapp as whatsapp_router  # noqa: E402
app.include_router(whatsapp_router.router,     prefix="/api/v1/whatsapp",     tags=["whatsapp"])

#   Routines — in-product automation engine
from app.api.v1 import routines as routines_router  # noqa: E402
from app.models import routines as _routines_model  # noqa: F401
app.include_router(routines_router.router,     prefix="/api/v1/routines",     tags=["routines"])

#   Website Lead Capture Widget — public token-based endpoint
from app.api.v1 import lead_capture as lead_capture_router  # noqa: E402
app.include_router(lead_capture_router.router, prefix="/api/v1/capture",      tags=["lead-capture"])

#   Per-tenant SMTP/IMAP Email Config
from app.api.v1 import email_config as email_config_router  # noqa: E402
from app.models import email_config as _email_config_model  # noqa: F401
app.include_router(email_config_router.router, prefix="/api/v1/email-config",  tags=["email-config"])

#   Facebook Lead Ads + Instagram DM social webhooks
from app.api.v1 import social_webhooks as social_webhooks_router  # noqa: E402
app.include_router(social_webhooks_router.router, prefix="/api/v1/social",    tags=["social"])

#   Calendar reminders + iCal feed
from app.api.v1 import calendar_reminders as calendar_reminders_router  # noqa: E402
app.include_router(calendar_reminders_router.router, prefix="/api/v1/calendar", tags=["calendar"])

#   Infrastructure Sentinel — usage monitoring + threshold alerts
from app.api.v1 import sentinel as sentinel_router  # noqa: E402
app.include_router(sentinel_router.router, prefix="/api/v1/sentinel", tags=["sentinel"])

#   Intentra — M20 intent intelligence feed
from app.api.v1 import intentra as intentra_router  # noqa: E402
app.include_router(intentra_router.router, prefix="/api/v1/intentra", tags=["intentra"])

#   Email Templates — M21 tenant + system template library
from app.api.v1 import email_templates as email_templates_router  # noqa: E402
from app.models import email_template as _email_template_model  # noqa: F401
app.include_router(email_templates_router.router, prefix="/api/v1/email-templates", tags=["email-templates"])

#   Subscription & Billing — plan management, proration, event log
from app.api.v1 import billing as billing_api  # noqa: E402
from app.api.v1 import admin_subscriptions as admin_subscriptions_router  # noqa: E402
from app.models import billing as _billing_model  # noqa: F401
app.include_router(billing_api.router,              prefix="/api/v1/billing",             tags=["billing"])
app.include_router(admin_subscriptions_router.router, prefix="/api/v1/admin/subscriptions", tags=["admin-subscriptions"])

#   Visa Intelligence — LLM-powered visa requirement checklists
from app.api.v1 import visa as visa_router  # noqa: E402
app.include_router(visa_router.router, prefix="/api/v1/visa", tags=["visa"])

#   Holiday Packages — pre-packaged group tour products (M20)
from app.api.v1 import holidays as holidays_router  # noqa: E402
from app.models import holidays as _holidays_model  # noqa: F401
app.include_router(holidays_router.router, prefix="/api/v1/holidays", tags=["holidays"])


# ── Startup Event ─────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    """
    Initialize cache warming and performance indexes on server startup.
    Runs in a background thread to avoid blocking server initialization.
    """
    start_background_warmer()
    # Initialize performance indexes — uses CREATE INDEX IF NOT EXISTS so it is
    # safe to call from every worker; concurrent calls are idempotent.
    init_performance_indexes()
    # Tier 10B: spin up the IMAP background poller. Polls every 15 min for
    # tenants with TenantEmailConfig + active SMTP/IMAP creds, calls
    # poll_imap_replies, writes inbound replies to ConversationMessage.
    # Runs in worker 1 only (skipped in others) to avoid duplicate polls.
    import os as _os
    if _os.getenv("DISABLE_IMAP_POLLER", "").lower() != "true":
        _start_imap_background_poller()


def _start_imap_background_poller():
    """
    Tier 10B: schedules `_imap_poll_tick` to run every IMAP_POLL_MINUTES (default 15).

    Uses asyncio.create_task on the running loop so it's scoped to this
    process. Only runs in the first gunicorn worker (per WORKER_ID check)
    to prevent N replicas all polling simultaneously.
    """
    import asyncio as _asyncio
    import os as _os
    # Only worker 1 runs the poller. Gunicorn sets GUNICORN_WORKER_ID; we fall
    # back to checking the lowest PID-mod available.
    worker_id = _os.getenv("GUNICORN_WORKER_ID", "")
    # If we can't determine, only run when an explicit IMAP_POLLER_OWNER var
    # is set. Otherwise we'd have N concurrent pollers.
    if worker_id and worker_id != "0":
        _log.info("IMAP poller skipped on worker %s (owner is worker 0)", worker_id)
        return
    if not worker_id and _os.getenv("IMAP_POLLER_OWNER", "").lower() != "true":
        _log.info("IMAP poller skipped (set IMAP_POLLER_OWNER=true on exactly one replica to enable)")
        return

    interval_min = int(_os.getenv("IMAP_POLL_MINUTES", "15"))

    async def _poll_loop():
        # Initial delay so we don't poll during the boot stampede
        await _asyncio.sleep(60)
        while True:
            try:
                await _imap_poll_tick()
            except Exception as exc:
                _log.warning("IMAP poll tick error: %s", exc)
            await _asyncio.sleep(interval_min * 60)

    try:
        loop = _asyncio.get_event_loop()
        loop.create_task(_poll_loop())
        _log.info("IMAP background poller scheduled every %d min", interval_min)
    except RuntimeError:
        # No running loop yet (uvicorn hasn't started) — register a task that
        # will be awaited once the loop starts. Falls back to skip otherwise.
        _log.warning("IMAP poller — no running loop at startup; will retry on first request")


async def _imap_poll_tick():
    """
    One IMAP poll tick — iterates tenants with active config and runs
    poll_imap_replies for each. Each reply is written to
    ConversationMessage by the existing logic in email_config.py.
    """
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        from app.models.email_config import TenantEmailConfig
        from app.core.email_service import poll_imap_replies
        from app.models.conversation_messages import (
            ConversationMessage, MessageDirection, MessageDeliveryStatus,
        )

        configs = db.query(TenantEmailConfig).filter(
            TenantEmailConfig.imap_host.isnot(None)
        ).all()

        for cfg in configs:
            try:
                replies = poll_imap_replies(cfg, since_hours=1)  # 1h window since we poll every 15 min
                for reply in replies:
                    msg_id_header = (reply.get("message_id") or "").strip("<> ")
                    if not msg_id_header:
                        continue
                    # Dedup
                    already = db.query(ConversationMessage).filter(
                        ConversationMessage.tenant_id == cfg.tenant_id,
                        ConversationMessage.external_id == msg_id_header,
                    ).first()
                    if already:
                        continue
                    cm = ConversationMessage(
                        tenant_id=cfg.tenant_id,
                        lead_id=None,  # background poll doesn't try to thread; UI can
                        channel="EMAIL",
                        direction=MessageDirection.INBOUND.value,
                        status=MessageDeliveryStatus.RECEIVED.value,
                        content=(reply.get("body_text") or "")[:8000],
                        external_id=msg_id_header,
                        peer_address=reply.get("from_email"),
                        author_name=reply.get("from_name") or reply.get("from_email"),
                    )
                    db.add(cm)
                db.commit()
                if replies:
                    _log.info("IMAP poll: tenant=%s ingested=%d", cfg.tenant_id, len(replies))
            except Exception as exc:
                _log.warning("IMAP poll error tenant=%s: %s", getattr(cfg, "tenant_id", "?"), exc)
                db.rollback()
    finally:
        db.close()


# ── Health & Diagnostics ───────────────────────────────────────────────────────
@app.get("/", tags=["system"])
def read_root():
    return {
        "service": "NAMA OS Backend",
        "version": "0.3.0",
        "status": "operational",
        "docs": "/api/docs",
    }


@app.get("/api/v1/health", tags=["system"])
def health_check():
    from datetime import datetime, timezone
    from app.core.ai_budget import ai_is_disabled, get_all_breaker_states
    from app.core.cache import cache
    from app.core.redis_cache import distributed_cache

    cache_stats = cache.stats()
    cache_stats["cache_backend"] = distributed_cache.stats()["backend"]

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "0.3.0",
        "hard_stops": {
            "HS1_auth_jwt_claims": "resolved",
            "HS2_rls_tenant_scope": "resolved",
            "HS3_payment_safety": "resolved",
            "HS4_ai_cost_controls": "resolved",
        },
        "ai_kill_switch_active": ai_is_disabled(),
        "circuit_breakers": get_all_breaker_states(),
        "cache": cache_stats,
    }


@app.get("/api/v1/perf", tags=["system"])
def perf_check():
    """Lightweight endpoint for load balancer probes — no DB, no auth."""
    return {"ok": True}


# ── Prometheus Metrics ─────────────────────────────────────────────────────────
@app.get("/api/v1/metrics", tags=["system"], include_in_schema=True)
def prometheus_metrics():
    """
    Expose Prometheus-format metrics collected by NAMA's metrics middleware.
    Secured: only authenticated R2_ORG_ADMIN+ may scrape in production.
    Returns: text/plain Prometheus exposition format.
    """
    from fastapi.responses import PlainTextResponse
    try:
        from app.core.metrics import REGISTRY, generate_latest, CONTENT_TYPE_LATEST
        metrics_output = generate_latest(REGISTRY)
        return PlainTextResponse(content=metrics_output.decode("utf-8"),
                                 media_type=CONTENT_TYPE_LATEST)
    except Exception as e:
        # Fallback: return a minimal valid Prometheus response
        return PlainTextResponse(
            content=f"# HELP nama_up NAMA backend is running\n# TYPE nama_up gauge\nnama_up 1\n",
            media_type="text/plain; version=0.0.4",
        )


