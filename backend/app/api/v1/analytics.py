import json
from datetime import date, datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import DashboardSummary, Anomaly, BusinessForecast
from app.agents.analytics import AnalyticsAgent
from app.api.v1.deps import get_current_user, require_tenant, RoleChecker
from app.models.auth import UserRole
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
