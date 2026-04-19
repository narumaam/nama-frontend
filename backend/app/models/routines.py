"""
NAMA Routines — Automation Engine Models
-----------------------------------------
Routine: A named, scheduled or event-driven automation that NAMA executes
         autonomously using its own AI and data pipeline.

RoutineRun: Execution log for each routine trigger (manual, scheduled, or event).
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, JSON, Float, Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class TriggerType(str, enum.Enum):
    SCHEDULE = "SCHEDULE"    # cron-based
    EVENT    = "EVENT"       # fired by a platform event
    MANUAL   = "MANUAL"      # user-triggered only


class RoutineStatus(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    PAUSED   = "PAUSED"
    DRAFT    = "DRAFT"


class RunStatus(str, enum.Enum):
    QUEUED    = "QUEUED"
    RUNNING   = "RUNNING"
    SUCCESS   = "SUCCESS"
    FAILED    = "FAILED"
    CANCELLED = "CANCELLED"
    SKIPPED   = "SKIPPED"


class Routine(Base):
    __tablename__ = "routines"

    id              = Column(Integer, primary_key=True, index=True)
    tenant_id       = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name            = Column(String(120), nullable=False)
    description     = Column(Text, default="")
    icon            = Column(String(10), default="⚡")   # emoji shorthand
    color           = Column(String(20), default="emerald")  # tailwind color name

    # ── Trigger ──────────────────────────────────────────────────────────────────
    trigger_type    = Column(SAEnum(TriggerType), nullable=False, default=TriggerType.MANUAL)
    # For SCHEDULE: standard cron expression (5-field)
    cron_expression = Column(String(100), nullable=True)
    # Human-readable schedule label, e.g. "Every day at 8:00 AM"
    schedule_label  = Column(String(100), nullable=True)
    # For EVENT: event name, e.g. "lead.created", "booking.confirmed"
    event_trigger   = Column(String(80), nullable=True)

    # ── Prompt / Steps ───────────────────────────────────────────────────────────
    # Natural-language description of what to do — fed to NAMA AI executor
    prompt          = Column(Text, nullable=False, default="")
    # Parsed action steps (list of {type, params} dicts)
    steps_json      = Column(JSON, default=list)

    # ── State ────────────────────────────────────────────────────────────────────
    status          = Column(SAEnum(RoutineStatus), nullable=False, default=RoutineStatus.DRAFT)
    run_count       = Column(Integer, default=0)
    last_run_at     = Column(DateTime(timezone=True), nullable=True)
    last_run_status = Column(SAEnum(RunStatus), nullable=True)
    next_run_at     = Column(DateTime(timezone=True), nullable=True)

    # ── Meta ─────────────────────────────────────────────────────────────────────
    is_template     = Column(Boolean, default=False)   # NAMA system template
    template_id     = Column(String(60), nullable=True)  # slug for built-in templates
    created_by      = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                             onupdate=lambda: datetime.now(timezone.utc))

    # ── Relationships ─────────────────────────────────────────────────────────────
    runs = relationship("RoutineRun", back_populates="routine",
                        cascade="all, delete-orphan", order_by="RoutineRun.started_at.desc()")


class RoutineRun(Base):
    __tablename__ = "routine_runs"

    id              = Column(Integer, primary_key=True, index=True)
    routine_id      = Column(Integer, ForeignKey("routines.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id       = Column(Integer, nullable=False, index=True)   # denormalized for fast queries

    status          = Column(SAEnum(RunStatus), nullable=False, default=RunStatus.QUEUED)
    trigger_source  = Column(String(20), default="manual")  # "manual" | "schedule" | "event"
    trigger_detail  = Column(String(120), nullable=True)    # e.g. "lead.created #42"

    started_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at    = Column(DateTime(timezone=True), nullable=True)
    duration_ms     = Column(Float, nullable=True)

    # Human-readable summary of what was done
    output_summary  = Column(Text, nullable=True)
    # Structured log of each action taken
    actions_log     = Column(JSON, default=list)
    error_message   = Column(Text, nullable=True)

    routine = relationship("Routine", back_populates="runs")
