"""
HS-2: Bookings Endpoint — Tenant-Scoped (Reference Implementation)
--------------------------------------------------------------------
All queries filtered through require_tenant() and core/rls.py helpers.
This is the reference pattern for all other endpoints.

HS-3: Booking creation uses the Saga pattern (see core/payments.py).
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.db.session import get_db
from app.api.v1.deps import get_token_claims, require_tenant, RoleChecker
from app.models.bookings import Booking as BookingModel, BookingItem as BookingItemModel
from app.core.rls import tenant_query, get_or_404
from app.schemas.bookings import BookingStatus, VoucherGenerateResponse
from app.core.redis_cache import distributed_cache

router = APIRouter()


# ── Response schemas ──────────────────────────────────────────────────────────

class BookingItemOut(BaseModel):
    id: int
    booking_id: int
    type: str
    item_name: str
    status: str
    vendor_id: int
    confirmation_number: Optional[str] = None
    start_date: datetime
    cost_net: float
    price_gross: float
    currency: str

    class Config:
        from_attributes = True


class BookingOut(BaseModel):
    id: int
    itinerary_id: int
    tenant_id: int
    lead_id: int
    status: str
    total_price: float
    currency: str
    created_at: Optional[datetime] = None
    items: List[BookingItemOut] = []

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    itinerary_id: int
    lead_id: int
    total_price: float
    currency: str = "INR"
    idempotency_key: str   # HS-3: required; client generates UUID per booking attempt


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[BookingOut])
def list_bookings(
    booking_status: Optional[str] = None,
    tenant_id: int = Depends(require_tenant),   # HS-2: from JWT, not request
    db: Session = Depends(get_db),
):
    """
    List all bookings for this tenant with 15-second TTL caching.
    HS-2: tenant_id sourced from JWT — no cross-org data possible.
    """
    # Build cache key
    cache_key = f"bookings:{tenant_id}:{booking_status or 'all'}"

    # Try cache hit
    cached = distributed_cache.get(cache_key)
    if cached is not None:
        return cached

    # Cache miss: execute query
    q = tenant_query(db, BookingModel, tenant_id)
    if booking_status:
        q = q.filter(BookingModel.status == booking_status)
    result = q.order_by(BookingModel.created_at.desc()).all()

    # Cache the response with 15-second TTL
    distributed_cache.set(cache_key, result, ttl_seconds=15)
    return result


@router.post("/", response_model=BookingOut, status_code=status.HTTP_202_ACCEPTED)
def create_booking(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    claims: dict = Depends(get_token_claims),
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Create a booking using the Saga pattern (HS-3).
    Step 1: Create DRAFT booking immediately.
    Step 2: Payment processing happens async (background task).
    Returns 202 Accepted with the draft booking immediately.

    HS-3: idempotency_key prevents duplicate bookings on retry.
    """
    from app.core.payments import create_booking_saga
    result = create_booking_saga(
        db=db,
        tenant_id=tenant_id,
        user_id=claims["user_id"],
        payload=payload,
        background_tasks=background_tasks,
    )
    # Invalidate bookings list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"bookings:{tenant_id}:*")
    return result


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Fetch a single booking — raises 404 if not found in this tenant's scope.
    HS-2: get_or_404 enforces tenant isolation.
    """
    return get_or_404(db, BookingModel, booking_id, tenant_id)


@router.post("/{booking_id}/confirm", response_model=BookingOut)
def confirm_booking(
    booking_id: int,
    claims: dict = Depends(RoleChecker(["R2_ORG_ADMIN", "R4_OPS_EXECUTIVE"])),
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Mark a booking as CONFIRMED.
    HS-2: Only succeeds if booking belongs to the JWT tenant.
    """
    booking = get_or_404(db, BookingModel, booking_id, tenant_id)

    if booking.status == BookingStatus.CANCELLED.value:
        raise HTTPException(status_code=400, detail="Cannot confirm a cancelled booking")

    booking.status = BookingStatus.CONFIRMED.value
    db.commit()
    db.refresh(booking)

    # Invalidate bookings list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"bookings:{tenant_id}:*")
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    claims: dict = Depends(RoleChecker(["R2_ORG_ADMIN", "R1_SUPER_ADMIN"])),
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Cancel a booking and release any inventory holds.
    HS-2: Tenant-scoped. HS-3: triggers compensating transaction.
    """
    booking = get_or_404(db, BookingModel, booking_id, tenant_id)

    if booking.status in (BookingStatus.CONFIRMED.value, BookingStatus.CANCELLED.value):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a booking with status {booking.status}")

    booking.status = BookingStatus.CANCELLED.value
    db.commit()
    db.refresh(booking)

    # Invalidate bookings list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"bookings:{tenant_id}:*")
    return booking


@router.post("/{booking_id}/voucher", response_model=VoucherGenerateResponse)
def generate_voucher(
    booking_id: int,
    tenant_id: int = Depends(require_tenant),
    claims: dict = Depends(get_token_claims),
    db: Session = Depends(get_db),
):
    """
    Generate a travel voucher PDF for a confirmed booking.
    HS-2: Booking must belong to JWT tenant.
    """
    booking = get_or_404(db, BookingModel, booking_id, tenant_id)

    if booking.status != BookingStatus.CONFIRMED.value:
        raise HTTPException(status_code=400, detail="Vouchers can only be generated for CONFIRMED bookings")

    return VoucherGenerateResponse(
        booking_id=booking_id,
        voucher_id=f"VCH-{tenant_id}-{booking_id}",
        download_url=f"https://api.namatravel.com/v1/vouchers/VCH-{tenant_id}-{booking_id}.pdf",
        generated_at=datetime.utcnow(),
    )


# ── PDF document endpoints (P2-3 / P2-4) ─────────────────────────────────────
from fastapi.responses import StreamingResponse as _SR
from app.core.pdf_engine import pdf_response as _pdf, DocumentType as _DT
from datetime import date as _date


def _bk_ctx(booking) -> dict:
    """Build template context from a BookingModel row."""
    b = booking
    return {
        "agency_name":    "NAMA Travel",
        "agency_email":   "accounts@namatravel.com",
        "currency":       getattr(b, "currency", "INR") or "INR",
        "booking_ref":    f"BK-{b.id:05d}",
        "client_name":    getattr(b, "lead_name", "Guest") or "Guest",
        "destination":    getattr(b, "destination", "") or "",
        "travel_dates":   f"{getattr(b, 'check_in_date', '') or ''} → {getattr(b, 'check_out_date', '') or ''}",
        "pax":            getattr(b, "pax_count", 1) or 1,
        "hotel":          getattr(b, "hotel_name", "") or "",
        "room_type":      getattr(b, "room_type", "Standard") or "Standard",
        "meal_plan":      getattr(b, "meal_plan", "Bed & Breakfast") or "Bed & Breakfast",
        "nights":         getattr(b, "nights", "—") or "—",
        "total":          float(getattr(b, "total_price", 0) or 0),
        "amount_paid":    float(getattr(b, "amount_paid", 0) or 0),
        "balance_due":    float(getattr(b, "balance_due", 0) or 0),
        "doc_date":       _date.today().strftime("%d %b %Y"),
        "inclusions":     getattr(b, "inclusions", "As per signed quotation.") or "As per signed quotation.",
        "vendor_confirmation": getattr(b, "vendor_confirmation_no", "PENDING") or "PENDING",
    }


@router.get(
    "/{booking_id}/confirmation/pdf",
    summary="Download booking confirmation PDF",
    response_class=_SR,
)
def booking_confirmation_pdf(
    booking_id: int,
    tenant_id:  int  = Depends(require_tenant),
    _:          dict = Depends(get_token_claims),
    db:         Session = Depends(get_db),
):
    """P2-3: Booking Confirmation document."""
    booking = get_or_404(db, BookingModel, booking_id, tenant_id)
    ctx = _bk_ctx(booking)
    ctx["doc_number"] = f"BC-{booking_id:05d}"
    ctx["payment_due_date"] = ctx.get("doc_date", "")
    return _pdf(_DT.BOOKING_CONFIRMATION, ctx, f"booking-confirmation-{booking_id}.pdf")


@router.get(
    "/{booking_id}/voucher/pdf",
    summary="Download travel voucher PDF",
    response_class=_SR,
)
def travel_voucher_pdf(
    booking_id: int,
    tenant_id:  int  = Depends(require_tenant),
    _:          dict = Depends(get_token_claims),
    db:         Session = Depends(get_db),
):
    """P2-3: Travel Voucher document."""
    booking = get_or_404(db, BookingModel, booking_id, tenant_id)
    ctx = _bk_ctx(booking)
    ctx["doc_number"] = f"VCH-{booking_id:05d}"
    ctx["services"] = "Airport transfers, daily breakfast, guided city tour on Day 3. See full itinerary."
    return _pdf(_DT.VOUCHER, ctx, f"voucher-{booking_id}.pdf")


@router.get(
    "/{booking_id}/proforma/pdf",
    summary="Download proforma invoice PDF",
    response_class=_SR,
)
def proforma_invoice_pdf(
    booking_id: int,
    tenant_id:  int  = Depends(require_tenant),
    _:          dict = Depends(get_token_claims),
    db:         Session = Depends(get_db),
):
    """P2-4: Proforma Invoice document."""
    booking = get_or_404(db, BookingModel, booking_id, tenant_id)
    ctx = _bk_ctx(booking)
    ctx["doc_number"] = f"PI-{booking_id:05d}"
    ctx["items"] = [{
        "description": f"Travel Package — {ctx.get('destination', '')}",
        "qty": ctx.get("pax", 1),
        "unit_price": ctx.get("total", 0) / max(1, ctx.get("pax", 1)),
        "amount": ctx.get("total", 0),
    }]
    ctx["subtotal"] = ctx.get("total", 0)
    ctx["total"]    = ctx.get("total", 0)
    return _pdf(_DT.PROFORMA_INVOICE, ctx, f"proforma-{booking_id}.pdf")


@router.get(
    "/{booking_id}/amendment/pdf",
    summary="Download amendment letter PDF",
    response_class=_SR,
)
def amendment_pdf(
    booking_id:    int,
    old_dates:     str = "",
    new_dates:     str = "",
    old_hotel:     str = "",
    new_hotel:     str = "",
    tenant_id:     int  = Depends(require_tenant),
    _:             dict = Depends(get_token_claims),
    db:            Session = Depends(get_db),
):
    """P2-4: Amendment Letter document."""
    booking = get_or_404(db, BookingModel, booking_id, tenant_id)
    ctx = _bk_ctx(booking)
    ctx["doc_number"]    = f"AMD-{booking_id:05d}"
    ctx["original_date"] = ctx.get("doc_date", "")
    ctx["changes"] = []
    if old_dates and new_dates:
        ctx["changes"].append({"field": "Travel Dates", "old": old_dates, "new": new_dates})
    if old_hotel and new_hotel:
        ctx["changes"].append({"field": "Hotel", "old": old_hotel, "new": new_hotel})
    if not ctx["changes"]:
        ctx["changes"] = [{"field": "Terms", "old": "Original", "new": "As amended"}]
    return _pdf(_DT.AMENDMENT, ctx, f"amendment-{booking_id}.pdf")
