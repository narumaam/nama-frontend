"""
M2: Lead (CRM) API
--------------------
Full CRUD for CRM leads, secured by JWT + tenant-scoped RLS (HS-1, HS-2).

Endpoints:
  GET    /leads/           — paginated lead list for current tenant
  GET    /leads/{id}       — single lead (404 if not in tenant)
  PATCH  /leads/{id}       — update fields / advance status
  POST   /leads/{id}/assign — assign to a user
  DELETE /leads/{id}       — soft-delete (sets status=LOST)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.session import get_db
from app.api.v1.deps import require_tenant, get_token_claims, RoleChecker
from app.models.auth import UserRole
from app.schemas.leads import LeadOut, LeadUpdate, LeadListOut
from app.core.leads import get_leads, get_lead, update_lead, assign_lead
from app.core.redis_cache import distributed_cache

router = APIRouter()

# Role guards
_manager_roles  = RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R3_SALES_MANAGER])
_any_agent_role = RoleChecker([
    UserRole.R2_ORG_ADMIN,
    UserRole.R3_SALES_MANAGER,
    UserRole.R4_OPS_EXECUTIVE,
])


@router.get("/", response_model=LeadListOut, summary="List leads for current tenant")
def list_leads(
    status_filter: Optional[str] = Query(None, alias="status"),
    page:          int           = Query(1,    ge=1),
    size:          int           = Query(50,   ge=1, le=200),
    db:            Session       = Depends(get_db),
    tenant_id:     int           = Depends(require_tenant),
    _:             dict          = Depends(_any_agent_role),
):
    # Step 1: Check distributed cache
    cache_key = f"leads:{tenant_id}:p{page}:s{size}:{status_filter or 'all'}"
    cached = distributed_cache.get(cache_key)
    if cached is not None:
        return cached

    # Step 2: Query leads from database
    items, total = get_leads(db, tenant_id, status=status_filter, page=page, size=size)
    result = LeadListOut(items=items, total=total, page=page, size=size)

    # Step 3: Cache the result with 10-second TTL
    distributed_cache.set(cache_key, result, ttl_seconds=10)
    return result


@router.get("/{lead_id}", response_model=LeadOut, summary="Get a single lead")
def read_lead(
    lead_id:   int,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_any_agent_role),
):
    return get_lead(db, lead_id=lead_id, tenant_id=tenant_id)


@router.patch("/{lead_id}", response_model=LeadOut, summary="Update a lead")
def patch_lead(
    lead_id:   int,
    payload:   LeadUpdate,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_any_agent_role),
):
    result = update_lead(db, lead_id=lead_id, tenant_id=tenant_id, payload=payload)
    # Invalidate leads list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"leads:{tenant_id}:*")
    return result


@router.post(
    "/{lead_id}/assign",
    response_model=LeadOut,
    summary="Assign lead to a user",
)
def assign_lead_to_user(
    lead_id:  int,
    user_id:  int,
    db:       Session = Depends(get_db),
    tenant_id: int    = Depends(require_tenant),
    _:        dict    = Depends(_manager_roles),
):
    result = assign_lead(db, lead_id=lead_id, tenant_id=tenant_id, user_id=user_id)
    # Invalidate leads list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"leads:{tenant_id}:*")
    return result


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a lead (sets status=LOST)",
)
def delete_lead(
    lead_id:   int,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_manager_roles),
):
    """
    Leads are never hard-deleted — they are marked LOST for audit trail.
    """
    lead = get_lead(db, lead_id=lead_id, tenant_id=tenant_id)
    from app.schemas.leads import LeadUpdate, LeadStatus
    update_lead(db, lead_id=lead.id, tenant_id=tenant_id,
                payload=LeadUpdate(status=LeadStatus.LOST))
    # Invalidate leads list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"leads:{tenant_id}:*")


# ── Schemas for notes / activities ────────────────────────────────────────────

class NoteIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    author:  Optional[str] = Field(None, max_length=100)


class NoteOut(BaseModel):
    id:         str
    content:    str
    author:     Optional[str]
    created_at: str


class ActivityOut(BaseModel):
    id:          str
    type:        str
    title:       str
    description: Optional[str]
    timestamp:   str


# ── Notes endpoint ────────────────────────────────────────────────────────────

_NOTE_SEP    = "\n[NOTE_SEP]\n"
_NOTE_PREFIX = "[NOTE]"


def _parse_notes(raw: Optional[str]) -> List[NoteOut]:
    """Parse structured notes stored in the lead's `notes` text column."""
    if not raw:
        return []
    notes = []
    for i, chunk in enumerate(raw.split(_NOTE_SEP)):
        chunk = chunk.strip()
        if not chunk:
            continue
        if chunk.startswith(_NOTE_PREFIX):
            inner = chunk[len(_NOTE_PREFIX):].strip()
            parts   = inner.split(" | ", 2)
            ts      = parts[0].strip() if len(parts) > 0 else ""
            author  = parts[1].strip() if len(parts) > 1 else None
            content = parts[2].strip() if len(parts) > 2 else inner
        else:
            ts      = ""
            author  = None
            content = chunk
        notes.append(NoteOut(id=f"note-{i}", content=content, author=author, created_at=ts))
    return list(reversed(notes))


@router.post(
    "/{lead_id}/notes",
    response_model=List[NoteOut],
    status_code=status.HTTP_201_CREATED,
    summary="Add a note to a lead",
)
def create_note(
    lead_id:   int,
    body:      NoteIn,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_any_agent_role),
):
    lead = get_lead(db, lead_id=lead_id, tenant_id=tenant_id)
    now         = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    author_part = body.author or "Staff"
    new_entry   = f"{_NOTE_PREFIX} {now} | {author_part} | {body.content}"
    existing    = (lead.notes or "").strip()
    lead.notes  = f"{existing}{_NOTE_SEP}{new_entry}" if existing else new_entry
    lead.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lead)
    distributed_cache.invalidate_pattern(f"leads:{tenant_id}:*")
    return _parse_notes(lead.notes)


# ── Activities endpoint ───────────────────────────────────────────────────────

@router.get(
    "/{lead_id}/activities",
    response_model=List[ActivityOut],
    summary="Get activity timeline for a lead",
)
def list_activities(
    lead_id:   int,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_any_agent_role),
):
    lead = get_lead(db, lead_id=lead_id, tenant_id=tenant_id)

    activities: List[ActivityOut] = []

    def _add(ev_type: str, title: str, desc: str, ts):
        if ts is None:
            return
        ts_str = ts.strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(ts, "strftime") else str(ts)
        activities.append(ActivityOut(
            id=f"{ev_type}-{lead_id}",
            type=ev_type,
            title=title,
            description=desc,
            timestamp=ts_str,
        ))

    _add("lead_created",   "Lead created",          f"Lead received via {lead.source}", lead.created_at)
    _add("lead_contacted", "First contact made",     "Lead status advanced to CONTACTED", lead.contacted_at)
    _add("lead_qualified", "Lead qualified",         "Lead marked as QUALIFIED",          getattr(lead, "qualified_at", None))
    _add("lead_won",       "Lead won 🎉",             "Converted to booking",               lead.won_at)
    _add("lead_lost",      "Lead lost",              "Lead marked as LOST",                lead.lost_at)

    for note in _parse_notes(lead.notes):
        if note.created_at:
            activities.append(ActivityOut(
                id=f"note-{note.id}",
                type="note_added",
                title=f"Note added by {note.author or 'Staff'}",
                description=note.content[:120] + ("…" if len(note.content) > 120 else ""),
                timestamp=note.created_at,
            ))

    activities.sort(key=lambda a: a.timestamp or "", reverse=True)
    return activities


# ── P3-5: Intentra signal → Lead conversion ────────────────────────────────────
from pydantic import BaseModel as _BM
from app.models.leads import Lead as _Lead  # type: ignore
from app.models.leads import LeadSource, LeadStatus  # type: ignore


class IntentSignalIn(_BM):
    """Payload from Intentra UI when an agent clicks '+ Lead' on a signal."""
    signal_id:         int
    platform:          str          # REDDIT | TWITTER | QUORA | etc.
    username:          str
    post_excerpt:      str
    destinations:      list[str]    = []
    intent_score:      int          = 50   # 0-100
    contact_note:      str          = ""


@router.post(
    "/from-intentra",
    summary="P3-5: Convert an Intentra signal into a Lead",
    status_code=201,
)
def create_lead_from_intentra(
    body:      IntentSignalIn,
    tenant_id: int           = Depends(require_tenant),
    claims:    dict          = Depends(get_token_claims),
    db:        Session       = Depends(get_db),
):
    """
    P3-5 — Intentra '+ Lead' action.
    Creates a lead from a social-signal with the source set to INTENTRA
    and a pre-filled note explaining the signal origin.
    """
    dest = ", ".join(body.destinations) or "Unknown"
    note = (
        f"[Intentra Signal] Platform: {body.platform} · User: @{body.username}\n"
        f"Post excerpt: {body.post_excerpt[:300]}\n"
        f"Intent score: {body.intent_score}/100\n"
        f"Agent note: {body.contact_note}"
    )

    lead = _Lead(
        tenant_id=tenant_id,
        sender_id=f"intentra:{body.platform.lower()}:{body.username}",
        source="INTENTRA",
        status=LeadStatus.NEW.value if hasattr(LeadStatus, "NEW") else "new",
        full_name=f"@{body.username}",
        destination=dest,
        raw_message=body.post_excerpt,
        notes=note,
        triage_confidence=body.intent_score / 100.0,
    )

    try:
        db.add(lead)
        db.commit()
        db.refresh(lead)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create lead: {exc}")

    distributed_cache.invalidate_pattern(f"leads:{tenant_id}:*")

    return {
        "id": lead.id,
        "status": "created",
        "source": "INTENTRA",
        "destination": dest,
        "message": f"Lead created from @{body.username}'s {body.platform} signal",
    }
