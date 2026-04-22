import base64
import html
import io
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional
import httpx

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.documents import DocumentType, DocumentUploadResponse, PassportData
from app.agents.documents import DocumentAgent
from app.api.v1.deps import get_current_user, require_tenant, RoleChecker
from app.api.v1.quotations import Quotation, QuotationStatus, _get_or_404
from app.models.auth import UserRole
from app.models.bookings import Booking
from app.models.content import MediaAsset as MediaAssetModel
from app.models.itineraries import Itinerary
from app.models.leads import Lead
from typing import Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter()
doc_agent = DocumentAgent()

_any_staff = RoleChecker([
    UserRole.R1_SUPER_ADMIN,
    UserRole.R2_ORG_ADMIN,
    UserRole.R3_SALES_MANAGER,
    UserRole.R4_OPS_EXECUTIVE,
])


# ── Pydantic bodies ────────────────────────────────────────────────────────────

class QuotationPDFRequest(BaseModel):
    quotation_id: int


class SendQuotationRequest(BaseModel):
    quotation_id: int
    client_email: str
    message: Optional[str] = None


class BookingPacketRequest(BaseModel):
    booking_id: int
    quotation_id: Optional[int] = None


class SendBookingPacketRequest(BaseModel):
    booking_id: int
    quotation_id: Optional[int] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None


# ── HTML template ──────────────────────────────────────────────────────────────

def _build_quotation_html(
    q: Quotation,
    itinerary: Optional[Itinerary] = None,
    media_assets: Optional[list[MediaAssetModel]] = None,
) -> str:
    base_price = float(q.base_price)
    margin_pct = float(q.margin_pct)
    total_price = float(q.total_price)
    margin_amt = total_price - base_price
    tax_rate = 0.05
    tax_amt = round(margin_amt * tax_rate, 2)

    def fmt(amount: float) -> str:
        return f"{q.currency} {amount:,.2f}"

    def esc(value: Optional[str]) -> str:
        return html.escape(value or "")

    def slug_bits(value: Optional[str]) -> set[str]:
        cleaned = re.sub(r"[^a-z0-9]+", " ", (value or "").lower())
        return {bit for bit in cleaned.split() if len(bit) > 2}

    created_str = q.created_at.strftime("%d %B %Y")
    ref = f"NAMA-{q.id:06d}"
    valid_days = 7
    valid_str = (
        q.valid_until.strftime("%d %B %Y")
        if q.valid_until
        else "7 days from issue date"
    )
    notes_block = ""
    if q.notes:
        escaped = esc(q.notes)
        notes_block = f"""
        <div class="notes">
          <strong>Notes &amp; Inclusions:</strong><br>
          {escaped.replace(chr(10), "<br>")}
        </div>"""

    itinerary_days = itinerary.days_json if itinerary and isinstance(itinerary.days_json, list) else []
    destination_tokens = slug_bits(q.destination) | slug_bits(itinerary.destination if itinerary else None)
    media_assets = media_assets or []
    hero_images: list[str] = []

    def add_hero(url: Optional[str]) -> None:
        if url and url not in hero_images:
            hero_images.append(url)

    day_cards = []
    for day_index, day in enumerate(itinerary_days, start=1):
        if not isinstance(day, dict):
            continue
        title = day.get("title") or day.get("heading") or f"Day {day_index}"
        summary = day.get("summary") or day.get("description") or day.get("theme") or ""
        overnight = day.get("overnight") or day.get("hotel") or day.get("stay") or ""
        image_url = day.get("imageUrl") or day.get("image_url") or day.get("heroImage") or day.get("photo")
        add_hero(image_url)

        activities = []
        if isinstance(day.get("activities"), list):
            activities = [item for item in day.get("activities") if isinstance(item, dict)]

        activity_items = []
        for activity in activities[:4]:
            act_title = esc(activity.get("title") or activity.get("name") or "Planned experience")
            act_desc = esc(activity.get("description") or activity.get("summary") or "")
            meta_parts = []
            if activity.get("time"):
                meta_parts.append(esc(str(activity.get("time"))))
            if activity.get("duration"):
                meta_parts.append(esc(str(activity.get("duration"))))
            if activity.get("category"):
                meta_parts.append(esc(str(activity.get("category"))))
            meta_html = " · ".join(meta_parts)
            activity_items.append(
                f"""
                <div class="activity">
                  <div class="activity-name">{act_title}</div>
                  {'<div class="activity-meta">' + meta_html + '</div>' if meta_html else ''}
                  {'<div class="activity-desc">' + act_desc + '</div>' if act_desc else ''}
                </div>"""
            )

        day_cards.append(
            f"""
            <div class="day-card">
              <div class="day-chip">Day {day_index}</div>
              <div class="day-content">
                <div class="day-title">{esc(str(title))}</div>
                {'<div class="day-summary">' + esc(str(summary)) + '</div>' if summary else ''}
                {'<div class="day-stay">Overnight: ' + esc(str(overnight)) + '</div>' if overnight else ''}
                <div class="activity-list">{''.join(activity_items) if activity_items else '<div class="activity-empty">Curated routing, stays, and transfers will be confirmed at booking.</div>'}</div>
              </div>
            </div>"""
        )

    matched_assets = []
    for asset in media_assets:
        if str(getattr(asset, "asset_type", "")).upper().endswith("IMAGE") is False:
            continue
        title_bits = slug_bits(asset.title)
        tag_bits = {str(tag).lower() for tag in (asset.tags or [])}
        if not destination_tokens or destination_tokens.intersection(title_bits | tag_bits):
            matched_assets.append(asset)

    for asset in matched_assets[:4]:
        add_hero(asset.url)

    if not hero_images:
        for asset in media_assets[:3]:
            if str(getattr(asset, "asset_type", "")).upper().endswith("IMAGE"):
                add_hero(asset.url)

    hero_gallery = "".join(
        f'<div class="hero-image"><img src="{esc(url)}" alt="{esc(q.destination)}"/></div>'
        for url in hero_images[:3]
    )
    highlights = [
        ("Destination", q.destination),
        ("Trip length", f"{itinerary.duration_days} days" if itinerary and itinerary.duration_days else "Custom duration"),
        ("Style", itinerary.travel_style if itinerary and itinerary.travel_style else "Tailor-made holiday"),
        ("Travellers", f"{itinerary.traveler_count} pax" if itinerary and itinerary.traveler_count else "On request"),
    ]
    highlights_html = "".join(
        f'<div class="highlight"><div class="highlight-label">{esc(label)}</div><div class="highlight-value">{esc(value)}</div></div>'
        for label, value in highlights
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Travel Quotation {ref}</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      padding: 40px;
      font-size: 12px;
      line-height: 1.55;
      background: #ffffff;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #14B8A6;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }}
    .brand-name {{
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }}
    .brand-tag {{
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #14B8A6;
      margin-top: 2px;
    }}
    .header-meta {{
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }}
    .header-meta .ref {{
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 2px;
    }}
    .client-block {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 22px;
      margin-bottom: 20px;
    }}
    .client-block .label {{
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 4px;
    }}
    .client-block .name {{
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }}
    .client-block .dest {{
      font-size: 14px;
      color: #14B8A6;
      font-weight: 600;
      margin-top: 2px;
    }}
    .price-hero {{
      background: #0f172a;
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .price-hero .plabel {{
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }}
    .price-hero .pvalue {{
      font-size: 32px;
      font-weight: 900;
      color: #14B8A6;
    }}
    .price-hero .pstatus {{
      font-size: 13px;
      font-weight: 700;
      color: white;
      background: #14B8A6;
      padding: 5px 14px;
      border-radius: 20px;
    }}
    .hero-gallery {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }}
    .hero-image {{
      height: 150px;
      border-radius: 16px;
      overflow: hidden;
      background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
      border: 1px solid #e2e8f0;
    }}
    .hero-image img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }}
    .highlights {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }}
    .highlight {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px;
    }}
    .highlight-label {{
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 6px;
    }}
    .highlight-value {{
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }}
    .section-title {{
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 10px;
    }}
    .itinerary-grid {{
      display: grid;
      gap: 14px;
      margin-bottom: 22px;
    }}
    .day-card {{
      display: flex;
      gap: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      background: #ffffff;
      page-break-inside: avoid;
    }}
    .day-chip {{
      min-width: 88px;
      background: #0f172a;
      color: #14B8A6;
      font-weight: 900;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px 12px;
    }}
    .day-content {{
      padding: 16px 16px 14px 0;
      flex: 1;
    }}
    .day-title {{
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
    }}
    .day-summary {{
      font-size: 12px;
      color: #475569;
      margin-bottom: 8px;
    }}
    .day-stay {{
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #0f766e;
      background: #ccfbf1;
      border-radius: 999px;
      padding: 6px 10px;
      margin-bottom: 10px;
    }}
    .activity-list {{
      display: grid;
      gap: 8px;
    }}
    .activity {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 12px;
    }}
    .activity-name {{
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }}
    .activity-meta {{
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #14B8A6;
      margin-top: 3px;
    }}
    .activity-desc, .activity-empty {{
      font-size: 11px;
      color: #64748b;
      margin-top: 5px;
    }}
    .itinerary-empty {{
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      padding: 18px;
      color: #475569;
      margin-bottom: 22px;
    }}
    .pricing-box {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }}
    .pricing-row {{
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 13px;
      color: #475569;
    }}
    .pricing-row.total {{
      border-top: 2px solid #0f172a;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }}
    .notes {{
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #78350f;
    }}
    .terms {{
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
      font-size: 11px;
      color: #64748b;
    }}
    .terms ul {{
      margin-top: 8px;
      padding-left: 18px;
    }}
    .terms li {{
      margin-bottom: 4px;
    }}
    .footer {{
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name">NAMA OS</div>
      <div class="brand-tag">Travel Intelligence Platform</div>
    </div>
    <div class="header-meta">
      <div class="ref">{ref}</div>
      <div>Date: {created_str}</div>
      <div>Valid: {valid_str}</div>
    </div>
  </div>

  <div class="client-block">
    <div class="label">Prepared For</div>
    <div class="name">{esc(q.lead_name)}</div>
    <div class="dest">{esc(q.destination)}</div>
  </div>

  <div class="price-hero">
    <div>
      <div class="plabel">Total Package Value</div>
      <div class="pvalue">{fmt(total_price)}</div>
    </div>
    <div class="pstatus">{esc(str(q.status))}</div>
  </div>

  {'<div class="hero-gallery">' + hero_gallery + '</div>' if hero_gallery else ''}
  <div class="highlights">{highlights_html}</div>

  <div class="section-title">Day-wise Itinerary</div>
  {('<div class="itinerary-grid">' + ''.join(day_cards) + '</div>') if day_cards else f'<div class="itinerary-empty">{esc(q.destination)} package plan will be customised with your final routing, stays, and experiences.</div>'}

  <div class="section-title">Pricing Breakdown</div>
  <div class="pricing-box">
    <div class="pricing-row"><span>Subtotal (base cost)</span><span>{fmt(base_price)}</span></div>
    <div class="pricing-row"><span>Agency service &amp; markup ({margin_pct:.1f}%)</span><span>{fmt(margin_amt)}</span></div>
    <div class="pricing-row"><span>Taxes &amp; levies (est. GST 5% on margin)</span><span>{fmt(tax_amt)}</span></div>
    <div class="pricing-row total"><span>Total Payable</span><span>{fmt(total_price)}</span></div>
  </div>

  {notes_block}

  <div class="terms">
    <strong>Terms &amp; Conditions</strong>
    <ul>
      <li>This quotation is valid for {valid_days} days from the date of issue.</li>
      <li>Prices are subject to availability at the time of booking confirmation.</li>
      <li>A 30% advance deposit is required to confirm the booking.</li>
      <li>Cancellation policy applies as per supplier terms; details are available on request.</li>
      <li>International travel requires a valid passport with minimum 6 months validity.</li>
      <li>Visa requirements remain the responsibility of the traveller, with assistance available from NAMA.</li>
    </ul>
  </div>

  <div class="footer">
    NAMA OS · getnama.app · Powered by AI Travel Intelligence<br>
    Generated {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}
  </div>
</body>
</html>"""


def _generate_pdf_bytes(html: str) -> bytes:
    """Convert HTML to PDF bytes using WeasyPrint."""
    try:
        import weasyprint  # type: ignore
        return weasyprint.HTML(string=html).write_pdf()
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="WeasyPrint is not installed on this server. PDF generation unavailable.",
        )


# ── Existing endpoints ─────────────────────────────────────────────────────────

@router.post("/upload/passport", response_model=DocumentUploadResponse)
async def upload_passport(
    image_url: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a passport image and extract data via AI OCR (M4).
    Accepts an image URL or base64-encoded image data.
    """
    try:
        passport_data = await doc_agent.extract_passport_data(
            image_url, tenant_id=current_user.tenant_id, db=db
        )
        result = await doc_agent.validate_document(
            DocumentType.PASSPORT, passport_data.model_dump()
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/visa-checklist", response_model=Dict[str, Any])
async def get_visa_requirements(
    nationality: str,
    destination: str,
    current_user = Depends(get_current_user)
):
    """
    Get the mandatory visa checklist for a traveler (M4).
    """
    try:
        checklist = await doc_agent.get_visa_checklist(nationality, destination)
        return checklist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── New PDF + Email endpoints ──────────────────────────────────────────────────

@router.post(
    "/quotation-pdf",
    summary="Generate and download a quotation PDF",
)
def download_quotation_pdf(
    body:      QuotationPDFRequest,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_any_staff),
):
    """
    Generates a professional PDF for the given quotation and returns it as a
    binary download. Uses WeasyPrint server-side (no browser print dialog).
    """
    q = _get_or_404(db, body.quotation_id, tenant_id)
    itinerary = None
    if q.itinerary_id:
        itinerary = db.query(Itinerary).filter(
            Itinerary.id == q.itinerary_id,
            Itinerary.tenant_id == tenant_id,
        ).first()
    media_assets = db.query(MediaAssetModel).filter(
        MediaAssetModel.tenant_id == tenant_id
    ).all()
    html = _build_quotation_html(q, itinerary=itinerary, media_assets=media_assets)
    pdf_bytes = _generate_pdf_bytes(html)

    return Response(
        content    = pdf_bytes,
        media_type = "application/pdf",
        headers    = {
            "Content-Disposition": f'attachment; filename="quotation_{q.id}.pdf"',
            "Content-Length":      str(len(pdf_bytes)),
        },
    )


@router.post(
    "/send-quotation",
    summary="Email a quotation PDF to the client via Resend",
)
def send_quotation_email(
    body:      SendQuotationRequest,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_any_staff),
):
    """
    Generates the quotation PDF and emails it to the client using Resend.
    If RESEND_API_KEY is not configured, returns a 200 with success=false so
    the frontend can fall back gracefully (not a hard error).
    """
    resend_api_key = os.getenv("RESEND_API_KEY")
    if not resend_api_key:
        return {
            "success": False,
            "error": "Email not configured — PDF download available",
        }

    q = _get_or_404(db, body.quotation_id, tenant_id)
    itinerary = None
    if q.itinerary_id:
        itinerary = db.query(Itinerary).filter(
            Itinerary.id == q.itinerary_id,
            Itinerary.tenant_id == tenant_id,
        ).first()
    media_assets = db.query(MediaAssetModel).filter(
        MediaAssetModel.tenant_id == tenant_id
    ).all()
    html = _build_quotation_html(q, itinerary=itinerary, media_assets=media_assets)
    pdf_bytes = _generate_pdf_bytes(html)
    pdf_b64   = base64.b64encode(pdf_bytes).decode("utf-8")

    message   = body.message or "Please find your personalised travel quotation attached."
    ref       = f"NAMA-{q.id:06d}"

    email_html = f"""
    <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto">
      <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
        <div style="color:#14B8A6;font-weight:900;font-size:18px;letter-spacing:-0.5px">NAMA OS</div>
        <div style="color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Travel Intelligence Platform</div>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="margin:0 0 16px">Dear {q.lead_name},</p>
        <p style="margin:0 0 16px">{message}</p>
        <div style="background:#0f172a;border-radius:10px;padding:20px 24px;margin:24px 0">
          <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Total Package Value</div>
          <div style="color:#14B8A6;font-size:28px;font-weight:900;margin-top:6px">{q.currency} {float(q.total_price):,.2f}</div>
          <div style="color:#94a3b8;font-size:12px;margin-top:4px">{q.destination} · Ref: {ref}</div>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#475569">
          Your full quotation (PDF) is attached to this email. It is valid for 7 days from today.
        </p>
        <p style="margin:0;font-size:13px;color:#475569">
          Reply to this email or WhatsApp us to confirm your booking.
        </p>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
          NAMA OS · getnama.app · Powered by AI Travel Intelligence
        </div>
      </div>
    </div>"""

    try:
        import resend  # type: ignore
        resend.api_key = resend_api_key
        response = resend.Emails.send({
            "from":        "NAMA OS <quotes@namaos.com>",
            "to":          [body.client_email],
            "subject":     f"Your Travel Quotation — {q.destination} ({ref})",
            "html":        email_html,
            "attachments": [{
                "filename": f"quotation_{q.id}.pdf",
                "content":  pdf_b64,
            }],
        })
        logger.info(f"Quotation email sent: id={q.id} to={body.client_email}")
        return {
            "success":    True,
            "message_id": response.get("id") if isinstance(response, dict) else getattr(response, "id", None),
        }
    except Exception as e:
        logger.exception(f"Resend error for quotation {q.id}")
        return {
            "success": False,
            "error":   str(e),
        }


# ── Invoice PDF ────────────────────────────────────────────────────────────────

class InvoicePdfRequest(BaseModel):
    booking_id: int


class SendInvoiceRequest(BaseModel):
    booking_id: int
    email: str


def _build_invoice_html(booking: Booking, lead_name: str, destination: str, travel_dates: str, travelers: int) -> str:
    invoice_number = f"INV-{booking.tenant_id:04d}-{booking.id:06d}"
    issue_date = datetime.now().strftime("%d %b %Y")
    total_price = float(booking.total_price)
    base_price = round(total_price * 0.85, 2)
    gst = round(total_price * 0.15, 2) if booking.currency == "INR" else 0.0
    currency = booking.currency or "INR"
    status_val = booking.status.value if hasattr(booking.status, "value") else str(booking.status)
    is_paid = status_val in ("CONFIRMED", "COMPLETED")

    def fmt(amount: float) -> str:
        return f"{currency} {amount:,.2f}"

    paid_stamp = ""
    if is_paid:
        paid_stamp = """
        <div style="position:absolute;top:40px;right:40px;transform:rotate(-15deg);border:4px solid #16a34a;
                    color:#16a34a;font-size:36px;font-weight:900;letter-spacing:4px;padding:6px 18px;
                    border-radius:8px;opacity:0.35;text-transform:uppercase;pointer-events:none">
          PAID
        </div>"""

    gst_row = ""
    if gst > 0:
        gst_row = f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569">GST (18%)</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569">1</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;text-align:right">{fmt(gst)}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Tax Invoice {invoice_number}</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      padding: 48px;
      font-size: 13px;
      line-height: 1.5;
      position: relative;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #14B8A6;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }}
    .brand-name {{
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }}
    .brand-tag {{
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #14B8A6;
      margin-top: 2px;
    }}
    .doc-type {{
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #0f172a;
      background: #f1f5f9;
      padding: 4px 12px;
      border-radius: 6px;
      margin-top: 4px;
    }}
    .header-meta {{
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }}
    .header-meta .inv-number {{
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 2px;
    }}
    .bill-block {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }}
    .bill-block .label {{
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 4px;
    }}
    .bill-block .name {{
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }}
    .bill-block .sub {{
      font-size: 13px;
      color: #14B8A6;
      font-weight: 600;
      margin-top: 2px;
    }}
    .section-title {{
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 10px;
    }}
    table.items {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }}
    table.items th {{
      background: #f1f5f9;
      text-align: left;
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #64748b;
    }}
    table.items td {{
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }}
    table.items tr:last-child td {{
      border-bottom: none;
    }}
    .totals-box {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }}
    .totals-row {{
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 13px;
      color: #475569;
    }}
    .totals-row.grand {{
      border-top: 2px solid #0f172a;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
    }}
    .footer {{
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }}
  </style>
</head>
<body>
  <div style="position:relative">
    {paid_stamp}

    <!-- Header -->
    <div class="header">
      <div>
        <div class="brand-name">NAMA OS</div>
        <div class="brand-tag">Travel Intelligence Platform</div>
        <div class="doc-type">Tax Invoice</div>
      </div>
      <div class="header-meta">
        <div class="inv-number">{invoice_number}</div>
        <div>Date: {issue_date}</div>
      </div>
    </div>

    <!-- Bill To -->
    <div class="bill-block">
      <div class="label">Bill To</div>
      <div class="name">{lead_name}</div>
      <div class="sub">{destination}</div>
    </div>

    <!-- Trip Details -->
    <div class="section-title">Trip Details</div>
    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th>Travel Dates</th>
          <th>Travelers</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{destination} — Full Package</td>
          <td>{travel_dates or "As arranged"}</td>
          <td>{travelers} pax</td>
          <td style="text-align:right">{fmt(base_price)}</td>
        </tr>
        {gst_row}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="section-title">Invoice Summary</div>
    <div class="totals-box">
      <div class="totals-row"><span>Base Package</span><span>{fmt(base_price)}</span></div>
      {"<div class='totals-row'><span>GST (18%)</span><span>" + fmt(gst) + "</span></div>" if gst > 0 else ""}
      <div class="totals-row grand"><span>Total Payable</span><span>{fmt(total_price)}</span></div>
    </div>

    <!-- Footer -->
    <div class="footer">
      For questions, contact your travel consultant.<br>
      NAMA OS · getnama.app · Powered by AI Travel Intelligence<br>
      Generated {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}
    </div>
  </div>
</body>
</html>"""


def _fetch_booking_with_context(db: Session, booking_id: int, tenant_id: int):
    """Fetch booking + related lead data. Returns (booking, lead_name, destination, travel_dates, travelers)."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.tenant_id == tenant_id,
    ).first()
    if not booking:
        raise HTTPException(404, "Booking not found")

    # Try to get lead info for richer invoice
    lead_name = f"Client #{booking.lead_id}"
    destination = "Travel Package"
    travel_dates = ""
    travelers = 2

    try:
        from app.models.leads import Lead
        lead = db.query(Lead).filter(Lead.id == booking.lead_id).first()
        if lead:
            lead_name = lead.full_name or lead.sender_id or lead_name
            destination = lead.destination or destination
            travel_dates = lead.travel_dates or ""
            travelers = lead.travelers_count or travelers
    except Exception:
        pass

    return booking, lead_name, destination, travel_dates, travelers


def _normalize_phone(phone: Optional[str]) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def _send_whatsapp_packet_message(phone: str, client_name: str, booking_ref: str, destination: str) -> dict:
    token = os.getenv("WHATSAPP_TOKEN", "")
    phone_id = os.getenv("WHATSAPP_PHONE_ID", "")
    normalized = _normalize_phone(phone)
    if not normalized:
        return {"success": False, "demo": True, "error": "No WhatsApp number available"}
    if not token or not phone_id:
        logger.info("WhatsApp packet send skipped — demo mode | to=%s", normalized)
        return {"success": True, "demo": True, "message_id": "demo_whatsapp_packet"}

    payload = {
        "messaging_product": "whatsapp",
        "to": normalized,
        "type": "template",
        "template": {
            "name": "booking_confirmed",
            "language": {"code": "en"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": client_name.split(" ")[0] if client_name else "Traveller"},
                        {"type": "text", "text": destination or "your trip"},
                        {"type": "text", "text": datetime.now(timezone.utc).strftime("%d %b %Y")},
                        {"type": "text", "text": booking_ref},
                    ],
                }
            ],
        },
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"https://graph.facebook.com/v19.0/{phone_id}/messages",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            data = response.json()
            if response.status_code == 200:
                return {
                    "success": True,
                    "demo": False,
                    "message_id": data.get("messages", [{}])[0].get("id"),
                }
            return {
                "success": False,
                "demo": False,
                "error": data.get("error", {}).get("message", "WhatsApp send failed"),
            }
    except Exception as exc:
        logger.exception("WhatsApp packet send failed for %s", normalized)
        return {"success": False, "demo": False, "error": str(exc)}


def deliver_booking_packet(
    db: Session,
    tenant_id: int,
    booking_id: int,
    quotation_id: Optional[int] = None,
    email: Optional[str] = None,
    whatsapp: Optional[str] = None,
) -> dict:
    booking, lead_name, destination, travel_dates, travelers = _fetch_booking_with_context(
        db, booking_id, tenant_id
    )
    lead = db.query(Lead).filter(
        Lead.id == booking.lead_id,
        Lead.tenant_id == tenant_id,
    ).first()

    target_email = email or getattr(lead, "email", None)
    target_whatsapp = whatsapp or getattr(lead, "phone", None) or getattr(lead, "sender_id", None)

    invoice_html = _build_invoice_html(booking, lead_name, destination, travel_dates, travelers)
    invoice_pdf = _generate_pdf_bytes(invoice_html)

    from app.core.pdf_engine import generate_pdf as _generate_doc_pdf, DocumentType as _DT

    booking_ref = f"BK-{booking.id:05d}"
    ctx = {
        "agency_name": "NAMA Travel",
        "agency_email": "accounts@namatravel.com",
        "currency": getattr(booking, "currency", "INR") or "INR",
        "booking_ref": booking_ref,
        "client_name": lead_name,
        "destination": destination,
        "travel_dates": travel_dates or "As arranged",
        "pax": travelers or 1,
        "hotel": getattr(booking, "hotel_name", "") or "",
        "room_type": getattr(booking, "room_type", "Standard") or "Standard",
        "meal_plan": getattr(booking, "meal_plan", "Bed & Breakfast") or "Bed & Breakfast",
        "nights": getattr(booking, "nights", "—") or "—",
        "total": float(getattr(booking, "total_price", 0) or 0),
        "amount_paid": float(getattr(booking, "amount_paid", 0) or 0),
        "balance_due": float(getattr(booking, "balance_due", 0) or 0),
        "doc_date": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "inclusions": getattr(booking, "inclusions", "As per signed quotation.") or "As per signed quotation.",
        "vendor_confirmation": getattr(booking, "vendor_confirmation_no", "PENDING") or "PENDING",
    }
    confirmation_pdf = _generate_doc_pdf(_DT.BOOKING_CONFIRMATION, {
        **ctx,
        "doc_number": f"BC-{booking.id:05d}",
        "payment_due_date": ctx["doc_date"],
    })
    voucher_pdf = _generate_doc_pdf(_DT.VOUCHER, {
        **ctx,
        "doc_number": f"VCH-{booking.id:05d}",
        "services": "Airport transfers, daily breakfast, guided city tour on Day 3. See full itinerary.",
    })

    if invoice_pdf is None or confirmation_pdf is None or voucher_pdf is None:
        raise HTTPException(status_code=503, detail="Booking packet could not be generated.")

    email_result = {"success": False, "demo": False, "error": "No email address available"}
    resend_api_key = os.getenv("RESEND_API_KEY")
    if target_email:
        if resend_api_key:
            try:
                import resend  # type: ignore
                resend.api_key = resend_api_key
                response = resend.Emails.send({
                    "from": os.getenv("RESEND_FROM_EMAIL", "NAMA OS <quotes@namaos.com>"),
                    "to": [target_email],
                    "subject": f"Your booking documents are ready — {destination} ({booking_ref})",
                    "html": f"""
                    <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:620px;margin:0 auto">
                      <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
                        <div style="color:#14B8A6;font-weight:900;font-size:18px;letter-spacing:-0.5px">NAMA OS</div>
                        <div style="color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Travel Intelligence Platform</div>
                      </div>
                      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
                        <p style="margin:0 0 16px">Dear {html.escape(lead_name)},</p>
                        <p style="margin:0 0 16px">Your live booking packet for <strong>{html.escape(destination or 'your trip')}</strong> is ready.</p>
                        <p style="margin:0 0 16px">We’ve attached your invoice, booking confirmation, and voucher so your trip handoff stays seamless.</p>
                        <p style="margin:0;font-size:13px;color:#475569">Booking ref: <strong>{booking_ref}</strong></p>
                      </div>
                    </div>""",
                    "attachments": [
                        {"filename": f"invoice-INV-{tenant_id:04d}-{booking.id:06d}.pdf", "content": base64.b64encode(invoice_pdf).decode("utf-8")},
                        {"filename": f"booking-confirmation-{booking.id}.pdf", "content": base64.b64encode(confirmation_pdf).decode("utf-8")},
                        {"filename": f"voucher-{booking.id}.pdf", "content": base64.b64encode(voucher_pdf).decode("utf-8")},
                    ],
                })
                email_result = {
                    "success": True,
                    "demo": False,
                    "message_id": response.get("id") if isinstance(response, dict) else getattr(response, "id", None),
                }
            except Exception as exc:
                logger.exception("Booking packet email failed for booking %s", booking.id)
                email_result = {"success": False, "demo": False, "error": str(exc)}
        else:
            email_result = {"success": True, "demo": True, "message_id": "demo_email_packet"}

    whatsapp_result = _send_whatsapp_packet_message(target_whatsapp, lead_name, booking_ref, destination)

    if lead:
        existing = (lead.notes or "").strip()
        note = (
            f"[NAMA NOTE] {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} | Dynamix Automation | "
            f"Booking packet delivery attempted for {booking_ref}. "
            f"Email={'sent' if email_result.get('success') else 'not sent'}; "
            f"WhatsApp={'sent' if whatsapp_result.get('success') else 'not sent'}."
        )
        lead.notes = f"{existing}\n\n{note}".strip() if existing else note
        lead.updated_at = datetime.now(timezone.utc)
        db.commit()

    return {
        "success": bool(email_result.get("success") or whatsapp_result.get("success")),
        "booking_id": booking.id,
        "quotation_id": quotation_id,
        "delivery": {
            "email": email_result,
            "whatsapp": whatsapp_result,
        },
        "contacts": {
            "email": target_email,
            "whatsapp": target_whatsapp,
        },
    }


@router.post(
    "/booking-packet",
    summary="Prepare the real booking document packet for a booking",
)
def prepare_booking_packet(
    body: BookingPacketRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_any_staff),
):
    """
    Preflight the real operational document packet for a booking.
    Generates invoice, booking confirmation, and voucher PDFs server-side and
    returns status metadata so the frontend can hand off into Documents/Finance
    without relying on seed/manual UI states.
    """
    booking, lead_name, destination, travel_dates, travelers = _fetch_booking_with_context(
        db, body.booking_id, tenant_id
    )

    invoice_html = _build_invoice_html(booking, lead_name, destination, travel_dates, travelers)
    invoice_pdf = _generate_pdf_bytes(invoice_html)

    from app.core.pdf_engine import generate_pdf as _generate_doc_pdf, DocumentType as _DT

    ctx = {
        "agency_name": "NAMA Travel",
        "agency_email": "accounts@namatravel.com",
        "currency": getattr(booking, "currency", "INR") or "INR",
        "booking_ref": f"BK-{booking.id:05d}",
        "client_name": lead_name,
        "destination": destination,
        "travel_dates": travel_dates or "As arranged",
        "pax": travelers or 1,
        "hotel": getattr(booking, "hotel_name", "") or "",
        "room_type": getattr(booking, "room_type", "Standard") or "Standard",
        "meal_plan": getattr(booking, "meal_plan", "Bed & Breakfast") or "Bed & Breakfast",
        "nights": getattr(booking, "nights", "—") or "—",
        "total": float(getattr(booking, "total_price", 0) or 0),
        "amount_paid": float(getattr(booking, "amount_paid", 0) or 0),
        "balance_due": float(getattr(booking, "balance_due", 0) or 0),
        "doc_date": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "inclusions": getattr(booking, "inclusions", "As per signed quotation.") or "As per signed quotation.",
        "vendor_confirmation": getattr(booking, "vendor_confirmation_no", "PENDING") or "PENDING",
    }
    confirmation_ctx = {
        **ctx,
        "doc_number": f"BC-{booking.id:05d}",
        "payment_due_date": ctx["doc_date"],
    }
    voucher_ctx = {
        **ctx,
        "doc_number": f"VCH-{booking.id:05d}",
        "services": "Airport transfers, daily breakfast, guided city tour on Day 3. See full itinerary.",
    }

    confirmation_pdf = _generate_doc_pdf(_DT.BOOKING_CONFIRMATION, confirmation_ctx)
    voucher_pdf = _generate_doc_pdf(_DT.VOUCHER, voucher_ctx)

    if invoice_pdf is None or confirmation_pdf is None or voucher_pdf is None:
        raise HTTPException(
            status_code=503,
            detail="Booking packet could not be generated because PDF rendering is unavailable.",
        )

    return {
        "success": True,
        "booking_id": booking.id,
        "quotation_id": body.quotation_id,
        "lead_name": lead_name,
        "destination": destination,
        "documents": {
            "invoice": {
                "ready": True,
                "filename": f"invoice-INV-{tenant_id:04d}-{booking.id:06d}.pdf",
            },
            "confirmation": {
                "ready": True,
                "filename": f"booking-confirmation-{booking.id}.pdf",
            },
            "voucher": {
                "ready": True,
                "filename": f"voucher-{booking.id}.pdf",
            },
        },
        "ops_handoff": {
            "documents_url": f"/dashboard/documents?bookingId={booking.id}"
            + (f"&quotationId={body.quotation_id}" if body.quotation_id else "")
            + (f"&destination={destination}" if destination else ""),
            "finance_url": f"/dashboard/finance?bookingId={booking.id}"
            + (f"&quotationId={body.quotation_id}" if body.quotation_id else "")
            + (f"&destination={destination}" if destination else ""),
        },
    }


@router.post(
    "/send-booking-packet",
    summary="Send the live booking packet to the client via email and WhatsApp",
)
def send_booking_packet(
    body: SendBookingPacketRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_any_staff),
):
    """
    Generates the live invoice, booking confirmation, and voucher, then attempts
    outbound delivery using the lead's email and WhatsApp number.
    """
    return deliver_booking_packet(
        db=db,
        tenant_id=tenant_id,
        booking_id=body.booking_id,
        quotation_id=body.quotation_id,
        email=body.email,
        whatsapp=body.whatsapp,
    )


@router.post(
    "/invoice-pdf",
    summary="Generate and download a tax invoice PDF for a confirmed booking",
)
def download_invoice_pdf(
    body: InvoicePdfRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_any_staff),
):
    """
    Generates a professional Tax Invoice PDF for the given confirmed booking
    and returns it as a binary download. Uses WeasyPrint server-side.
    """
    booking, lead_name, destination, travel_dates, travelers = _fetch_booking_with_context(
        db, body.booking_id, tenant_id
    )
    invoice_number = f"INV-{tenant_id:04d}-{booking.id:06d}"
    html = _build_invoice_html(booking, lead_name, destination, travel_dates, travelers)
    pdf_bytes = _generate_pdf_bytes(html)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice-{invoice_number}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.post(
    "/send-invoice",
    summary="Email a tax invoice PDF to the client via Resend",
)
def send_invoice_email(
    body: SendInvoiceRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_any_staff),
):
    """
    Generates the invoice PDF and emails it to the specified address using Resend.
    Returns success=false gracefully if RESEND_API_KEY is not configured.
    """
    resend_api_key = os.getenv("RESEND_API_KEY")
    if not resend_api_key:
        return {
            "success": False,
            "error": "Email not configured — PDF download available",
        }

    booking, lead_name, destination, travel_dates, travelers = _fetch_booking_with_context(
        db, body.booking_id, tenant_id
    )
    invoice_number = f"INV-{tenant_id:04d}-{booking.id:06d}"
    html = _build_invoice_html(booking, lead_name, destination, travel_dates, travelers)
    pdf_bytes = _generate_pdf_bytes(html)
    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
    total_fmt = f"{booking.currency} {float(booking.total_price):,.2f}"

    email_html = f"""
    <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto">
      <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
        <div style="color:#14B8A6;font-weight:900;font-size:18px;letter-spacing:-0.5px">NAMA OS</div>
        <div style="color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Travel Intelligence Platform</div>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p style="margin:0 0 16px">Dear {lead_name},</p>
        <p style="margin:0 0 16px">Please find your tax invoice attached for your upcoming trip to <strong>{destination}</strong>.</p>
        <div style="background:#0f172a;border-radius:10px;padding:20px 24px;margin:24px 0">
          <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Invoice Total</div>
          <div style="color:#14B8A6;font-size:28px;font-weight:900;margin-top:6px">{total_fmt}</div>
          <div style="color:#94a3b8;font-size:12px;margin-top:4px">{destination} · Invoice: {invoice_number}</div>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#475569">
          Your full invoice (PDF) is attached to this email. Please retain it for your records.
        </p>
        <p style="margin:0;font-size:13px;color:#475569">
          Reply to this email if you have any questions about your booking.
        </p>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
          NAMA OS · getnama.app · Powered by AI Travel Intelligence
        </div>
      </div>
    </div>"""

    try:
        import resend  # type: ignore
        resend.api_key = resend_api_key
        response = resend.Emails.send({
            "from": "NAMA OS <invoices@namaos.com>",
            "to": [body.email],
            "subject": f"Your Travel Invoice — {destination} ({invoice_number})",
            "html": email_html,
            "attachments": [{
                "filename": f"invoice-{invoice_number}.pdf",
                "content": pdf_b64,
            }],
        })
        logger.info(f"Invoice email sent: booking={booking.id} to={body.email}")
        return {
            "success": True,
            "message_id": response.get("id") if isinstance(response, dict) else getattr(response, "id", None),
        }
    except Exception as e:
        logger.exception(f"Resend error for invoice booking {booking.id}")
        return {
            "success": False,
            "error": str(e),
        }
