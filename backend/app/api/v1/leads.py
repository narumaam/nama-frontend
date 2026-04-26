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

import io
import csv
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Request, status
from fastapi.responses import StreamingResponse
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


# ── Manual lead creation (Add Lead UI button) ───────────────────────────────
class LeadCreateManual(BaseModel):
    """Friendly schema for UI-driven 'Add Lead' — most fields optional."""
    full_name:         Optional[str]      = None
    email:             Optional[str]      = None
    phone:             Optional[str]      = None
    sender_id:         Optional[str]      = None  # auto-derived if blank
    source:            Optional[str]      = "DIRECT"
    destination:       Optional[str]      = None
    duration_days:     Optional[int]      = None
    travelers_count:   Optional[int]      = 1
    travel_dates:      Optional[str]      = None
    budget_per_person: Optional[float]    = None
    currency:          Optional[str]      = "INR"
    travel_style:      Optional[str]      = "Standard"
    preferences:       Optional[List[str]] = None
    raw_message:       Optional[str]      = None
    notes:             Optional[str]      = None


@router.post(
    "/",
    response_model=LeadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lead manually (Add Lead UI)",
)
def create_lead_manual(
    body:      LeadCreateManual,
    request:   Request,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_any_agent_role),
):
    """
    Create a lead from the dashboard 'Add Lead' modal.
    Distinct from /leads/from-intentra (social signal) and /leads/import (CSV bulk).

    Tier 8E: honors the Idempotency-Key request header. Repeated requests with
    the same key (within 24h) return the originally-created lead instead of
    creating duplicates — protects against double-click + network-retry bugs.
    """
    from app.models.leads import Lead as _Lead, LeadSource as _LeadSource, LeadStatus as _LeadStatus
    from app.core.idempotency import idempotency_store

    # Tier 8E: idempotency check. Fail-open if header is absent.
    idem_key = request.headers.get("Idempotency-Key", "")
    if idem_key:
        cached = idempotency_store.get(tenant_id, "leads.create", idem_key)
        if cached is not None:
            return cached

    # Derive sender_id from email or phone if not provided (sender_id is non-null in DB).
    sender_id = (body.sender_id or body.email or body.phone or f"manual:{tenant_id}:{datetime.now(timezone.utc).timestamp()}")

    # Map source string → enum, fallback to DIRECT (or first valid value)
    src_value = (body.source or "DIRECT").upper()
    try:
        src_enum = _LeadSource[src_value] if src_value in _LeadSource.__members__ else _LeadSource.DIRECT
    except (KeyError, AttributeError):
        # Some deployments use lowercase enum values
        src_enum = next(iter(_LeadSource), None)

    lead = _Lead(
        tenant_id        = tenant_id,
        sender_id        = sender_id,
        source           = src_enum,
        full_name        = body.full_name,
        email            = body.email,
        phone            = body.phone,
        destination      = body.destination,
        duration_days    = body.duration_days,
        travelers_count  = body.travelers_count or 1,
        travel_dates     = body.travel_dates,
        budget_per_person= body.budget_per_person,
        currency         = body.currency or "INR",
        travel_style     = body.travel_style or "Standard",
        preferences      = body.preferences or [],
        raw_message      = body.raw_message,
        notes            = body.notes,
        status           = _LeadStatus.NEW,
        triage_confidence= 0.0,
    )
    try:
        db.add(lead)
        db.commit()
        db.refresh(lead)
    except Exception as exc:  # pragma: no cover
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Could not create lead: {exc}")

    distributed_cache.invalidate_pattern(f"leads:{tenant_id}:*")

    # Tier 8E: cache the response so a same-key retry within 24h returns this row.
    if idem_key:
        idempotency_store.set(tenant_id, "leads.create", idem_key, lead)

    return lead


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


# ── CSV Import ────────────────────────────────────────────────────────────────

# Column alias mapping (case-insensitive)
_IMPORT_ALIASES = {
    "full_name":         ["full_name", "name", "full name", "customer name", "lead name", "contact name"],
    "email":             ["email", "email address", "e-mail"],
    "phone":             ["phone", "phone number", "mobile", "contact", "whatsapp"],
    "destination":       ["destination", "dest", "trip", "travel to", "location"],
    "duration_days":     ["duration_days", "duration", "days", "nights", "trip length"],
    "travelers_count":   ["travelers_count", "travelers", "pax", "guests", "people", "adults"],
    "budget_per_person": ["budget_per_person", "budget", "price", "cost", "amount"],
    "currency":          ["currency", "cur"],
    "travel_style":      ["travel_style", "style", "type", "package type"],
    "status":            ["status"],
    "source":            ["source", "channel", "lead source"],
    "notes":             ["notes", "comments", "remarks", "note"],
}


def _build_alias_map(columns: List[str]) -> dict:
    """Return a mapping: canonical_field → actual_column_name (or None if not present)."""
    lower_col_map = {c.strip().lower(): c for c in columns}
    result = {}
    for canonical, aliases in _IMPORT_ALIASES.items():
        found = None
        for alias in aliases:
            if alias.lower() in lower_col_map:
                found = lower_col_map[alias.lower()]
                break
        result[canonical] = found
    return result


@router.get("/import/template", summary="Download CSV import template for leads")
def leads_import_template():
    """Return a CSV template with example rows."""
    headers = [
        "full_name", "email", "phone", "destination", "duration_days",
        "travelers_count", "budget_per_person", "currency", "travel_style",
        "status", "source", "notes",
    ]
    rows = [
        ["Aarav Sharma", "aarav@example.com", "+91 98765 43210", "Maldives Honeymoon",
         "7", "2", "175000", "INR", "Luxury", "NEW", "WHATSAPP", "Interested in overwater bungalow"],
        ["Mehta Family", "rahul@example.com", "+91 87654 32109", "Bali Family Holiday",
         "7", "4", "65000", "INR", "Standard", "CONTACTED", "EMAIL", "Family with kids"],
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_import_template.csv"},
    )


@router.post("/import", summary="Bulk import leads from CSV or XLSX")
async def leads_import(
    file: UploadFile = File(...),
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Import leads from a CSV or XLSX file.
    - Max 500 rows
    - Duplicate detection by email (per tenant)
    - Returns: { imported, skipped_duplicates, errors, total_rows }
    """
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas not installed — cannot import CSV")

    content = await file.read()
    filename = (file.filename or "").lower()

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}")

    total_rows = len(df)
    if total_rows > 500:
        raise HTTPException(
            status_code=400,
            detail=f"File contains {total_rows} rows — maximum is 500. Split into smaller files.",
        )

    alias_map = _build_alias_map(list(df.columns))

    def _val(row, field: str, default=None):
        col = alias_map.get(field)
        if col is None or col not in row.index:
            return default
        v = row[col]
        if pd.isna(v):
            return default
        return str(v).strip() or default

    imported = 0
    skipped_duplicates = 0
    errors: List[str] = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # 1-indexed + header row
        try:
            full_name = _val(row, "full_name")
            email     = _val(row, "email")
            phone     = _val(row, "phone")

            # Skip completely empty rows
            if not full_name and not email and not phone:
                continue

            # Duplicate check by email (per tenant)
            if email:
                existing = (
                    db.query(_Lead)
                    .filter(_Lead.tenant_id == tenant_id, _Lead.email == email)
                    .first()
                )
                if existing:
                    skipped_duplicates += 1
                    continue

            # Resolve status
            raw_status = _val(row, "status", "NEW").upper()
            try:
                lead_status = LeadStatus(raw_status)
            except ValueError:
                lead_status = LeadStatus.NEW

            # Resolve source
            raw_source = _val(row, "source", "OTHER").upper()
            valid_sources = {s.value for s in LeadSource}
            if raw_source not in valid_sources:
                raw_source = "OTHER"
            try:
                lead_source = LeadSource(raw_source)
            except ValueError:
                lead_source = LeadSource.OTHER if hasattr(LeadSource, "OTHER") else LeadSource.DIRECT

            # Numeric fields
            duration_raw = _val(row, "duration_days")
            travelers_raw = _val(row, "travelers_count")
            budget_raw = _val(row, "budget_per_person")
            try:
                duration_days = int(float(duration_raw)) if duration_raw else None
            except (ValueError, TypeError):
                duration_days = None
            try:
                travelers_count = int(float(travelers_raw)) if travelers_raw else 1
            except (ValueError, TypeError):
                travelers_count = 1
            try:
                budget_per_person = float(budget_raw) if budget_raw else None
            except (ValueError, TypeError):
                budget_per_person = None

            lead = _Lead(
                tenant_id=tenant_id,
                sender_id=email or phone or full_name or f"import-row-{row_num}",
                full_name=full_name,
                email=email,
                phone=phone,
                destination=_val(row, "destination"),
                duration_days=duration_days,
                travelers_count=travelers_count,
                budget_per_person=budget_per_person,
                currency=_val(row, "currency", "INR"),
                travel_style=_val(row, "travel_style", "Standard"),
                status=lead_status,
                source=lead_source,
                notes=_val(row, "notes"),
            )
            db.add(lead)
            imported += 1
        except Exception as exc:
            errors.append(f"Row {row_num}: {exc}")

    try:
        db.commit()
        distributed_cache.invalidate_pattern(f"leads:{tenant_id}:*")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB commit failed: {exc}")

    return {
        "imported": imported,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
        "total_rows": total_rows,
    }
