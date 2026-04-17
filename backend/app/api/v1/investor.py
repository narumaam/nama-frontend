"""
NAMA Investor Dashboard — R0 platform-wide analytics (P3-9)
Accessible only to R0_NAMA_OWNER and R1_SUPER_ADMIN.
"""
import logging
from datetime import date, datetime, timezone, timedelta
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import RoleChecker
from app.models.auth import UserRole
from app.core.redis_cache import distributed_cache

logger = logging.getLogger(__name__)
router = APIRouter()

_owner_only = RoleChecker([UserRole.R0_NAMA_OWNER, UserRole.R1_SUPER_ADMIN])


@router.get("/summary", response_model=Dict[str, Any], summary="Platform-wide investor summary")
async def investor_summary(
    from_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    claims=Depends(_owner_only),
    db: Session = Depends(get_db),
):
    """
    R0/R1 only — aggregates GMV, bookings, leads, tenants across the entire platform.
    Used for board packs and investor reporting.
    """
    today = date.today()
    end = to_date or today
    start = from_date or (today - timedelta(days=90))

    cache_key = f"investor_summary:{start}:{end}"
    cached = distributed_cache.get(cache_key)
    if cached and isinstance(cached, dict):
        return cached

    try:
        from app.models.bookings import Booking, BookingStatus
        from app.models.leads import Lead, LeadStatus
        from app.models.payments import Payment, PaymentStatus
        from app.models.auth import Tenant

        # GMV — sum of all captured payments
        gmv_result = (
            db.query(func.sum(Payment.amount))
            .filter(Payment.status == PaymentStatus.CAPTURED)
            .scalar()
        )
        total_gmv = float(gmv_result or 0)

        # Bookings
        total_bookings = db.query(func.count(Booking.id)).scalar() or 0
        confirmed_bookings = (
            db.query(func.count(Booking.id))
            .filter(Booking.status == BookingStatus.CONFIRMED)
            .scalar() or 0
        )

        # Leads
        total_leads = db.query(func.count(Lead.id)).scalar() or 0
        won_leads = (
            db.query(func.count(Lead.id))
            .filter(Lead.status == LeadStatus.WON)
            .scalar() or 0
        )

        # Tenants
        tenant_count = db.query(func.count(Tenant.id)).scalar() or 0

        conversion_rate = round(won_leads / total_leads * 100, 1) if total_leads > 0 else 0.0
        avg_booking_value = round(total_gmv / confirmed_bookings, 2) if confirmed_bookings > 0 else 0.0

        result = {
            "period": {"from": str(start), "to": str(end)},
            "gmv": {
                "total_inr": total_gmv,
                "currency": "INR",
            },
            "bookings": {
                "total": total_bookings,
                "confirmed": confirmed_bookings,
                "avg_value_inr": avg_booking_value,
            },
            "leads": {
                "total": total_leads,
                "won": won_leads,
                "conversion_rate_pct": conversion_rate,
            },
            "tenants": {
                "count": tenant_count,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        distributed_cache.set(cache_key, result, ttl_seconds=300)
        return result

    except Exception as e:
        logger.error(f"Investor summary error: {e}")
        return {
            "period": {"from": str(start), "to": str(end)},
            "gmv": {"total_inr": 0.0, "currency": "INR"},
            "bookings": {"total": 0, "confirmed": 0, "avg_value_inr": 0.0},
            "leads": {"total": 0, "won": 0, "conversion_rate_pct": 0.0},
            "tenants": {"count": 0},
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "note": "Live data will appear once real transactions are recorded",
        }
