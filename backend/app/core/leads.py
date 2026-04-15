"""
M2: Lead Service Layer
------------------------
Business logic for creating and managing CRM leads.

The key entry point is create_lead_from_triage() which is called by the
queries/ingest endpoint immediately after the Query Triage Agent returns
a valid result.  This closes the M1 → M2 loop:

  WhatsApp/Email → Query Triage Agent (M1) → Lead record (M2) → Itinerary (M8)

Design rules:
  - tenant_id ALWAYS comes from the JWT claims (HS-2) — never from the payload.
  - All queries use tenant_query() / get_or_404() helpers (HS-2).
  - Lead status is advanced by explicit service calls (not raw field writes)
    so state machine invariants can be enforced in one place.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.leads import Lead, LeadStatus, LeadSource
from app.schemas.leads import LeadCreate, LeadUpdate
from app.schemas.queries import RawQuery, QueryTriageResult
from app.core.rls import tenant_query, get_or_404

logger = logging.getLogger(__name__)


# ─── M1 → M2 Entry Point ──────────────────────────────────────────────────────

def create_lead_from_triage(
    *,
    db:            Session,
    tenant_id:     int,
    query:         RawQuery,
    triage_result: QueryTriageResult,
) -> Lead:
    """
    Persist a Lead from a successful triage result.

    Called by POST /queries/ingest after the AI classifies the message as
    a valid travel enquiry.

    Returns the newly created Lead ORM instance.
    """
    ed = triage_result.extracted_data  # ExtractedLeadData | None

    lead = Lead(
        tenant_id         = tenant_id,
        sender_id         = query.sender_id,
        source            = LeadSource(query.source.value),
        raw_message       = query.content,

        # Triage-extracted trip details
        destination       = ed.destination       if ed else None,
        duration_days     = ed.duration_days     if ed else None,
        travelers_count   = ed.travelers_count   if ed else 1,
        travel_dates      = ed.travel_dates      if ed else None,
        budget_per_person = ed.budget_per_person if ed else None,
        currency          = ed.currency          if ed else "INR",
        travel_style      = ed.style             if ed else "Standard",
        preferences       = ed.preferences       if ed else [],
        triage_confidence = ed.confidence_score  if ed else 0.0,

        # Full AI output for audit trail
        triage_result     = triage_result.model_dump(),
        suggested_reply   = triage_result.suggested_reply,

        status            = LeadStatus.NEW,
        priority          = _derive_priority(ed),
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    logger.info(
        "Lead created: id=%s tenant=%s source=%s destination=%s",
        lead.id, tenant_id, lead.source, lead.destination,
    )
    return lead


# ─── CRUD ─────────────────────────────────────────────────────────────────────

def get_leads(
    db:        Session,
    tenant_id: int,
    status:    Optional[str] = None,
    page:      int           = 1,
    size:      int           = 50,
) -> tuple[list[Lead], int]:
    """
    Return paginated lead list for a tenant, optionally filtered by status.
    All queries are automatically scoped to tenant_id (HS-2).
    """
    q = tenant_query(db, Lead, tenant_id)
    if status:
        q = q.filter(Lead.status == status)
    total = q.count()
    items = q.order_by(Lead.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return items, total


def get_lead(db: Session, lead_id: int, tenant_id: int) -> Lead:
    """Fetch a single lead by id, scoped to tenant (HS-2 — returns 404, not 403)."""
    return get_or_404(db, Lead, resource_id=lead_id, tenant_id=tenant_id)


def update_lead(
    db:        Session,
    lead_id:   int,
    tenant_id: int,
    payload:   LeadUpdate,
) -> Lead:
    """Partial update of a lead.  Enforces tenant isolation."""
    lead = get_or_404(db, Lead, resource_id=lead_id, tenant_id=tenant_id)

    update_data = payload.model_dump(exclude_unset=True)

    # State machine guard for status transitions
    if "status" in update_data:
        _validate_status_transition(lead.status, update_data["status"])
        _stamp_status_timestamp(lead, update_data["status"])

    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead


def assign_lead(db: Session, lead_id: int, tenant_id: int, user_id: int) -> Lead:
    """Assign a lead to a specific user within the same tenant."""
    lead = get_or_404(db, Lead, resource_id=lead_id, tenant_id=tenant_id)
    lead.assigned_user_id = user_id
    if lead.status == LeadStatus.NEW:
        lead.status = LeadStatus.CONTACTED
        lead.contacted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lead)
    return lead


# ─── Helpers ──────────────────────────────────────────────────────────────────

# Valid forward transitions in the lead state machine
_VALID_TRANSITIONS: dict[LeadStatus, set[LeadStatus]] = {
    LeadStatus.NEW:           {LeadStatus.CONTACTED, LeadStatus.UNRESPONSIVE, LeadStatus.LOST},
    LeadStatus.CONTACTED:     {LeadStatus.QUALIFIED, LeadStatus.UNRESPONSIVE, LeadStatus.LOST},
    LeadStatus.QUALIFIED:     {LeadStatus.PROPOSAL_SENT, LeadStatus.LOST},
    LeadStatus.PROPOSAL_SENT: {LeadStatus.NEGOTIATING, LeadStatus.WON, LeadStatus.LOST},
    LeadStatus.NEGOTIATING:   {LeadStatus.WON, LeadStatus.LOST},
    LeadStatus.WON:           set(),   # terminal
    LeadStatus.LOST:          set(),   # terminal
    LeadStatus.UNRESPONSIVE:  {LeadStatus.CONTACTED, LeadStatus.LOST},
}


def _validate_status_transition(current: LeadStatus, target: str) -> None:
    try:
        target_enum = LeadStatus(target)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid lead status: {target}",
        )
    allowed = _VALID_TRANSITIONS.get(current, set())
    if target_enum not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition lead from {current} → {target}. "
                   f"Allowed next states: {[s.value for s in allowed]}",
        )


def _stamp_status_timestamp(lead: Lead, new_status: str) -> None:
    """Set the lifecycle timestamp for terminal/milestone states."""
    now = datetime.now(timezone.utc)
    if new_status == LeadStatus.CONTACTED.value and not lead.contacted_at:
        lead.contacted_at = now
    elif new_status == LeadStatus.QUALIFIED.value and not lead.qualified_at:
        lead.qualified_at = now
    elif new_status == LeadStatus.WON.value:
        lead.won_at = now
    elif new_status == LeadStatus.LOST.value:
        lead.lost_at = now


def _derive_priority(ed) -> int:
    """
    Derive initial lead priority (1 = high, 10 = low) from triage data.
    High budget + high confidence = lower priority number = higher importance.
    """
    if ed is None:
        return 7   # default medium-low

    score = 5  # baseline

    # High confidence from AI = bump up priority
    if ed.confidence_score >= 0.8:
        score -= 1
    elif ed.confidence_score < 0.4:
        score += 2

    # Luxury / high budget = bump up
    if ed.style == "Luxury":
        score -= 1
    elif ed.style == "Budget":
        score += 1

    return max(1, min(10, score))
