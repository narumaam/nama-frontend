"""
Pydantic schemas for Lead (M2 CRM) API layer.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class LeadStatus(str, Enum):
    NEW           = "NEW"
    CONTACTED     = "CONTACTED"
    QUALIFIED     = "QUALIFIED"
    PROPOSAL_SENT = "PROPOSAL_SENT"
    NEGOTIATING   = "NEGOTIATING"
    WON           = "WON"
    LOST          = "LOST"
    UNRESPONSIVE  = "UNRESPONSIVE"


class LeadSource(str, Enum):
    WHATSAPP = "WHATSAPP"
    EMAIL    = "EMAIL"
    DIRECT   = "DIRECT"
    REFERRAL = "REFERRAL"
    PORTAL   = "PORTAL"
    WALK_IN  = "WALK_IN"


# ── Request schemas ────────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    """Used internally when triage agent creates a lead from a raw query."""
    sender_id:         str
    source:            LeadSource      = LeadSource.WHATSAPP
    full_name:         Optional[str]   = None
    email:             Optional[str]   = None
    phone:             Optional[str]   = None
    raw_message:       Optional[str]   = None
    destination:       Optional[str]   = None
    duration_days:     Optional[int]   = None
    travelers_count:   int             = 1
    travel_dates:      Optional[str]   = None
    budget_per_person: Optional[float] = None
    currency:          str             = "INR"
    travel_style:      str             = "Standard"
    preferences:       List[str]       = []
    triage_confidence: float           = 0.0
    triage_result:     Optional[Dict[str, Any]] = None
    suggested_reply:   Optional[str]   = None


class LeadUpdate(BaseModel):
    """Partial update — all fields optional."""
    full_name:         Optional[str]   = None
    email:             Optional[str]   = None
    phone:             Optional[str]   = None
    status:            Optional[LeadStatus] = None
    priority:          Optional[int]   = None
    notes:             Optional[str]   = None
    assigned_user_id:  Optional[int]   = None
    destination:       Optional[str]   = None
    duration_days:     Optional[int]   = None
    travelers_count:   Optional[int]   = None
    travel_dates:      Optional[str]   = None
    budget_per_person: Optional[float] = None
    travel_style:      Optional[str]   = None
    preferences:       Optional[List[str]] = None


# ── Response schemas ───────────────────────────────────────────────────────────

class LeadOut(BaseModel):
    id:                int
    tenant_id:         int
    sender_id:         str
    source:            LeadSource
    full_name:         Optional[str]   = None
    email:             Optional[str]   = None
    phone:             Optional[str]   = None
    destination:       Optional[str]   = None
    duration_days:     Optional[int]   = None
    travelers_count:   int
    travel_dates:      Optional[str]   = None
    budget_per_person: Optional[float] = None
    currency:          str
    travel_style:      str
    preferences:       List[str]
    triage_confidence: float
    suggested_reply:   Optional[str]   = None
    status:            LeadStatus
    priority:          int
    notes:             Optional[str]   = None
    assigned_user_id:  Optional[int]   = None
    created_at:        datetime
    updated_at:        Optional[datetime] = None
    contacted_at:      Optional[datetime] = None
    won_at:            Optional[datetime] = None
    lost_at:           Optional[datetime] = None

    model_config = {"from_attributes": True}


class LeadListOut(BaseModel):
    items:  List[LeadOut]
    total:  int
    page:   int
    size:   int
