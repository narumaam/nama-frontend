"""
NAMA Automations — Workflow engine CRUD (P3-7)
Triggers: new_lead, lead_status_changed, booking_confirmed, payment_received, etc.
Actions: send_whatsapp, send_email, create_task, assign_agent, update_lead_status, etc.
"""
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Session

from app.db.session import get_db, Base
from app.api.v1.deps import require_tenant, get_current_user
from app.models.leads import Lead, LeadStatus
from app.models.auth import User, UserRole

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


# ── Reminder helpers ───────────────────────────────────────────────────────────

def _get_resend_client():
    """Return the resend module with api_key set, or None if not configured."""
    key = os.getenv("RESEND_API_KEY", "")
    if key:
        try:
            import resend  # type: ignore
            resend.api_key = key
            return resend
        except ImportError:
            logger.warning("resend package not installed — email sending unavailable")
    return None


def _days_ago(dt: Optional[datetime]) -> float:
    """Return how many days ago a datetime was (handles None → 999)."""
    if dt is None:
        return 999.0
    # Ensure both sides are timezone-aware for comparison
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (now - dt).total_seconds() / 86400.0


# ── run-reminders endpoint ─────────────────────────────────────────────────────

class ReminderResult(BaseModel):
    reminders_sent: int
    leads_flagged: int
    agents_notified: int
    demo_mode: bool = False


@router.post("/run-reminders", response_model=ReminderResult, summary="Run cold-lead follow-up reminders")
def run_reminders(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> ReminderResult:
    """
    Scans all tenant leads for:
      - CONTACTED leads not updated for 3+ days
      - NEW leads not updated for 1+ day
      - QUALIFIED leads not updated for 7+ days
    Groups by assigned agent and sends one digest email per agent via Resend.
    Unassigned leads are reassigned to the first R3_SALES_MANAGER found.
    """
    now = datetime.now(timezone.utc)

    # Fetch flagged leads
    cold_contacted = db.query(Lead).filter(
        Lead.tenant_id == tenant_id,
        Lead.status == LeadStatus.CONTACTED,
        Lead.updated_at < now - timedelta(days=3),
    ).all()

    stale_new = db.query(Lead).filter(
        Lead.tenant_id == tenant_id,
        Lead.status == LeadStatus.NEW,
        Lead.created_at < now - timedelta(days=1),
    ).all()

    abandoned_qualified = db.query(Lead).filter(
        Lead.tenant_id == tenant_id,
        Lead.status == LeadStatus.QUALIFIED,
        Lead.updated_at < now - timedelta(days=7),
    ).all()

    all_flagged: List[Lead] = list({l.id: l for l in cold_contacted + stale_new + abandoned_qualified}.values())

    if not all_flagged:
        return ReminderResult(reminders_sent=0, leads_flagged=0, agents_notified=0, demo_mode=False)

    # Find fallback sales manager for unassigned leads
    fallback_manager: Optional[User] = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role == UserRole.R3_SALES_MANAGER,
        User.is_active == True,
    ).first()

    # Assign unassigned leads to fallback manager
    for lead in all_flagged:
        if lead.assigned_user_id is None and fallback_manager:
            lead.assigned_user_id = fallback_manager.id
    db.commit()

    # Group by assigned_user_id
    by_agent: Dict[int, List[Lead]] = {}
    for lead in all_flagged:
        uid = lead.assigned_user_id
        if uid is None:
            continue
        by_agent.setdefault(uid, []).append(lead)

    resend_client = _get_resend_client()
    demo_mode = resend_client is None
    reminders_sent = 0
    agents_notified = 0

    for user_id, their_leads in by_agent.items():
        agent: Optional[User] = db.query(User).filter(User.id == user_id).first()
        if not agent:
            continue

        # Build lead rows HTML
        rows_html = ""
        for lead in their_leads:
            age = _days_ago(lead.updated_at if lead.updated_at else lead.created_at)
            age_label = f"{int(age)} day{'s' if int(age) != 1 else ''} ago"
            name = lead.full_name or lead.sender_id or f"Lead #{lead.id}"
            destination = lead.destination or "—"
            status_label = lead.status.value if hasattr(lead.status, "value") else str(lead.status)
            rows_html += f"""
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;font-weight:600">{name}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b">{destination}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">
                  <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-weight:700;font-size:11px">{status_label}</span>
                </td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#ef4444;font-weight:600">{age_label}</td>
              </tr>"""

        email_html = f"""
        <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:640px;margin:0 auto">
          <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
            <div style="color:#14B8A6;font-weight:900;font-size:18px;letter-spacing:-0.5px">NAMA OS</div>
            <div style="color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Automated Follow-up Reminder</div>
          </div>
          <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
            <p style="margin:0 0 8px;font-size:15px;font-weight:700">Hi {agent.full_name or agent.email},</p>
            <p style="margin:0 0 20px;font-size:13px;color:#475569">
              You have <strong style="color:#0f172a">{len(their_leads)} lead{'s' if len(their_leads) != 1 else ''}</strong> that need your attention right now.
            </p>
            <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
              <thead>
                <tr style="background:#f1f5f9">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">Lead</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">Destination</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">Status</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">Stale Since</th>
                </tr>
              </thead>
              <tbody>{rows_html}</tbody>
            </table>
            <div style="margin-top:24px;text-align:center">
              <a href="https://getnama.app/dashboard/leads" style="display:inline-block;background:#14B8A6;color:#0f172a;font-weight:900;font-size:13px;padding:12px 28px;border-radius:10px;text-decoration:none">
                View All Leads →
              </a>
            </div>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
              NAMA OS · getnama.app · Sent by Automated Reminder Engine
            </div>
          </div>
        </div>"""

        subject = f"[NAMA OS] {len(their_leads)} lead{'s' if len(their_leads) != 1 else ''} need{'s' if len(their_leads) == 1 else ''} your attention"

        if not demo_mode:
            try:
                resend_client.Emails.send({
                    "from": "NAMA OS <reminders@namaos.com>",
                    "to": [agent.email],
                    "subject": subject,
                    "html": email_html,
                })
                reminders_sent += 1
                logger.info(f"Reminder sent to agent {agent.email} for {len(their_leads)} leads")
            except Exception as exc:
                logger.exception(f"Failed to send reminder to {agent.email}: {exc}")
        else:
            # Simulate — count as sent so UI shows useful data
            reminders_sent += 1
            logger.info(f"[DEMO] Would send reminder to {agent.email} for {len(their_leads)} leads")

        agents_notified += 1

    # ── Drip email schedule check ──────────────────────────────────────────────
    # After processing lead reminders, check if any scheduled drip emails are due.
    try:
        from app.models.auth import Tenant
        from app.api.v1.onboarding import _send_drip_email
        tenant_row = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if tenant_row and tenant_row.settings:
            drip = tenant_row.settings.get("drip_schedule")
            if drip and drip.get("pending_days"):
                started_at = datetime.fromisoformat(drip["started_at"])
                days_elapsed = (now - started_at.replace(tzinfo=timezone.utc)).days
                still_pending = []
                for d in drip["pending_days"]:
                    if days_elapsed >= d:
                        _send_drip_email(
                            drip["email"], drip["name"], drip["agency_name"], d
                        )
                        drip.setdefault("sent_days", []).append(d)
                        logger.info("run_reminders: drip day=%d sent to %s", d, drip["email"])
                    else:
                        still_pending.append(d)
                drip["pending_days"] = still_pending
                settings = dict(tenant_row.settings)
                settings["drip_schedule"] = drip
                tenant_row.settings = settings
                db.commit()
    except Exception as exc:
        logger.warning("run_reminders: drip check failed (non-fatal): %s", exc)

    return ReminderResult(
        reminders_sent=reminders_sent,
        leads_flagged=len(all_flagged),
        agents_notified=agents_notified,
        demo_mode=demo_mode,
    )


# ── schedule-reminders endpoint ────────────────────────────────────────────────

class ScheduleReminderRequest(BaseModel):
    enabled: bool


@router.post("/schedule-reminders", summary="Enable or disable automated daily reminders")
def schedule_reminders(
    body: ScheduleReminderRequest,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """Toggle the `automation_reminders_enabled` flag in the tenant's settings JSON."""
    from app.models.auth import Tenant
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if tenant:
        settings = dict(tenant.settings or {})
        settings["automation_reminders_enabled"] = body.enabled
        tenant.settings = settings
        db.commit()
        logger.info(f"Tenant {tenant_id}: automation_reminders_enabled={body.enabled}")
    return {"enabled": body.enabled}
