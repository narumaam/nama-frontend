from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.analytics import DashboardSummary, Anomaly, BusinessForecast
from app.agents.analytics import AnalyticsAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import List, Dict, Any

router = APIRouter()
analytics_agent = AnalyticsAgent()

@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the real-time KPI dashboard summary for the tenant organization (M9).
    """
    try:
        # Step 1: AI-powered KPI synthesis
        summary = await analytics_agent.generate_dashboard_summary(current_user.tenant_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/anomalies", response_model=List[Anomaly])
async def get_business_anomalies(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Identify and flag business anomalies using AI-driven logic (M9).
    """
    try:
        # Step 1: AI-driven Anomaly Detection
        anomalies = await analytics_agent.detect_anomalies(current_user.tenant_id)
        return anomalies
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast", response_model=BusinessForecast)
async def get_performance_forecast(
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R5_FINANCE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Generate business growth and revenue forecasts (M9).
    """
    try:
        # Step 1: AI-driven Forecasting
        forecast = await analytics_agent.generate_forecast(current_user.tenant_id)
        return forecast
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
