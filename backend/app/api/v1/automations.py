"""
NAMA Automations — Workflow engine CRUD (P3-7)
Triggers: new_lead, lead_status_changed, booking_confirmed, payment_received, etc.
Actions: send_whatsapp, send_email, create_task, assign_agent, update_lead_status, etc.
"""
import logging
from datetime import datetime
from typing import List, Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Session

from app.db.session import get_db, Base
from app.api.v1.deps import require_tenant, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ── SQLAlchemy Models ─────────────────────────────────────────────────────────
class Automation(Base):
    __tablename__ = "automations"

    id            = Column(Integer, primary_key=True, index=True)
    tenant_id     = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name          = Column(String(200), nullable=False)
    description   = Column(Text, nullable=True)
    trigger       = Column(String(100), nullable=False)
    conditions    = Column(JSON, default=[])
    actions       = Column(JSON, default=[])
    is_active     = Column(Boolean, default=True, nullable=False)
    run_count     = Column(Integer, default=0, nullable=False)
    success_count = Column(Integer, default=0, nullable=False)
    last_run_at   = Column(DateTime, nullable=True)
    created_by    = Column(Integer, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AutomationRun(Base):
    __tablename__ = "automation_runs"

    id            = Column(Integer, primary_key=True, index=True)
    automation_id = Column(Integer, ForeignKey("automations.id"), nullable=False, index=True)
    tenant_id     = Column(Integer, nullable=False, index=True)
    trigger_event = Column(String(100), nullable=False)
    trigger_data  = Column(JSON, default={})
    status        = Column(String(20), default="pending", nullable=False)  # pending|running|success|failed
    result        = Column(JSON, default={})
    error_message = Column(Text, nullable=True)
    started_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at  = Column(DateTime, nullable=True)


# ── Constants ─────────────────────────────────────────────────────────────────
VALID_TRIGGERS = [
    "new_lead",
    "lead_status_changed",
    "lead_assigned",
    "booking_confirmed",
    "booking_cancelled",
    "payment_received",
    "itinerary_generated",
    "query_received",
    "no_response_3d",
    "quotation_sent",
    "quotation_accepted",
    "quotation_rejected",
]

VALID_ACTIONS = [
    "send_whatsapp",
    "send_email",
    "create_task",
    "assign_agent",
    "update_lead_status",
    "generate_itinerary",
    "send_quotation",
    "add_to_segment",
    "notify_team",
]


# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class AutomationCondition(BaseModel):
    field: str
    operator: str   # eq | neq | gt | lt | contains | not_contains
    value: Any


class AutomationAction(BaseModel):
    type: str
    config: Dict[str, Any] = {}


class AutomationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger: str
    conditions: List[AutomationCondition] = []
    actions: List[AutomationAction] = []
    is_active: bool = True


class AutomationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[str] = None
    conditions: Optional[List[AutomationCondition]] = None
    actions: Optional[List[AutomationAction]] = None
    is_active: Optional[bool] = None


class AutomationOut(BaseModel):
    id: int
    tenant_id: int
    name: str
    description: Optional[str]
    trigger: str
    conditions: List[Dict[str, Any]]
    actions: List[Dict[str, Any]]
    is_active: bool
    run_count: int
    success_count: int
    last_run_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AutomationRunOut(BaseModel):
    id: int
    automation_id: int
    trigger_event: str
    status: str
    result: Dict[str, Any]
    error_message: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[AutomationOut], summary="List automations for tenant")
def list_automations(
    is_active: Optional[bool] = None,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    q = db.query(Automation).filter(Automation.tenant_id == tenant_id)
    if is_active is not None:
        q = q.filter(Automation.is_active == is_active)
    return q.order_by(Automation.created_at.desc()).all()


@router.post("/", response_model=AutomationOut, status_code=status.HTTP_201_CREATED)
def create_automation(
    payload: AutomationCreate,
    tenant_id: int = Depends(require_tenant),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.trigger not in VALID_TRIGGERS:
        raise HTTPException(400, f"Invalid trigger '{payload.trigger}'. Valid: {VALID_TRIGGERS}")
    for action in payload.actions:
        if action.type not in VALID_ACTIONS:
            raise HTTPException(400, f"Invalid action type '{action.type}'. Valid: {VALID_ACTIONS}")

    auto = Automation(
        tenant_id=tenant_id,
        name=payload.name,
        description=payload.description,
        trigger=payload.trigger,
        conditions=[c.dict() for c in payload.conditions],
        actions=[a.dict() for a in payload.actions],
        is_active=payload.is_active,
        created_by=getattr(current_user, "id", None),
    )
    db.add(auto)
    db.commit()
    db.refresh(auto)
    logger.info(f"Automation created: tenant={tenant_id} id={auto.id} trigger={auto.trigger}")
    return auto


@router.get("/triggers", summary="List valid triggers and actions")
def list_triggers():
    return {"triggers": VALID_TRIGGERS, "actions": VALID_ACTIONS}


@router.get("/{automation_id}", response_model=AutomationOut)
def get_automation(
    automation_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    auto = db.query(Automation).filter(
        Automation.id == automation_id,
        Automation.tenant_id == tenant_id,
    ).first()
    if not auto:
        raise HTTPException(404, "Automation not found")
    return auto


@router.patch("/{automation_id}", response_model=AutomationOut)
def update_automation(
    automation_id: int,
    payload: AutomationUpdate,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    auto = db.query(Automation).filter(
        Automation.id == automation_id,
        Automation.tenant_id == tenant_id,
    ).first()
    if not auto:
        raise HTTPException(404, "Automation not found")

    update_data = payload.dict(exclude_none=True)
    if "conditions" in update_data and update_data["conditions"] is not None:
        update_data["conditions"] = [
            c.dict() if hasattr(c, "dict") else c for c in update_data["conditions"]
        ]
    if "actions" in update_data and update_data["actions"] is not None:
        update_data["actions"] = [
            a.dict() if hasattr(a, "dict") else a for a in update_data["actions"]
        ]

    for field, value in update_data.items():
        setattr(auto, field, value)

    auto.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(auto)
    return auto


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_automation(
    automation_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    auto = db.query(Automation).filter(
        Automation.id == automation_id,
        Automation.tenant_id == tenant_id,
    ).first()
    if not auto:
        raise HTTPException(404, "Automation not found")
    db.delete(auto)
    db.commit()


@router.post("/{automation_id}/toggle", response_model=AutomationOut, summary="Toggle active state")
def toggle_automation(
    automation_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    auto = db.query(Automation).filter(
        Automation.id == automation_id,
        Automation.tenant_id == tenant_id,
    ).first()
    if not auto:
        raise HTTPException(404, "Automation not found")
    auto.is_active = not auto.is_active
    db.commit()
    db.refresh(auto)
    return auto


@router.get("/{automation_id}/runs", response_model=List[AutomationRunOut], summary="List run history")
def list_runs(
    automation_id: int,
    limit: int = 20,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    # Verify ownership first
    auto = db.query(Automation).filter(
        Automation.id == automation_id,
        Automation.tenant_id == tenant_id,
    ).first()
    if not auto:
        raise HTTPException(404, "Automation not found")

    runs = (
        db.query(AutomationRun)
        .filter(AutomationRun.automation_id == automation_id)
        .order_by(AutomationRun.started_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    return runs
