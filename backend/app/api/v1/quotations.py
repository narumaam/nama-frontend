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
  POST   /quotations/{id}/respond — public: client accepts or requests changes
"""

import io
import logging
import secrets
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
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
    respond_token   = Column(String(64), nullable=True, index=True)  # SECURITY: validates public respond endpoint
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
    # Generate a secure respond token if not already set
    if not q.respond_token:
        q.respond_token = secrets.token_urlsafe(32)
    db.commit()
    db.refresh(q)
    logger.info(f"Quotation sent: tenant={tenant_id} id={quotation_id}")
    return q


# ── Schemas for new endpoints ─────────────────────────────────────────────────
class RejectIn(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


# ── Accept endpoint ───────────────────────────────────────────────────────────
@router.post(
    "/{quotation_id}/accept",
    response_model=QuotationOut,
    summary="Client accepts a quotation — moves to ACCEPTED",
)
def accept_quotation(
    quotation_id: int,
    db:           Session = Depends(get_db),
    tenant_id:    int     = Depends(require_tenant),
    _:            dict    = Depends(_any_staff),
):
    q = _get_or_404(db, quotation_id, tenant_id)
    if q.status != QuotationStatus.SENT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only SENT quotations can be accepted. Current status: {q.status}",
        )
    q.status     = QuotationStatus.ACCEPTED
    q.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(q)
    logger.info(f"Quotation accepted: tenant={tenant_id} id={quotation_id}")
    return q


# ── Reject endpoint ───────────────────────────────────────────────────────────
@router.post(
    "/{quotation_id}/reject",
    response_model=QuotationOut,
    summary="Client rejects a quotation — moves to REJECTED",
)
def reject_quotation(
    quotation_id: int,
    body:         RejectIn = RejectIn(),
    db:           Session  = Depends(get_db),
    tenant_id:    int      = Depends(require_tenant),
    _:            dict     = Depends(_any_staff),
):
    q = _get_or_404(db, quotation_id, tenant_id)
    if q.status != QuotationStatus.SENT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only SENT quotations can be rejected. Current status: {q.status}",
        )
    q.status = QuotationStatus.REJECTED
    if body.reason:
        existing = q.notes or ""
        q.notes  = f"[Rejection reason] {body.reason}\n\n{existing}".strip()
    q.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(q)
    logger.info(f"Quotation rejected: tenant={tenant_id} id={quotation_id} reason={body.reason!r}")
    return q


# ── PDF download endpoint ─────────────────────────────────────────────────────
@router.get(
    "/{quotation_id}/pdf",
    summary="Download quotation as a PDF",
    response_class=StreamingResponse,
)
def quotation_pdf(
    quotation_id: int,
    db:           Session = Depends(get_db),
    tenant_id:    int     = Depends(require_tenant),
    _:            dict    = Depends(_any_staff),
):
    """
    Generates a simple HTML-based PDF for the quotation.
    Uses WeasyPrint if available; falls back to plain-HTML download when not installed.
    """
    q = _get_or_404(db, quotation_id, tenant_id)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Quotation #{q.id}</title>
<style>
  body {{ font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }}
  h1 {{ color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 8px; }}
  .meta {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
           padding: 16px; margin: 20px 0; }}
  .meta table {{ width: 100%; border-collapse: collapse; }}
  .meta td {{ padding: 6px 12px; }}
  .meta td:first-child {{ font-weight: bold; color: #475569; width: 160px; }}
  .price {{ font-size: 28px; font-weight: bold; color: #0f766e; margin: 20px 0; }}
  .status {{ display: inline-block; padding: 4px 12px; border-radius: 20px;
             background: #ccfbf1; color: #0f766e; font-weight: bold; }}
  .notes {{ background: #fefce8; border: 1px solid #fde68a; border-radius: 8px;
            padding: 16px; margin: 20px 0; }}
  .footer {{ margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; }}
</style>
</head>
<body>
<h1>NAMA Travel — Quotation #{q.id}</h1>

<div class="meta">
  <table>
    <tr><td>Client</td><td>{q.lead_name}</td></tr>
    <tr><td>Destination</td><td>{q.destination}</td></tr>
    <tr><td>Status</td><td><span class="status">{q.status}</span></td></tr>
    <tr><td>Currency</td><td>{q.currency}</td></tr>
    <tr><td>Base Price</td><td>{q.currency} {float(q.base_price):,.2f}</td></tr>
    <tr><td>Margin</td><td>{float(q.margin_pct):.1f}%</td></tr>
    <tr><td>Created</td><td>{q.created_at.strftime('%d %b %Y')}</td></tr>
    {"<tr><td>Sent</td><td>" + q.sent_at.strftime('%d %b %Y') + "</td></tr>" if q.sent_at else ""}
    {"<tr><td>Valid Until</td><td>" + q.valid_until.strftime('%d %b %Y') + "</td></tr>" if q.valid_until else ""}
  </table>
</div>

<div class="price">Total: {q.currency} {float(q.total_price):,.2f}</div>

{"<div class='notes'><strong>Notes:</strong><br>" + (q.notes or "").replace(chr(10), "<br>") + "</div>" if q.notes else ""}

<div class="footer">
  Generated by NAMA OS · {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}
</div>
</body>
</html>"""

    try:
        import weasyprint  # type: ignore
        pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="quotation-{q.id}.pdf"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except ImportError:
        # WeasyPrint not installed — return HTML for browser-side save/print
        logger.warning("WeasyPrint not installed; returning HTML for quotation PDF")
        html_bytes = html_content.encode("utf-8")
        return StreamingResponse(
            io.BytesIO(html_bytes),
            media_type="text/html",
            headers={
                "Content-Disposition": f'inline; filename="quotation-{q.id}.html"',
            },
        )


# ── Public: Client Respond endpoint ──────────────────────────────────────────

class QuotationRespondRequest(BaseModel):
    action: str                          # "accept" or "request_changes"
    client_name: str
    client_email: Optional[str] = None
    message: Optional[str] = None       # optional message with change details
    token: str                           # SECURITY: respond_token generated when quote was SENT


class QuotationRespondResponse(BaseModel):
    success: bool
    new_status: str
    message: str


def _send_respond_notification(
    quotation: "Quotation",
    body: QuotationRespondRequest,
    db: Session,
) -> None:
    """Fire-and-forget Resend email to the agent. Graceful no-op if RESEND_API_KEY absent."""
    import os
    import httpx

    resend_key = os.getenv("RESEND_API_KEY")
    if not resend_key:
        logger.info("RESEND_API_KEY not set — skipping respond notification email")
        return

    # Try to find the agent's email via the associated lead
    agent_email: Optional[str] = None
    agent_name: str = "your agent"
    try:
        from app.models.leads import Lead
        from app.models.auth import User

        if quotation.lead_id:
            lead = db.query(Lead).filter(Lead.id == quotation.lead_id).first()
            if lead and lead.assigned_user_id:
                user = db.query(User).filter(User.id == lead.assigned_user_id).first()
                if user:
                    agent_email = user.email
                    agent_name = user.full_name or user.email
    except Exception as exc:
        logger.warning(f"Could not resolve agent for quotation {quotation.id}: {exc}")

    if not agent_email:
        logger.info(f"No agent email found for quotation {quotation.id} — skipping notification")
        return

    is_accept = body.action == "accept"
    subject = (
        f"✅ Quote Accepted by {body.client_name}"
        if is_accept
        else f"🔄 {body.client_name} requested changes on their quote"
    )

    change_section = ""
    if not is_accept and body.message:
        change_section = f"""
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
          <strong>Client's message:</strong><br>
          {body.message}
        </div>
        """

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
  <div style="background:#0f766e;color:white;padding:24px;border-radius:8px 8px 0 0;">
    <h2 style="margin:0;">{"✅ Quote Accepted" if is_accept else "🔄 Changes Requested"}</h2>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
    <p>Hi {agent_name},</p>
    <p>
      {"Your client <strong>" + body.client_name + "</strong> has <strong>accepted</strong> the quote." if is_accept
       else "Your client <strong>" + body.client_name + "</strong> has <strong>requested changes</strong> on the quote."}
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 12px;font-weight:bold;color:#475569;width:160px;">Quote ID</td><td style="padding:6px 12px;">#{quotation.id}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;color:#475569;">Client</td><td style="padding:6px 12px;">{body.client_name}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:6px 12px;font-weight:bold;color:#475569;">Destination</td><td style="padding:6px 12px;">{quotation.destination}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;color:#475569;">Total</td><td style="padding:6px 12px;">{quotation.currency} {float(quotation.total_price):,.2f}</td></tr>
      {"<tr style='background:#f8fafc;'><td style='padding:6px 12px;font-weight:bold;color:#475569;'>Client Email</td><td style='padding:6px 12px;'>" + body.client_email + "</td></tr>" if body.client_email else ""}
    </table>
    {change_section}
    <div style="margin-top:24px;">
      <a href="https://getnama.app/dashboard/quotations"
         style="background:#0f766e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        View Quote in Dashboard →
      </a>
    </div>
    <p style="margin-top:24px;font-size:12px;color:#94a3b8;">NAMA OS · Automated Notification</p>
  </div>
</body>
</html>"""

    from_email = os.getenv("RESEND_FROM_EMAIL", "NAMA OS <onboarding@getnama.app>")
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={"from": from_email, "to": [agent_email], "subject": subject, "html": html_body},
            timeout=10.0,
        )
        resp.raise_for_status()
        logger.info(f"Respond notification sent to {agent_email} for quotation {quotation.id}")
    except Exception as exc:
        logger.warning(f"Failed to send respond notification email: {exc}")


@router.post(
    "/{quotation_id}/respond",
    response_model=QuotationRespondResponse,
    summary="Public: client accepts or requests changes on a quote",
)
def client_respond_to_quotation(
    quotation_id: int,
    body: QuotationRespondRequest,
    db: Session = Depends(get_db),
):
    """
    Public endpoint — no JWT required, but respond_token validation is mandatory.
    The token is generated when the quote is SENT and must be included by the client portal.
    This prevents unauthorised accept/reject of quotes by guessing integer IDs.
    """
    if body.action not in ("accept", "request_changes"):
        raise HTTPException(
            status_code=422,
            detail="action must be 'accept' or 'request_changes'",
        )

    # Public lookup — no tenant filter since client has no JWT
    q = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id, Quotation.is_deleted.is_(False))
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # SECURITY: validate respond token using constant-time comparison
    if not q.respond_token or not secrets.compare_digest(q.respond_token, body.token):
        raise HTTPException(status_code=403, detail="Invalid or expired respond token")

    if q.status not in (QuotationStatus.SENT, QuotationStatus.DRAFT):
        # Already actioned — return current state gracefully
        return QuotationRespondResponse(
            success=True,
            new_status=q.status.value,
            message=f"This quote has already been {q.status.value.lower()}.",
        )

    if body.action == "accept":
        q.status = QuotationStatus.ACCEPTED
        user_message = "Quote accepted! Your travel consultant will be in touch shortly to confirm next steps."
    else:
        q.status = QuotationStatus.REJECTED  # closest existing status for revision
        note_prefix = f"[Revision requested by {body.client_name}]"
        if body.message:
            note_prefix += f" {body.message}"
        existing_notes = q.notes or ""
        q.notes = f"{note_prefix}\n\n{existing_notes}".strip()
        user_message = "Your change request has been noted. Your travel consultant will review and send a revised quote."

    q.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(q)

    logger.info(
        f"Quotation {quotation_id} responded: action={body.action} client={body.client_name!r} new_status={q.status}"
    )

    # Send agent notification (graceful no-op if Resend not configured)
    try:
        _send_respond_notification(q, body, db)
    except Exception as exc:
        logger.warning(f"Notification dispatch failed silently: {exc}")

    return QuotationRespondResponse(
        success=True,
        new_status=q.status.value,
        message=user_message,
    )
