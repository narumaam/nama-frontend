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

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

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


# ── Notes + Activities endpoints ──────────────────────────────────────────────
from datetime import datetime as _dt, timezone as _tz
from pydantic import BaseModel as _BM, Field as _F
from typing import List as _L

class NoteIn(_BM):
    content: str = _F(..., min_length=1, max_length=2000)
    author: str = _F("Staff", max_length=100)

_SEP = "\n[NOTE_SEP]\n"
_PFX = "[NOTE]"

def _parse(raw):
    if not raw: return []
    out = []
    for i, c in enumerate(raw.split(_SEP)):
        c = c.strip()
        if not c: continue
        if c.startswith(_PFX):
            parts = c[len(_PFX):].strip().split(" | ", 2)
            ts = parts[0] if parts else ""; auth = parts[1] if len(parts)>1 else "Staff"
            txt = parts[2] if len(parts)>2 else c
        else:
            ts = ""; auth = "Staff"; txt = c
        out.append({"id": f"note-{i}", "content": txt, "author": auth, "created_at": ts})
    return list(reversed(out))

@router.post("/{lead_id}/notes", status_code=201)
def create_note(lead_id: int, body: NoteIn, db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant), _: dict = Depends(_any_agent_role)):
    lead = get_lead(db, lead_id=lead_id, tenant_id=tenant_id)
    now = _dt.now(_tz.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    entry = f"{_PFX} {now} | {body.author} | {body.content}"
    lead.notes = f"{(lead.notes or '').strip()}{_SEP}{entry}".strip()
    lead.updated_at = _dt.now(_tz.utc)
    db.commit(); db.refresh(lead)
    distributed_cache.invalidate_pattern(f"leads:{tenant_id}:*")
    return _parse(lead.notes)

@router.get("/{lead_id}/activities")
def list_activities(lead_id: int, db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant), _: dict = Depends(_any_agent_role)):
    lead = get_lead(db, lead_id=lead_id, tenant_id=tenant_id)
    acts = []
    def _a(t, title, desc, ts):
        if ts: acts.append({"id": f"{t}-{lead_id}", "type": t, "title": title,
            "description": desc, "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(ts,"strftime") else str(ts)})
    _a("created", "Lead created", f"via {lead.source}", lead.created_at)
    _a("contacted", "First contact", "Marked CONTACTED", lead.contacted_at)
    _a("won", "Lead won", "Converted", lead.won_at)
    _a("lost", "Lead lost", "Marked LOST", lead.lost_at)
    for n in _parse(lead.notes):
        if n["created_at"]:
            acts.append({"id": f"note-{n['id']}", "type": "note_added",
                "title": f"Note by {n['author']}", "description": n["content"][:120],
                "timestamp": n["created_at"]})
    return sorted(acts, key=lambda x: x["timestamp"], reverse=True)
