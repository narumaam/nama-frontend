import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.analytics import DashboardSummary, Anomaly, BusinessForecast
from app.agents.analytics import AnalyticsAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from app.core.redis_cache import distributed_cache
from typing import List, Dict, Any

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
