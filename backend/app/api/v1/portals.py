from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.portals import PortalConfig, PortalBranding, PortalPublicInfo
from app.models.portals import Portal
from app.models.auth import Tenant
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import Optional, List

router = APIRouter()

@router.post("/configure", response_model=PortalConfig)
def configure_portal(
    config_in: PortalConfig,
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Configure a white-label portal for the organization (M10).
    Allows custom branding, features, and CNAME domains.
    """
    db_portal = db.query(Portal).filter(Portal.tenant_id == current_user.tenant_id).first()
    
    # Store settings in a structured JSON
    portal_data = config_in.model_dump()
    
    if db_portal:
        db_portal.config = portal_data["branding"]
        db_portal.custom_domain = portal_data["custom_domain"]
        db_portal.is_active = portal_data["is_active"]
    else:
        db_portal = Portal(
            tenant_id=current_user.tenant_id,
            custom_domain=portal_data["custom_domain"],
            config=portal_data["branding"],
            is_active=portal_data["is_active"]
        )
        db.add(db_portal)
    
    db.commit()
    db.refresh(db_portal)
    
    return PortalConfig(
        id=db_portal.id,
        tenant_id=db_portal.tenant_id,
        custom_domain=db_portal.custom_domain,
        is_active=db_portal.is_active,
        branding=PortalBranding(**db_portal.config) if isinstance(db_portal.config, dict) else PortalBranding(),
        features_enabled=["ITINERARY_VIEW", "BOOKINGS"]
    )

@router.get("/lookup", response_model=PortalPublicInfo)
def lookup_portal_by_domain(
    request: Request,
    domain: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Public lookup for portal branding based on the visiting hostname (CNAME Support).
    This endpoint is used by the Next.js middleware to render correct branding.
    """
    host = domain or request.headers.get("host")
    
    # Logic to find the portal by custom_domain or internal org_code
    db_portal = db.query(Portal).filter(Portal.custom_domain == host).first()
    
    if not db_portal:
        # Fallback for internal subdomains like {org_code}.nama.travel
        org_code = host.split(".")[0]
        db_tenant = db.query(Tenant).filter(Tenant.org_code == org_code).first()
        if db_tenant:
            db_portal = db.query(Portal).filter(Portal.tenant_id == db_tenant.id).first()
    
    if not db_portal:
        raise HTTPException(status_code=404, detail="Portal not found.")
    
    return PortalPublicInfo(
        name=db_portal.tenant.name,
        branding=PortalBranding(**db_portal.config) if isinstance(db_portal.config, dict) else PortalBranding(),
        support_contact=db_portal.config.get("contact_email", "support@nama.travel")
    )


# ── Customer-facing booking portal — public endpoint ────────────────────────
# Used by /portal/[bookingId] on the frontend. No auth, but the URL must
# contain a real booking_id (server-side 404 for unknown IDs). Returns a
# sanitised view — internal fields like vendor cost_net are not exposed.

from pydantic import BaseModel as _BaseModel
from typing import Any as _Any


class PortalBookingDay(_BaseModel):
    dayNumber: int
    date: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    blocks: list[dict] = []


class PortalQuotationItem(_BaseModel):
    label: str
    amount: float


class PortalBookingOut(_BaseModel):
    bookingRef: str
    clientName: Optional[str] = None
    clientPhone: Optional[str] = None
    destination: Optional[str] = None
    packageName: Optional[str] = None
    travelDate: Optional[str] = None
    returnDate: Optional[str] = None
    pax: int = 1
    agencyName: Optional[str] = None
    agentName: Optional[str] = None
    agentPhone: Optional[str] = None
    agentPhoto: Optional[str] = None
    heroImage: Optional[str] = None
    days: list[PortalBookingDay] = []
    documents: list[dict] = []
    emergencyPhone: Optional[str] = None
    # Quote acceptance
    quotationStatus: Optional[str] = None
    quotationId: Optional[int] = None
    quotationTotal: Optional[float] = None
    quotationCurrency: Optional[str] = None
    quotationItems: list[PortalQuotationItem] = []


def _verify_portal_token(booking_id: int, tenant_id: int, token: str) -> bool:
    """
    Tier 8D: verify a signed portal token.

    Token format: hex(hmac_sha256(PORTAL_TOKEN_SECRET, "booking:{id}:{tenant_id}"))

    No expiry — once a booking exists the agency wants to share its portal
    URL for the duration of the trip. Rotate by changing PORTAL_TOKEN_SECRET
    if a leak is suspected.

    For backward compat with bookings created before this feature, when
    PORTAL_TOKEN_SECRET is unset we accept ANY request (legacy mode). Once
    the env var is set, all portal reads must carry a valid t= query param.
    """
    import os
    import hmac as _hmac
    import hashlib as _hashlib

    secret = os.getenv("PORTAL_TOKEN_SECRET", "")
    if not secret:
        # Legacy mode — feature opt-in via env var presence
        return True
    if not token:
        return False
    try:
        message = f"booking:{booking_id}:{tenant_id}".encode()
        expected = _hmac.new(secret.encode(), message, _hashlib.sha256).hexdigest()
        return _hmac.compare_digest(expected, token)
    except Exception:
        return False


def generate_portal_token(booking_id: int, tenant_id: int) -> str:
    """
    Tier 8D: helper for generating a portal token.
    Used at booking creation time to produce a shareable URL.
    Returns empty string if PORTAL_TOKEN_SECRET is unset.
    """
    import os
    import hmac as _hmac
    import hashlib as _hashlib

    secret = os.getenv("PORTAL_TOKEN_SECRET", "")
    if not secret:
        return ""
    message = f"booking:{booking_id}:{tenant_id}".encode()
    return _hmac.new(secret.encode(), message, _hashlib.sha256).hexdigest()


@router.get("/booking/{booking_id}", response_model=PortalBookingOut)
def get_public_booking(
    booking_id: int,
    t: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Public, no-auth read of a booking for the customer portal page.
    Returns 404 for unknown bookings. The endpoint is deliberately read-only
    and does not expose vendor cost basis, internal status flags, or other
    operational fields.

    Tier 8D: when PORTAL_TOKEN_SECRET is set, requires a `?t={signed_token}`
    query param. Without the env var, runs in legacy mode (any caller allowed).
    The token format is HMAC-SHA256 of "booking:{id}:{tenant_id}".

    Token-gated quote-respond is a separate endpoint
    (POST /api/v1/quotations/{id}/respond) that validates a respondToken in
    the request body — this read endpoint does not need a quote token to load.
    """
    from app.models.bookings import Booking, BookingItem
    from app.models.leads import Lead
    from app.models.itineraries import Itinerary
    from app.models.auth import Tenant
    # Quotation lives in api.v1.quotations (not a dedicated models/ file).
    # Pre-Tier-8 this lazy import failed at request time → endpoint always 500'd.
    # Caught by the Tier 8 smoke test post-deploy.
    from app.api.v1.quotations import Quotation

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Tier 8D: signed-token gate. Returns 404 (not 401) on bad/missing token
    # so the URL space remains uninformative to enumeration attempts.
    if not _verify_portal_token(booking.id, booking.tenant_id, t or ""):
        raise HTTPException(status_code=404, detail="Booking not found")

    lead = db.query(Lead).filter(Lead.id == booking.lead_id).first() if booking.lead_id else None
    itinerary = db.query(Itinerary).filter(Itinerary.id == booking.itinerary_id).first() if booking.itinerary_id else None
    tenant = db.query(Tenant).filter(Tenant.id == booking.tenant_id).first() if booking.tenant_id else None

    items = db.query(BookingItem).filter(BookingItem.booking_id == booking.id).all()
    travel_date = None
    return_date = None
    if items:
        try:
            travel_date = min((it.start_date for it in items if it.start_date), default=None)
            return_date = max((it.end_date or it.start_date for it in items if it.start_date), default=None)
        except Exception:
            pass

    # Pull days from itinerary.days_json if present
    days_out: list[PortalBookingDay] = []
    if itinerary and getattr(itinerary, "days_json", None):
        days_data = itinerary.days_json if isinstance(itinerary.days_json, list) else []
        for d in days_data:
            if not isinstance(d, dict):
                continue
            days_out.append(PortalBookingDay(
                dayNumber=int(d.get("day_number") or d.get("dayNumber") or 0),
                date=d.get("date"),
                title=d.get("title"),
                location=d.get("location"),
                summary=d.get("summary") or d.get("description"),
                blocks=d.get("blocks") if isinstance(d.get("blocks"), list) else [],
            ))

    # Vouchers / documents emitted as items with voucher_url
    docs_out = [
        {"name": it.item_name, "type": "PDF", "url": it.voucher_url}
        for it in items if it.voucher_url
    ]

    # Quote — fall back gracefully if not present
    q_status = None
    q_id = None
    q_total = None
    q_currency = None
    q_items_out: list[PortalQuotationItem] = []
    quotation = (
        db.query(Quotation)
        .filter(Quotation.lead_id == booking.lead_id)
        .order_by(Quotation.created_at.desc())
        .first()
        if booking.lead_id else None
    )
    if quotation:
        q_id = quotation.id
        q_status = (quotation.status.value if hasattr(quotation.status, "value") else str(quotation.status))
        q_total = float(quotation.total_price) if getattr(quotation, "total_price", None) is not None else None
        q_currency = getattr(quotation, "currency", None) or "INR"
        line_items = getattr(quotation, "line_items", None)
        if isinstance(line_items, list):
            for li in line_items:
                if isinstance(li, dict) and "label" in li and "amount" in li:
                    try:
                        q_items_out.append(PortalQuotationItem(label=str(li["label"]), amount=float(li["amount"])))
                    except Exception:
                        continue

    return PortalBookingOut(
        bookingRef=f"NM-{booking.id:05d}",
        clientName=getattr(lead, "full_name", None) if lead else None,
        clientPhone=getattr(lead, "phone", None) if lead else None,
        destination=getattr(lead, "destination", None) if lead else None,
        packageName=getattr(itinerary, "title", None) if itinerary else None,
        travelDate=travel_date.isoformat()[:10] if travel_date else None,
        returnDate=return_date.isoformat()[:10] if return_date else None,
        pax=getattr(lead, "travelers_count", 1) if lead else 1,
        agencyName=getattr(tenant, "name", None) if tenant else None,
        agentName=None,
        agentPhone=None,
        agentPhoto=None,
        heroImage=None,
        days=days_out,
        documents=docs_out,
        emergencyPhone=None,
        quotationStatus=q_status,
        quotationId=q_id,
        quotationTotal=q_total,
        quotationCurrency=q_currency,
        quotationItems=q_items_out,
    )
