from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class QuerySource(str, Enum):
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    DIRECT = "DIRECT"

class RawQuery(BaseModel):
    source: QuerySource
    content: str
    sender_id: str # Phone number or Email address
    tenant_id: int
    metadata: Dict[str, Any] = {}

class ExtractedLeadData(BaseModel):
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    travelers_count: Optional[int] = 1
    travel_dates: Optional[str] = None
    budget_per_person: Optional[float] = None
    currency: str = "INR"
    preferences: List[str] = []
    style: str = "Standard" # Budget, Standard, Luxury
    confidence_score: float = 0.0

class QueryTriageResult(BaseModel):
    is_valid_query: bool
    extracted_data: Optional[ExtractedLeadData] = None
    suggested_reply: Optional[str] = None
    reasoning: str
