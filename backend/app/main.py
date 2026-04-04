from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import (
    auth, tenants, itineraries, bidding, queries, 
    documents, financials, analytics, portals, 
    communications, bookings, content, corporate,
    integrations, sentinel, rsi,
    sourcing, pricing, payments, marketing, demo, tenant_members, tenant_invites, tenant_sessions, tenant_credentials, tenant_audit
)
from app.db.bootstrap import bootstrap_database
from app.models import beta_auth as beta_auth_models  # noqa: F401
from app.runtime import APP_ENV, get_allowed_cors_origins, validate_runtime_configuration

validate_runtime_configuration()
bootstrap_database()

app = FastAPI(title="NAMA Backend OS", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])
app.include_router(itineraries.router, prefix="/api/v1/itineraries", tags=["itineraries"])
app.include_router(bidding.router, prefix="/api/v1/bidding", tags=["bidding"])
app.include_router(queries.router, prefix="/api/v1/queries", tags=["queries"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(financials.router, prefix="/api/v1/financials", tags=["financials"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(portals.router, prefix="/api/v1/portals", tags=["portals"])
app.include_router(communications.router, prefix="/api/v1/communications", tags=["communications"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["bookings"])
app.include_router(content.router, prefix="/api/v1/content", tags=["content"])
app.include_router(corporate.router, prefix="/api/v1/corporate", tags=["corporate"])
app.include_router(integrations.router, prefix="/api/v1/integrations", tags=["integrations"])
app.include_router(sentinel.router, prefix="/api/v1/sentinel", tags=["sentinel"])
app.include_router(rsi.router, prefix="/api/v1/rsi", tags=["rsi"])
app.include_router(sourcing.router, prefix="/api/v1/sourcing", tags=["sourcing"])
app.include_router(pricing.router, prefix="/api/v1/pricing", tags=["pricing"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])
app.include_router(marketing.router, prefix="/api/v1/marketing", tags=["marketing"])
app.include_router(demo.router, prefix="/api/v1/demo", tags=["demo"])
app.include_router(tenant_members.router, prefix="/api/v1/tenant-members", tags=["tenant-members"])
app.include_router(tenant_invites.router, prefix="/api/v1/tenant-invites", tags=["tenant-invites"])
app.include_router(tenant_sessions.router, prefix="/api/v1/sessions", tags=["tenant-sessions"])
app.include_router(tenant_credentials.router, prefix="/api/v1/credentials", tags=["tenant-credentials"])
app.include_router(tenant_audit.router, prefix="/api/v1/auth-audit", tags=["tenant-auth-audit"])

@app.get("/")
def read_root():
    return {"message": "NAMA OS Backend API is live"}

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mode": APP_ENV,
    }
