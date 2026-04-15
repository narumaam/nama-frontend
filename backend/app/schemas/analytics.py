from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class KPIEntry(BaseModel):
    label: str
    value: float
    trend: float # Percentage change
    status: str # UP, DOWN, NEUTRAL

class DashboardSummary(BaseModel):
    gmv: KPIEntry
    aov: KPIEntry
    conversion_rate: KPIEntry
    total_leads: KPIEntry
    active_itineraries: KPIEntry
    currency: str = "INR"

class Anomaly(BaseModel):
    metric: str
    description: str
    severity: str # LOW, MEDIUM, HIGH
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class BusinessForecast(BaseModel):
    target_month: str
    projected_gmv: float
    confidence_score: float
    recommendation: str
