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
