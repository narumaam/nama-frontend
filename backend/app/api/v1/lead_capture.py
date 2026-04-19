"""
Website Lead Capture API — Public Endpoints
---------------------------------------------
Authenticated by `capture_token` query param (not JWT).
The token identifies the tenant so no login is required from the website visitor.

Register in main.py:
  from app.api.v1 import lead_capture as lead_capture_router
  app.include_router(lead_capture_router.router, prefix="/api/v1/capture", tags=["lead-capture"])
"""

import logging
import secrets
import time
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.auth import Tenant
from app.models.leads import Lead, LeadSource, LeadStatus
from app.api.v1.deps import require_tenant

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── In-memory rate limiter — 10 submissions per IP per hour ──────────────────

_capture_rate: dict[str, list[float]] = defaultdict(list)
_CAPTURE_LIMIT  = 10
_CAPTURE_WINDOW = 3600  # seconds


def _check_rate_limit(ip: str) -> bool:
    """Return True if the IP is allowed, False if rate limited."""
    now = time.time()
    window_start = now - _CAPTURE_WINDOW
    timestamps = [t for t in _capture_rate[ip] if t > window_start]
    _capture_rate[ip] = timestamps
    if len(timestamps) >= _CAPTURE_LIMIT:
        return False
    _capture_rate[ip].append(now)
    return True


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    if request.client:
        return request.client.host
    return "127.0.0.1"


# ─── Token resolution helper ──────────────────────────────────────────────────

def _resolve_tenant_by_token(
    token: str,
    db: Session,
) -> Tenant:
    """
    Look up a Tenant whose settings["capture_token"] matches the given token.
    Raises HTTP 401 if not found or token is invalid.
    """
    if not token or len(token) < 10:
        raise HTTPException(status_code=401, detail="Invalid capture token")

    # Postgres JSONB containment query: settings @> '{"capture_token": "<value>"}'
    tenant = (
        db.query(Tenant)
        .filter(
            Tenant.settings["capture_token"].as_string() == token,
            Tenant.status == "ACTIVE",
        )
        .first()
    )
    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid or expired capture token")
    return tenant


# ─── Request / Response models ────────────────────────────────────────────────

class LeadCaptureBody(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    destination: Optional[str] = None
    travel_dates: Optional[str] = None
    budget_per_person: Optional[float] = None
    currency: str = "INR"
    travelers_count: int = 1
    notes: Optional[str] = None


class VerifyResponse(BaseModel):
    valid: bool
    agency_name: str
    branding_color: str


class LeadCaptureResponse(BaseModel):
    success: bool
    lead_id: int
    message: str


# ─── GET /api/v1/capture/verify ───────────────────────────────────────────────

@router.get("/verify", response_model=VerifyResponse)
def verify_token(
    token: str = Query(..., description="Agency capture token"),
    db: Session = Depends(get_db),
) -> VerifyResponse:
    """
    Verify a capture token is valid.
    Returns the agency display name and branding colour so the widget
    can style itself before the first form submission.
    """
    tenant = _resolve_tenant_by_token(token, db)
    settings = tenant.settings or {}
    branding_color = settings.get("widget_color", "#10B981")
    return VerifyResponse(
        valid=True,
        agency_name=tenant.name,
        branding_color=branding_color,
    )


# ─── POST /api/v1/capture/lead ────────────────────────────────────────────────

@router.post("/lead", response_model=LeadCaptureResponse)
def capture_lead(
    body: LeadCaptureBody,
    request: Request,
    token: str = Query(..., description="Agency capture token"),
    db: Session = Depends(get_db),
) -> LeadCaptureResponse:
    """
    Create a Lead record for the given agency (identified by capture_token).
    No JWT required — this is called directly from third-party websites.

    Rate limit: 10 submissions per IP per hour.
    """
    ip = _get_ip(request)
    if not _check_rate_limit(ip):
        raise HTTPException(
            status_code=429,
            detail="Too many enquiries from this IP. Please try again later.",
        )

    tenant = _resolve_tenant_by_token(token, db)

    # sender_id is required on Lead — use email, phone, or fallback
    sender_id = body.email or body.phone or f"widget:{ip}"

    lead = Lead(
        tenant_id=tenant.id,
        sender_id=sender_id,
        source=LeadSource.WEBSITE,
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        destination=body.destination,
        travel_dates=body.travel_dates,
        budget_per_person=body.budget_per_person,
        currency=body.currency,
        travelers_count=body.travelers_count,
        notes=body.notes,
        status=LeadStatus.NEW,
        priority=5,
        triage_confidence=0.0,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    logger.info(
        "capture_lead: tenant=%d lead=%d name=%s ip=%s",
        tenant.id,
        lead.id,
        body.full_name,
        ip,
    )

    return LeadCaptureResponse(
        success=True,
        lead_id=lead.id,
        message="Thank you! We'll be in touch within 2 hours.",
    )


# ─── GET /api/v1/capture/generate-token ──────────────────────────────────────

@router.get("/generate-token")
def generate_token(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> dict:
    """
    Generate (or retrieve) a capture token for the authenticated tenant.
    Requires a valid JWT — this is the admin endpoint used in the dashboard.

    Safe to call multiple times: returns the existing token if one is already set.
    Pass ?rotate=true to force a new token (invalidates the old one).
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    settings = dict(tenant.settings or {})
    existing_token = settings.get("capture_token")

    if existing_token:
        return {
            "token": existing_token,
            "generated": False,
            "message": "Existing token returned. Use ?rotate=true to generate a new one.",
        }

    new_token = secrets.token_urlsafe(32)
    settings["capture_token"] = new_token
    tenant.settings = settings

    try:
        db.commit()
    except Exception as exc:
        logger.error("generate_token: db.commit failed: %s", exc)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to persist token")

    logger.info("generate_token: new token generated for tenant=%d", tenant_id)
    return {
        "token": new_token,
        "generated": True,
        "message": "New capture token generated successfully.",
    }


@router.post("/rotate-token")
def rotate_token(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> dict:
    """
    Force-rotate the capture token for the authenticated tenant.
    The old token is immediately invalidated.
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_token = secrets.token_urlsafe(32)
    settings = dict(tenant.settings or {})
    settings["capture_token"] = new_token
    tenant.settings = settings

    try:
        db.commit()
    except Exception as exc:
        logger.error("rotate_token: db.commit failed: %s", exc)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to persist token")

    logger.info("rotate_token: token rotated for tenant=%d", tenant_id)
    return {
        "token": new_token,
        "rotated": True,
        "message": "Capture token rotated. Update the <script> tag on your website.",
    }


# ─── GET /api/v1/capture/stats ───────────────────────────────────────────────

@router.get("/stats")
def capture_stats(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> dict:
    """
    Return the count of leads captured via the website widget this month.
    Requires JWT auth — used by the dashboard widget page.
    """
    from datetime import datetime, timezone
    from sqlalchemy import func, extract

    now = datetime.now(timezone.utc)

    count = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.tenant_id == tenant_id,
            Lead.source == LeadSource.WEBSITE,
            extract("year",  Lead.created_at) == now.year,
            extract("month", Lead.created_at) == now.month,
        )
        .scalar()
        or 0
    )

    return {
        "month": now.strftime("%B %Y"),
        "widget_leads_this_month": count,
    }
