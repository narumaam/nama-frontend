from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class POStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"

class CorporatePOBase(BaseModel):
    po_number: str
    client_org_id: int
    budget_threshold: float
    currency: str = "INR"
    description: Optional[str] = None

class CorporatePOCreate(CorporatePOBase):
    tenant_id: int

class CorporatePO(CorporatePOBase):
    id: int
    tenant_id: int
    status: POStatus
    approval_chain: List[Dict[str, Any]] = []
    created_at: datetime
    
    class Config:
        from_attributes = True

class FixedDepartureBase(BaseModel):
    title: str
    departure_date: datetime
    return_date: datetime
    total_seats: int
    available_seats: int
    base_price: float
    currency: str = "INR"

class FixedDepartureCreate(FixedDepartureBase):
    tenant_id: int

class FixedDeparture(FixedDepartureBase):
    id: int
    tenant_id: int
    status: str # ACTIVE, CLOSED, COMPLETED
    created_at: datetime
    
    class Config:
        from_attributes = True

class SeatBookingRequest(BaseModel):
    departure_id: int
    seats_count: int
    lead_id: int
