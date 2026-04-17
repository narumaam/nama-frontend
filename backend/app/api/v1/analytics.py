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


# ── Overview endpoint ─────────────────────────────────────────────────────────
from datetime import date as _date, timedelta as _td
from sqlalchemy import func as _func

@router.get("/overview", response_model=Dict[str, Any])
async def analytics_overview(
    from_date: Optional[date] = Query(None), to_date: Optional[date] = Query(None),
    tenant_id: int = Depends(require_tenant), db: Session = Depends(get_db),
):
    try:
        today = _date.today()
        end = to_date or today; start = from_date or (today - _td(days=30))
        ck = f"overview:{tenant_id}:{start}:{end}"
        cached = _cache_get(ck)
        if cached and isinstance(cached, dict): return cached
        from app.models.leads import Lead, LeadStatus
        from app.api.v1.quotations import Quotation, QuotationStatus
        def _n(m, col, val):
            return db.query(_func.count(m.id)).filter(m.tenant_id==tenant_id, col==val).scalar() or 0
        lt = db.query(_func.count(Lead.id)).filter(Lead.tenant_id==tenant_id).scalar() or 0
        qt = db.query(_func.count(Quotation.id)).filter(Quotation.tenant_id==tenant_id, Quotation.is_deleted.is_(False)).scalar() or 0
        lw = _n(Lead, Lead.status, LeadStatus.WON); qa = _n(Quotation, Quotation.status, QuotationStatus.ACCEPTED)
        rev = db.query(_func.sum(Quotation.total_price)).filter(Quotation.tenant_id==tenant_id, Quotation.status==QuotationStatus.ACCEPTED, Quotation.is_deleted.is_(False)).scalar()
        result = {
            "period": {"from": str(start), "to": str(end)},
            "leads": {"total": lt, "new": _n(Lead, Lead.status, LeadStatus.NEW),
                      "won": lw, "lost": _n(Lead, Lead.status, LeadStatus.LOST)},
            "quotations": {"total": qt, "accepted": qa, "sent": _n(Quotation, Quotation.status, QuotationStatus.SENT)},
            "revenue": {"total_accepted_inr": float(rev) if rev else 0.0},
            "kpis": {"lead_conversion_pct": round(lw/lt*100,1) if lt else 0,
                     "quote_win_pct": round(qa/qt*100,1) if qt else 0},
        }
        _cache_set(ck, result, 30); return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
