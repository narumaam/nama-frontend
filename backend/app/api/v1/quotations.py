"""
M3: Quotations API
--------------------
Full CRUD for travel quotations / proposals.

A Quotation is generated from an Itinerary + Lead combination, with
markup/margin applied. Lifecycle: DRAFT → SENT → ACCEPTED/REJECTED/EXPIRED.

Security: JWT + tenant-scoped RLS (HS-1, HS-2).

Endpoints:
  GET    /quotations/           — paginated list for current tenant
  POST   /quotations/           — create a new quotation
  GET    /quotations/{id}       — single quotation
  PATCH  /quotations/{id}       — update fields (status, price, notes)
  DELETE /quotations/{id}       — soft-delete (mark EXPIRED)
  POST   /quotations/{id}/send  — mark as SENT (sets sent_at timestamp)
"""

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, Enum as SAEnum
from sqlalchemy.orm import Session

from app.db.session import get_db, Base
from app.api.v1.deps import require_tenant, RoleChecker
from app.models.auth import UserRole

logger = logging.getLogger(__name__)
router = APIRouter()

# Role guards
_any_staff = RoleChecker([
    UserRole.R1_SUPER_ADMIN,
    UserRole.R2_ORG_ADMIN,
    UserRole.R3_SALES_MANAGER,
    UserRole.R4_OPS_EXECUTIVE,
])

# ── Enum ───────────────────────────────────────────────────────────────────────
class QuotationStatus(str, Enum):
    DRAFT    = "DRAFT"
    SENT     = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED  = "EXPIRED"


# ── SQLAlchemy Model ───────────────────────────────────────────────────────────
class Quotation(Base):
    __tablename__ = "quotations"

    id              = Column(Integer, primary_key=True, index=True)
    tenant_id       = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    lead_id         = Column(Integer, ForeignKey("leads.id"), nullable=True)
    itinerary_id    = Column(Integer, ForeignKey("itineraries.id"), nullable=True)
    lead_name       = Column(String(200), nullable=False)
    destination     = Column(String(200), nullable=False)
    # Pricing
    base_price      = Column(Numeric(12, 2), nullable=False, default=0)
    margin_pct      = Column(Numeric(5, 2), nullable=False, default=15)  # percent
    total_price     = Column(Numeric(12, 2), nullable=False, default=0)
    currency        = Column(String(3), nullable=False, default="INR")
    # Metadata
    status          = Column(SAEnum(QuotationStatus), nullable=False, default=QuotationStatus.DRAFT)
    notes           = Column(Text, nullable=True)
    valid_until     = Column(DateTime, nullable=True)
    sent_at         = Column(DateTime, nullable=True)
    is_deleted      = Column(Boolean, default=False, nullable=False)
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class QuotationCreate(BaseModel):
    lead_name:    str              = Field(..., min_length=1, max_length=200)
    destination:  str              = Field(..., min_length=1, max_length=200)
    base_price:   float            = Field(..., ge=0)
    margin_pct:   float            = Field(default=15.0, ge=0, le=100)
    currency:     str              = Field(default="INR", max_length=3)
    lead_id:      Optional[int]    = None
    itinerary_id: Optional[int]    = None
    notes:        Optional[str]    = None
    valid_until:  Optional[datetime] = None

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, v: str) -> str:
        return v.upper()

    @property
    def computed_total(self) -> float:
        return round(self.base_price * (1 + self.margin_pct / 100), 2)


class QuotationUpdate(BaseModel):
    lead_name:    Optional[str]    = None
    destination:  Optional[str]    = None
    base_price:   Optional[float]  = None
    margin_pct:   Optional[float]  = None
    currency:     Optional[str]    = None
    status:       Optional[QuotationStatus] = None
    notes:        Optional[str]    = None
    valid_until:  Optional[datetime] = None


class QuotationOut(BaseModel):
    id:           int
    tenant_id:    int
    lead_id:      Optional[int]
    itinerary_id: Optional[int]
    lead_name:    str
    destination:  str
    base_price:   float
    margin_pct:   float
    total_price:  float
    currency:     str
    status:       QuotationStatus
    notes:        Optional[str]
    valid_until:  Optional[datetime]
    sent_at:      Optional[datetime]
    created_at:   datetime
    updated_at:   datetime

    class Config:
        from_attributes = True


class QuotationListOut(BaseModel):
    items: List[QuotationOut]
    total: int
    page:  int
    size:  int


# ── Helpers ────────────────────────────────────────────────────────────────────
def _get_or_404(db: Session, quotation_id: int, tenant_id: int) -> Quotation:
    q = (
        db.query(Quotation)
        .filter(
            Quotation.id == quotation_id,
            Quotation.tenant_id == tenant_id,
            Quotation.is_deleted.is_(False),
        )
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return q


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=QuotationListOut,
    summary="List quotations for current tenant",
)
def list_quotations(
    status_filter: Optional[str] = Query(None, alias="status"),
    page:          int           = Query(1,    ge=1),
    size:          int           = Query(50,   ge=1, le=200),
    db:            Session       = Depends(get_db),
    tenant_id:     int           = Depends(require_tenant),
    _:             dict          = Depends(_any_staff),
):
    q = db.query(Quotation).filter(
        Quotation.tenant_id == tenant_id,
        Quotation.is_deleted.is_(False),
    )
    if status_filter:
        try:
            q = q.filter(Quotation.status == QuotationStatus(status_filter.upper()))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status_filter}")

    total = q.count()
    items = q.order_by(Quotation.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return QuotationListOut(items=items, total=total, page=page, size=size)


@router.post(
    "/",
    response_model=QuotationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new quotation",
)
def create_quotation(
    payload:   QuotationCreate,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_any_staff),
):
    total_price = round(payload.base_price * (1 + payload.margin_pct / 100), 2)
    q = Quotation(
        tenant_id    = tenant_id,
        lead_id      = payload.lead_id,
        itinerary_id = payload.itinerary_id,
        lead_name    = payload.lead_name,
        destination  = payload.destination,
        base_price   = payload.base_price,
        margin_pct   = payload.margin_pct,
        total_price  = total_price,
        currency     = payload.currency,
        notes        = payload.notes,
        valid_until  = payload.valid_until,
        status       = QuotationStatus.DRAFT,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    logger.info(f"Quotation created: tenant={tenant_id} id={q.id} destination={q.destination}")
    return q


@router.get(
    "/{quotation_id}",
    response_model=QuotationOut,
    summary="Get a single quotation",
)
def get_quotation(
    quotation_id: int,
    db:           Session = Depends(get_db),
    tenant_id:    int     = Depends(require_tenant),
    _:            dict    = Depends(_any_staff),
):
    return _get_or_404(db, quotation_id, tenant_id)


@router.patch(
    "/{quotation_id}",
    response_model=QuotationOut,
    summary="Update a quotation",
)
def update_quotation(
    quotation_id: int,
    payload:      QuotationUpdate,
    db:           Session = Depends(get_db),
    tenant_id:    int     = Depends(require_tenant),
    _:            dict    = Depends(_any_staff),
):
    q = _get_or_404(db, quotation_id, tenant_id)

    if payload.lead_name   is not None: q.lead_name   = payload.lead_name
    if payload.destination is not None: q.destination = payload.destination
    if payload.base_price  is not None: q.base_price  = payload.base_price
    if payload.margin_pct  is not None: q.margin_pct  = payload.margin_pct
    if payload.currency    is not None: q.currency    = payload.currency.upper()
    if payload.status      is not None: q.status      = payload.status
    if payload.notes       is not None: q.notes       = payload.notes
    if payload.valid_until is not None: q.valid_until = payload.valid_until

    # Recalculate total if pricing fields changed
    if payload.base_price is not None or payload.margin_pct is not None:
        q.total_price = round(float(q.base_price) * (1 + float(q.margin_pct) / 100), 2)

    q.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(q)
    logger.info(f"Quotation updated: tenant={tenant_id} id={quotation_id} status={q.status}")
    return q


@router.delete(
    "/{quotation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a quotation",
)
def delete_quotation(
    quotation_id: int,
    db:           Session = Depends(get_db),
    tenant_id:    int     = Depends(require_tenant),
    _:            dict    = Depends(_any_staff),
):
    q = _get_or_404(db, quotation_id, tenant_id)
    q.is_deleted = True
    q.status     = QuotationStatus.EXPIRED
    q.updated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info(f"Quotation deleted: tenant={tenant_id} id={quotation_id}")


@router.post(
    "/{quotation_id}/send",
    response_model=QuotationOut,
    summary="Mark quotation as SENT",
)
def send_quotation(
    quotation_id: int,
    db:           Session = Depends(get_db),
    tenant_id:    int     = Depends(require_tenant),
    _:            dict    = Depends(_any_staff),
):
    q = _get_or_404(db, quotation_id, tenant_id)
    if q.status not in (QuotationStatus.DRAFT, QuotationStatus.SENT):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot send a quotation with status {q.status}",
        )
    q.status  = QuotationStatus.SENT
    q.sent_at = datetime.now(timezone.utc)
    q.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(q)
    logger.info(f"Quotation sent: tenant={tenant_id} id={quotation_id}")
    return q


# ── New endpoints: accept / reject / pdf ──────────────────────────────────────
import io as _io
from fastapi.responses import StreamingResponse as _SR

class RejectIn(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)

@router.post("/{quotation_id}/accept", response_model=QuotationOut)
def accept_quotation(
    quotation_id: int, db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant), _: dict = Depends(_any_staff),
):
    q = _get_or_404(db, quotation_id, tenant_id)
    if q.status != QuotationStatus.SENT:
        raise HTTPException(status_code=409, detail=f"Only SENT quotations can be accepted. Current: {q.status}")
    q.status = QuotationStatus.ACCEPTED
    q.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(q)
    return q

@router.post("/{quotation_id}/reject", response_model=QuotationOut)
def reject_quotation(
    quotation_id: int, body: RejectIn = RejectIn(),
    db: Session = Depends(get_db), tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_any_staff),
):
    q = _get_or_404(db, quotation_id, tenant_id)
    if q.status != QuotationStatus.SENT:
        raise HTTPException(status_code=409, detail=f"Only SENT quotations can be rejected. Current: {q.status}")
    q.status = QuotationStatus.REJECTED
    if body.reason:
        q.notes = f"[Rejection reason] {body.reason}\n\n{q.notes or ''}".strip()
    q.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(q)
    return q

@router.get("/{quotation_id}/pdf", response_class=_SR)
def quotation_pdf(
    quotation_id: int, db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant), _: dict = Depends(_any_staff),
):
    q = _get_or_404(db, quotation_id, tenant_id)
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quotation #{q.id}</title>
<style>body{{font-family:Arial,sans-serif;margin:40px;color:#1e293b}}h1{{color:#0f766e}}</style></head>
<body><h1>NAMA Travel — Quotation #{q.id}</h1>
<p><b>Client:</b> {q.lead_name}</p><p><b>Destination:</b> {q.destination}</p>
<p><b>Status:</b> {q.status}</p><p><b>Total:</b> {q.currency} {float(q.total_price):,.2f}</p>
<p><b>Notes:</b> {q.notes or 'N/A'}</p></body></html>"""
    try:
        import weasyprint
        pdf = weasyprint.HTML(string=html).write_pdf()
        return _SR(_io.BytesIO(pdf), media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="quotation-{q.id}.pdf"'})
    except ImportError:
        return _SR(_io.BytesIO(html.encode()), media_type="text/html")
