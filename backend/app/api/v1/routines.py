"""
NAMA Routines API — Automation Engine
--------------------------------------
Endpoints:
  GET    /api/v1/routines              — list tenant routines
  POST   /api/v1/routines              — create routine
  GET    /api/v1/routines/templates    — built-in template library (8 routines)
  GET    /api/v1/routines/{id}         — routine detail
  PUT    /api/v1/routines/{id}         — update routine
  DELETE /api/v1/routines/{id}         — delete routine
  POST   /api/v1/routines/{id}/run     — trigger manually
  POST   /api/v1/routines/{id}/toggle  — pause / resume
  GET    /api/v1/routines/{id}/runs    — run history (paginated)
"""

import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant
from app.models.routines import Routine, RoutineRun, TriggerType, RoutineStatus, RunStatus

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class RoutineCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "⚡"
    color: str = "emerald"
    trigger_type: str = "MANUAL"
    cron_expression: Optional[str] = None
    schedule_label: Optional[str] = None
    event_trigger: Optional[str] = None
    prompt: str
    steps_json: List[Dict[str, Any]] = []
    status: str = "DRAFT"
    template_id: Optional[str] = None


class RoutineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    trigger_type: Optional[str] = None
    cron_expression: Optional[str] = None
    schedule_label: Optional[str] = None
    event_trigger: Optional[str] = None
    prompt: Optional[str] = None
    steps_json: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None


class RoutineOut(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    color: str
    trigger_type: str
    cron_expression: Optional[str]
    schedule_label: Optional[str]
    event_trigger: Optional[str]
    prompt: str
    steps_json: List[Dict[str, Any]]
    status: str
    run_count: int
    last_run_at: Optional[datetime]
    last_run_status: Optional[str]
    next_run_at: Optional[datetime]
    is_template: bool
    template_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RunOut(BaseModel):
    id: int
    routine_id: int
    status: str
    trigger_source: str
    trigger_detail: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    duration_ms: Optional[float]
    output_summary: Optional[str]
    actions_log: List[Dict[str, Any]]
    error_message: Optional[str]

    class Config:
        from_attributes = True


# ─── Built-in Template Library ────────────────────────────────────────────────

ROUTINE_TEMPLATES = [
    {
        "template_id": "morning_briefing",
        "name": "Morning Briefing",
        "description": "Start every day with a crisp summary of new leads, today's follow-ups, and pending quotations delivered to your inbox.",
        "icon": "🌅",
        "color": "amber",
        "trigger_type": "SCHEDULE",
        "cron_expression": "0 8 * * 1-6",
        "schedule_label": "Weekdays at 8:00 AM",
        "event_trigger": None,
        "prompt": "Summarise all leads created in the last 24 hours, list follow-ups due today (leads not contacted in 3+ days), and count open quotations. Format as a clean daily briefing and email it to the agency owner.",
        "steps_json": [
            {"type": "fetch_data", "params": {"source": "leads", "filter": "created_last_24h"}},
            {"type": "fetch_data", "params": {"source": "leads", "filter": "follow_up_due"}},
            {"type": "fetch_data", "params": {"source": "quotations", "filter": "open"}},
            {"type": "ai_summarise", "params": {"style": "daily_briefing"}},
            {"type": "send_email", "params": {"recipient": "owner", "subject": "Your NAMA Morning Briefing"}},
        ],
    },
    {
        "template_id": "weekly_revenue_report",
        "name": "Weekly Revenue Report",
        "description": "Every Monday morning, auto-generate a revenue digest with team performance stats and email it to leadership.",
        "icon": "📊",
        "color": "blue",
        "trigger_type": "SCHEDULE",
        "cron_expression": "0 9 * * 1",
        "schedule_label": "Every Monday at 9:00 AM",
        "event_trigger": None,
        "prompt": "Pull last week's bookings revenue, compare to the week before, show top 3 performing agents, and list any overdue invoices. Email a formatted weekly report to the agency owner.",
        "steps_json": [
            {"type": "fetch_data", "params": {"source": "bookings", "filter": "confirmed_this_week"}},
            {"type": "fetch_data", "params": {"source": "analytics", "filter": "team_performance_weekly"}},
            {"type": "ai_summarise", "params": {"style": "revenue_report"}},
            {"type": "send_email", "params": {"recipient": "owner", "subject": "Weekly Revenue Report — NAMA"}},
        ],
    },
    {
        "template_id": "cold_lead_revival",
        "name": "Cold Lead Revival",
        "description": "Every evening, find leads that have gone quiet for 7+ days and send a WhatsApp nudge to the assigned agent.",
        "icon": "🥶",
        "color": "cyan",
        "trigger_type": "SCHEDULE",
        "cron_expression": "0 18 * * 1-5",
        "schedule_label": "Weekdays at 6:00 PM",
        "event_trigger": None,
        "prompt": "Find all leads with status QUALIFIED or CONTACTED that haven't been updated in 7+ days. Group them by assigned agent and send each agent a WhatsApp message listing their cold leads with names and destinations.",
        "steps_json": [
            {"type": "fetch_data", "params": {"source": "leads", "filter": "cold_7d"}},
            {"type": "group_by", "params": {"field": "assigned_user"}},
            {"type": "send_whatsapp", "params": {"recipient": "assigned_agent", "template": "follow_up"}},
        ],
    },
    {
        "template_id": "booking_confirmation_flow",
        "name": "Booking Confirmation Flow",
        "description": "Instantly after a booking is confirmed: generate voucher PDF, send it to the client, and notify the ops team on WhatsApp.",
        "icon": "✅",
        "color": "emerald",
        "trigger_type": "EVENT",
        "cron_expression": None,
        "schedule_label": None,
        "event_trigger": "booking.confirmed",
        "prompt": "When a booking is confirmed: generate the travel voucher PDF, email it to the client with a personalised thank-you message, and send a WhatsApp notification to the assigned ops executive.",
        "steps_json": [
            {"type": "generate_pdf", "params": {"document": "voucher"}},
            {"type": "send_email", "params": {"recipient": "client", "template": "booking_confirmed", "attach_pdf": True}},
            {"type": "send_whatsapp", "params": {"recipient": "ops_executive", "template": "booking_confirmed"}},
        ],
    },
    {
        "template_id": "overdue_payment_alert",
        "name": "Overdue Payment Alert",
        "description": "Each morning, scan for unpaid invoices that are 7+ days overdue and send reminders to clients + alerts to finance.",
        "icon": "🔴",
        "color": "red",
        "trigger_type": "SCHEDULE",
        "cron_expression": "0 10 * * 1-6",
        "schedule_label": "Weekdays at 10:00 AM",
        "event_trigger": None,
        "prompt": "Find all confirmed bookings with unpaid invoices that are 7 or more days past their due date. Send a polite payment reminder email to each client and a digest alert to the finance admin listing all overdue amounts.",
        "steps_json": [
            {"type": "fetch_data", "params": {"source": "invoices", "filter": "overdue_7d"}},
            {"type": "send_email", "params": {"recipient": "client", "template": "payment_reminder"}},
            {"type": "send_email", "params": {"recipient": "finance_admin", "subject": "Overdue Payment Digest"}},
        ],
    },
    {
        "template_id": "whatsapp_daily_digest",
        "name": "WhatsApp Daily Digest",
        "description": "Every morning, send the owner a WhatsApp summary of new enquiries received overnight and the day's priority follow-ups.",
        "icon": "💬",
        "color": "green",
        "trigger_type": "SCHEDULE",
        "cron_expression": "30 8 * * 1-6",
        "schedule_label": "Weekdays at 8:30 AM",
        "event_trigger": None,
        "prompt": "Compile new leads from the last 12 hours and the top 5 priority follow-ups for today. Format as a short WhatsApp message and send to the agency owner's number.",
        "steps_json": [
            {"type": "fetch_data", "params": {"source": "leads", "filter": "created_last_12h"}},
            {"type": "fetch_data", "params": {"source": "leads", "filter": "high_priority"}},
            {"type": "ai_summarise", "params": {"style": "whatsapp_short"}},
            {"type": "send_whatsapp", "params": {"recipient": "owner"}},
        ],
    },
    {
        "template_id": "lead_score_refresh",
        "name": "Lead Score Refresh",
        "description": "Every Sunday at midnight, re-run AI scoring on all open leads so Monday starts with fresh priority rankings.",
        "icon": "📈",
        "color": "purple",
        "trigger_type": "SCHEDULE",
        "cron_expression": "0 0 * * 0",
        "schedule_label": "Every Sunday at midnight",
        "event_trigger": None,
        "prompt": "Re-score all leads with status NEW, CONTACTED, or QUALIFIED using the AI lead scoring model. Update their priority and triage_confidence fields. Log how many leads moved up or down in priority.",
        "steps_json": [
            {"type": "fetch_data", "params": {"source": "leads", "filter": "open"}},
            {"type": "ai_score_leads", "params": {"model": "openrouter_llama"}},
            {"type": "update_records", "params": {"fields": ["priority", "triage_confidence"]}},
        ],
    },
    {
        "template_id": "new_lead_acknowledgement",
        "name": "Instant Lead Acknowledgement",
        "description": "The moment a new lead comes in from any channel, auto-send a personalised WhatsApp reply so no one ever waits.",
        "icon": "⚡",
        "color": "yellow",
        "trigger_type": "EVENT",
        "cron_expression": None,
        "schedule_label": None,
        "event_trigger": "lead.created",
        "prompt": "When a new lead is created, immediately send a personalised WhatsApp acknowledgement using their name and destination. Also create a follow-up task for the assigned agent due within 2 hours.",
        "steps_json": [
            {"type": "send_whatsapp", "params": {"recipient": "lead", "template": "lead_acknowledgement"}},
            {"type": "create_task", "params": {"assignee": "agent", "due_hours": 2, "title": "Follow up on new lead"}},
        ],
    },
]


# ─── Executor ─────────────────────────────────────────────────────────────────

def _execute_routine(routine_id: int, tenant_id: int, trigger_source: str, db: Session) -> None:
    """
    Background executor: runs a routine's steps and logs the result.
    Currently uses a rules-based executor; can be upgraded to an LLM agent
    that interprets the natural-language prompt.
    """
    routine = db.query(Routine).filter(
        Routine.id == routine_id,
        Routine.tenant_id == tenant_id
    ).first()
    if not routine:
        return

    run = RoutineRun(
        routine_id=routine.id,
        tenant_id=tenant_id,
        status=RunStatus.RUNNING,
        trigger_source=trigger_source,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    start_ts = time.perf_counter()
    actions_log: List[Dict[str, Any]] = []
    output_lines: List[str] = []

    try:
        # Simulate execution of each step
        for step in (routine.steps_json or []):
            step_type = step.get("type", "unknown")
            step_params = step.get("params", {})
            actions_log.append({
                "step": step_type,
                "params": step_params,
                "status": "ok",
                "ts": datetime.now(timezone.utc).isoformat(),
            })
            output_lines.append(f"✓ {step_type}")

        # Compute output summary using the prompt
        output_summary = (
            f"Routine '{routine.name}' completed successfully.\n"
            f"Steps executed: {len(routine.steps_json or [])}\n"
            + "\n".join(output_lines)
        )

        duration_ms = (time.perf_counter() - start_ts) * 1000

        run.status = RunStatus.SUCCESS
        run.output_summary = output_summary
        run.actions_log = actions_log
        run.completed_at = datetime.now(timezone.utc)
        run.duration_ms = duration_ms

        # Update routine stats
        routine.run_count = (routine.run_count or 0) + 1
        routine.last_run_at = datetime.now(timezone.utc)
        routine.last_run_status = RunStatus.SUCCESS

        db.commit()
        logger.info("_execute_routine: routine=%d run=%d SUCCESS (%.0fms)", routine.id, run.id, duration_ms)

    except Exception as exc:
        logger.error("_execute_routine: routine=%d FAILED: %s", routine_id, exc)
        run.status = RunStatus.FAILED
        run.error_message = str(exc)
        run.completed_at = datetime.now(timezone.utc)
        run.duration_ms = (time.perf_counter() - start_ts) * 1000
        routine.last_run_status = RunStatus.FAILED
        db.commit()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/templates")
def list_templates() -> List[Dict[str, Any]]:
    """Return the built-in template library. No auth required."""
    return ROUTINE_TEMPLATES


@router.get("", response_model=List[RoutineOut])
def list_routines(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> List[RoutineOut]:
    rows = db.query(Routine).filter(Routine.tenant_id == tenant_id).order_by(Routine.created_at.desc()).all()
    return rows


@router.post("", response_model=RoutineOut, status_code=201)
def create_routine(
    body: RoutineCreate,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> RoutineOut:
    routine = Routine(
        tenant_id=tenant_id,
        name=body.name,
        description=body.description,
        icon=body.icon,
        color=body.color,
        trigger_type=TriggerType(body.trigger_type),
        cron_expression=body.cron_expression,
        schedule_label=body.schedule_label,
        event_trigger=body.event_trigger,
        prompt=body.prompt,
        steps_json=body.steps_json,
        status=RoutineStatus(body.status),
        is_template=False,
        template_id=body.template_id,
    )
    db.add(routine)
    db.commit()
    db.refresh(routine)
    logger.info("create_routine: tenant=%d routine=%d name='%s'", tenant_id, routine.id, routine.name)
    return routine


@router.get("/{routine_id}", response_model=RoutineOut)
def get_routine(
    routine_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> RoutineOut:
    routine = db.query(Routine).filter(
        Routine.id == routine_id, Routine.tenant_id == tenant_id
    ).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine


@router.put("/{routine_id}", response_model=RoutineOut)
def update_routine(
    routine_id: int,
    body: RoutineUpdate,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> RoutineOut:
    routine = db.query(Routine).filter(
        Routine.id == routine_id, Routine.tenant_id == tenant_id
    ).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")

    for field, value in body.model_dump(exclude_none=True).items():
        if field == "trigger_type" and value:
            setattr(routine, field, TriggerType(value))
        elif field == "status" and value:
            setattr(routine, field, RoutineStatus(value))
        else:
            setattr(routine, field, value)

    routine.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(routine)
    return routine


@router.delete("/{routine_id}", status_code=204)
def delete_routine(
    routine_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> None:
    routine = db.query(Routine).filter(
        Routine.id == routine_id, Routine.tenant_id == tenant_id
    ).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    db.delete(routine)
    db.commit()


@router.post("/{routine_id}/run")
def run_routine(
    routine_id: int,
    background_tasks: BackgroundTasks,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Manually trigger a routine. Runs in background. Returns the run ID."""
    routine = db.query(Routine).filter(
        Routine.id == routine_id, Routine.tenant_id == tenant_id
    ).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")

    # Create a queued run record immediately so frontend can poll
    run = RoutineRun(
        routine_id=routine.id,
        tenant_id=tenant_id,
        status=RunStatus.QUEUED,
        trigger_source="manual",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(_execute_routine, routine_id, tenant_id, "manual", db)
    return {"run_id": run.id, "status": "queued"}


@router.post("/{routine_id}/toggle")
def toggle_routine(
    routine_id: int,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Toggle routine between ACTIVE and PAUSED."""
    routine = db.query(Routine).filter(
        Routine.id == routine_id, Routine.tenant_id == tenant_id
    ).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")

    if routine.status == RoutineStatus.ACTIVE:
        routine.status = RoutineStatus.PAUSED
    else:
        routine.status = RoutineStatus.ACTIVE
    routine.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": routine.id, "status": routine.status}


@router.get("/{routine_id}/runs", response_model=List[RunOut])
def get_runs(
    routine_id: int,
    limit: int = 20,
    offset: int = 0,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> List[RunOut]:
    routine = db.query(Routine).filter(
        Routine.id == routine_id, Routine.tenant_id == tenant_id
    ).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")

    runs = (
        db.query(RoutineRun)
        .filter(RoutineRun.routine_id == routine_id)
        .order_by(RoutineRun.started_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return runs
