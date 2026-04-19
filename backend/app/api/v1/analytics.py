import json
from datetime import date, datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import DashboardSummary, Anomaly, BusinessForecast
from app.agents.analytics import AnalyticsAgent
from app.api.v1.deps import get_current_user, require_tenant, RoleChecker
from app.models.auth import UserRole, User
from app.core.redis_cache import distributed_cache
from typing import List, Dict, Any, Optional

router = APIRouter()
analytics_agent = AnalyticsAgent()


def _cache_set(key: str, value, ttl_seconds: int):
    """Serialise Pydantic models/lists to JSON-safe dict before caching."""
    try:
        if hasattr(value, "model_dump"):
            serialised = value.model_dump()
        elif isinstance(value, list):
            serialised = [v.model_dump() if hasattr(v, "model_dump") else v for v in value]
        else:
            serialised = value
        distributed_cache.set(key, serialised, ttl_seconds=ttl_seconds)
    except Exception:
        pass  # cache write failure is non-fatal


def _cache_get(key: str):
    """Return cached value, or None if missing/unparseable."""
    return distributed_cache.get(key)


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the real-time KPI dashboard summary for the tenant organization (M9).
    """
    try:
        cache_key = f"dashboard:{current_user.tenant_id}"
        cached = _cache_get(cache_key)
        if cached is not None and isinstance(cached, dict):
            return DashboardSummary(**cached)

        summary = analytics_agent.generate_dashboard_summary(db, current_user.tenant_id)
        _cache_set(cache_key, summary, ttl_seconds=30)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/anomalies", response_model=List[Anomaly])
async def get_business_anomalies(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Identify and flag business anomalies from real database data (M9).
    """
    try:
        cache_key = f"anomalies:{current_user.tenant_id}"
        cached = _cache_get(cache_key)
        if cached is not None and isinstance(cached, list):
            return [Anomaly(**a) if isinstance(a, dict) else a for a in cached]

        anomalies = analytics_agent.detect_anomalies(db, current_user.tenant_id)
        _cache_set(cache_key, anomalies, ttl_seconds=60)
        return anomalies
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast", response_model=BusinessForecast)
async def get_performance_forecast(
    claims = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R5_FINANCE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Generate business growth and revenue forecasts from real data (M9).
    """
    try:
        tenant_id = int(claims.get("tenant_id", 0))
        cache_key = f"forecast:{tenant_id}"
        cached = _cache_get(cache_key)
        if cached is not None and isinstance(cached, dict):
            return BusinessForecast(**cached)

        forecast = analytics_agent.generate_forecast(db, tenant_id)
        _cache_set(cache_key, forecast, ttl_seconds=300)
        return forecast
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Overview endpoint (unified KPI summary) ───────────────────────────────────

@router.get(
    "/overview",
    response_model=Dict[str, Any],
    summary="Unified KPI overview — leads, bookings, revenue funnel",
)
async def analytics_overview(
    from_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), defaults to 30 days ago"),
    to_date:   Optional[date] = Query(None, description="End date (YYYY-MM-DD), defaults to today"),
    tenant_id: int            = Depends(require_tenant),
    db:        Session        = Depends(get_db),
):
    """
    Returns a flat dict of unified KPIs suitable for a dashboard top-bar.
    Aggregates lead counts by status, quotation counts by status, accepted
    revenue total, and conversion rates.
    """
    try:
        today = date.today()
        end   = to_date   or today
        start = from_date or (today - timedelta(days=30))

        cache_key = f"overview:{tenant_id}:{start}:{end}"
        cached = _cache_get(cache_key)
        if cached is not None and isinstance(cached, dict):
            return cached

        # Import lazily to avoid circular imports
        from app.models.leads      import Lead, LeadStatus
        from app.api.v1.quotations import Quotation, QuotationStatus

        def _count(model, status_col, status_val):
            return (
                db.query(func.count(model.id))
                  .filter(model.tenant_id == tenant_id)
                  .filter(status_col == status_val)
                  .scalar() or 0
            )

        # Lead funnel
        lead_total     = db.query(func.count(Lead.id)).filter(Lead.tenant_id == tenant_id).scalar() or 0
        lead_new       = _count(Lead, Lead.status, LeadStatus.NEW)
        lead_contacted = _count(Lead, Lead.status, LeadStatus.CONTACTED)
        lead_qualified = _count(Lead, Lead.status, LeadStatus.QUALIFIED)
        lead_won       = _count(Lead, Lead.status, LeadStatus.WON)
        lead_lost      = _count(Lead, Lead.status, LeadStatus.LOST)

        # Quotation funnel
        q_total    = (db.query(func.count(Quotation.id))
                        .filter(Quotation.tenant_id == tenant_id,
                                Quotation.is_deleted.is_(False))
                        .scalar() or 0)
        q_draft    = _count(Quotation, Quotation.status, QuotationStatus.DRAFT)
        q_sent     = _count(Quotation, Quotation.status, QuotationStatus.SENT)
        q_accepted = _count(Quotation, Quotation.status, QuotationStatus.ACCEPTED)
        q_rejected = _count(Quotation, Quotation.status, QuotationStatus.REJECTED)
        q_expired  = _count(Quotation, Quotation.status, QuotationStatus.EXPIRED)

        # Revenue from accepted quotations
        rev = (
            db.query(func.sum(Quotation.total_price))
              .filter(Quotation.tenant_id == tenant_id,
                      Quotation.status    == QuotationStatus.ACCEPTED,
                      Quotation.is_deleted.is_(False))
              .scalar()
        )
        total_revenue = float(rev) if rev else 0.0

        conversion_rate = round(lead_won / lead_total * 100, 1) if lead_total > 0 else 0.0
        quote_win_rate  = round(q_accepted / q_total * 100, 1)  if q_total   > 0 else 0.0

        result = {
            "period":     {"from": str(start), "to": str(end)},
            "leads":      {"total": lead_total, "new": lead_new, "contacted": lead_contacted,
                           "qualified": lead_qualified, "won": lead_won, "lost": lead_lost},
            "quotations": {"total": q_total, "draft": q_draft, "sent": q_sent,
                           "accepted": q_accepted, "rejected": q_rejected, "expired": q_expired},
            "revenue":    {"total_accepted_inr": total_revenue, "currency": "INR"},
            "kpis":       {"lead_conversion_rate_pct": conversion_rate,
                           "quote_win_rate_pct": quote_win_rate},
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        _cache_set(cache_key, result, ttl_seconds=30)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Smart Pricing Benchmarks ──────────────────────────────────────────────────

FALLBACK_BENCHMARKS = {
    "maldives":    {"avg_price_per_person": 175000, "avg_margin_pct": 14.0},
    "bali":        {"avg_price_per_person": 65000,  "avg_margin_pct": 12.0},
    "europe":      {"avg_price_per_person": 220000, "avg_margin_pct": 11.5},
    "dubai":       {"avg_price_per_person": 85000,  "avg_margin_pct": 13.0},
    "singapore":   {"avg_price_per_person": 95000,  "avg_margin_pct": 12.5},
    "thailand":    {"avg_price_per_person": 55000,  "avg_margin_pct": 13.5},
    "kashmir":     {"avg_price_per_person": 35000,  "avg_margin_pct": 15.0},
    "rajasthan":   {"avg_price_per_person": 40000,  "avg_margin_pct": 14.5},
    "kerala":      {"avg_price_per_person": 30000,  "avg_margin_pct": 14.0},
    "switzerland": {"avg_price_per_person": 280000, "avg_margin_pct": 11.0},
    "japan":       {"avg_price_per_person": 200000, "avg_margin_pct": 12.0},
}


@router.get("/pricing-benchmarks")
def get_pricing_benchmarks(
    destination: Optional[str] = Query(None),
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Return pricing benchmarks for destinations, using real DB data (3+ itineraries)
    or FALLBACK_BENCHMARKS when live data is sparse.
    """
    try:
        from app.models.itineraries import Itinerary

        q = db.query(Itinerary).filter(
            Itinerary.tenant_id == tenant_id,
            Itinerary.total_price > 0,
            Itinerary.traveler_count > 0,
        )
        if destination:
            q = q.filter(Itinerary.destination.ilike(f"%{destination}%"))

        rows = q.all()

        # Group by destination using Python
        groups: Dict[str, list] = {}
        for row in rows:
            dest_key = (row.destination or "General").strip()
            groups.setdefault(dest_key, []).append(row)

        results = []

        if destination:
            # Requested a specific destination
            dest_rows = groups.get(list(groups.keys())[0] if groups else "", []) if groups else []
            # Find the matching group key case-insensitively
            matched_key = None
            for k in groups:
                if destination.lower() in k.lower() or k.lower() in destination.lower():
                    matched_key = k
                    break
            dest_rows = groups.get(matched_key, []) if matched_key else []

            if len(dest_rows) >= 3:
                prices_per_person = [r.total_price / max(r.traveler_count, 1) for r in dest_rows]
                margins = [r.margin_pct for r in dest_rows]
                results.append({
                    "destination": matched_key or destination,
                    "avg_price_per_person": round(sum(prices_per_person) / len(prices_per_person), 0),
                    "avg_margin_pct": round(sum(margins) / len(margins), 1),
                    "count": len(dest_rows),
                    "min_price": round(min(prices_per_person), 0),
                    "max_price": round(max(prices_per_person), 0),
                    "data_source": "live",
                })
            else:
                # Look for a fallback match
                fb_key = next(
                    (k for k in FALLBACK_BENCHMARKS if k in destination.lower() or destination.lower() in k),
                    None,
                )
                if fb_key:
                    fb = FALLBACK_BENCHMARKS[fb_key]
                    results.append({
                        "destination": destination,
                        "avg_price_per_person": fb["avg_price_per_person"],
                        "avg_margin_pct": fb["avg_margin_pct"],
                        "count": len(dest_rows),
                        "min_price": None,
                        "max_price": None,
                        "data_source": "benchmark",
                    })
        else:
            # Return all destinations — live first, then top fallbacks
            for dest_name, dest_rows in groups.items():
                if len(dest_rows) >= 3:
                    prices_per_person = [r.total_price / max(r.traveler_count, 1) for r in dest_rows]
                    margins = [r.margin_pct for r in dest_rows]
                    results.append({
                        "destination": dest_name,
                        "avg_price_per_person": round(sum(prices_per_person) / len(prices_per_person), 0),
                        "avg_margin_pct": round(sum(margins) / len(margins), 1),
                        "count": len(dest_rows),
                        "min_price": round(min(prices_per_person), 0),
                        "max_price": round(max(prices_per_person), 0),
                        "data_source": "live",
                    })

            # Pad with fallback benchmarks for destinations not yet in live data
            covered = {r["destination"].lower() for r in results}
            for fb_key, fb in FALLBACK_BENCHMARKS.items():
                already_covered = any(fb_key in c or c in fb_key for c in covered)
                if not already_covered:
                    results.append({
                        "destination": fb_key.title(),
                        "avg_price_per_person": fb["avg_price_per_person"],
                        "avg_margin_pct": fb["avg_margin_pct"],
                        "count": 0,
                        "min_price": None,
                        "max_price": None,
                        "data_source": "benchmark",
                    })

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Team Performance ──────────────────────────────────────────────────────────

class AgentPerformance(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    leads_assigned: int
    leads_qualified: int
    quotations_sent: int
    bookings_closed: int
    total_revenue: float
    conversion_rate: float
    currency: str = "INR"


@router.get("/team-performance", response_model=List[AgentPerformance])
def get_team_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Per-agent KPI report: leads, conversions, quotations, bookings, revenue.
    """
    try:
        from app.models.leads import Lead, LeadStatus
        from app.api.v1.quotations import Quotation, QuotationStatus
        from app.models.bookings import Booking
        from app.schemas.bookings import BookingStatus

        tenant_id = current_user.tenant_id
        users = db.query(User).filter(User.tenant_id == tenant_id, User.is_active == True).all()

        results = []
        for user in users:
            uid = user.id

            leads_assigned = (
                db.query(func.count(Lead.id))
                  .filter(Lead.tenant_id == tenant_id, Lead.assigned_user_id == uid)
                  .scalar() or 0
            )

            leads_qualified = (
                db.query(func.count(Lead.id))
                  .filter(
                      Lead.tenant_id == tenant_id,
                      Lead.assigned_user_id == uid,
                      Lead.status.in_([LeadStatus.QUALIFIED, LeadStatus.WON]),
                  )
                  .scalar() or 0
            )

            # Quotations sent: join via lead's assigned_user_id
            quotations_sent = (
                db.query(func.count(Quotation.id))
                  .join(Lead, Lead.id == Quotation.lead_id)
                  .filter(
                      Quotation.tenant_id == tenant_id,
                      Quotation.is_deleted == False,
                      Lead.assigned_user_id == uid,
                      Quotation.status != QuotationStatus.DRAFT,
                  )
                  .scalar() or 0
            )

            # Bookings closed: join via lead's assigned_user_id
            bookings_closed = (
                db.query(func.count(Booking.id))
                  .join(Lead, Lead.id == Booking.lead_id)
                  .filter(
                      Booking.tenant_id == tenant_id,
                      Lead.assigned_user_id == uid,
                      Booking.status == BookingStatus.CONFIRMED,
                  )
                  .scalar() or 0
            )

            total_revenue_raw = (
                db.query(func.sum(Booking.total_price))
                  .join(Lead, Lead.id == Booking.lead_id)
                  .filter(
                      Booking.tenant_id == tenant_id,
                      Lead.assigned_user_id == uid,
                      Booking.status == BookingStatus.CONFIRMED,
                  )
                  .scalar()
            )
            total_revenue = float(total_revenue_raw) if total_revenue_raw else 0.0

            conversion_rate = round(leads_qualified / max(leads_assigned, 1) * 100, 1)

            results.append(AgentPerformance(
                user_id=uid,
                name=user.full_name or user.email,
                email=user.email,
                role=user.role.value if user.role else "",
                leads_assigned=leads_assigned,
                leads_qualified=leads_qualified,
                quotations_sent=quotations_sent,
                bookings_closed=bookings_closed,
                total_revenue=total_revenue,
                conversion_rate=conversion_rate,
            ))

        results.sort(key=lambda x: x.total_revenue, reverse=True)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
