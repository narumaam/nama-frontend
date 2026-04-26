import base64
import io
import logging
import os
from datetime import datetime, timezone
from typing import Optional

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


# ── HTML template ──────────────────────────────────────────────────────────────

def _build_quotation_html(q: Quotation) -> str:
    base_price  = float(q.base_price)
    margin_pct  = float(q.margin_pct)
    total_price = float(q.total_price)
    margin_amt  = total_price - base_price
    tax_rate    = 0.05  # 5% GST on margin (display only)
    tax_amt     = round(margin_amt * tax_rate, 2)

    def fmt(amount: float) -> str:
        return f"{q.currency} {amount:,.2f}"

    created_str = q.created_at.strftime("%d %B %Y")
    ref         = f"NAMA-{q.id:06d}"
    valid_days  = 7
    valid_str   = (
        q.valid_until.strftime("%d %B %Y")
        if q.valid_until
        else "7 days from issue date"
    )
    notes_block = ""
    if q.notes:
        escaped = q.notes.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        notes_block = f"""
        <div class="notes">
          <strong>Notes &amp; Inclusions:</strong><br>
          {escaped.replace(chr(10), "<br>")}
        </div>"""

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
      padding: 48px;
      font-size: 13px;
      line-height: 1.5;
    }}
    /* Header */
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
    /* Client block */
    .client-block {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
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
    /* Totals hero */
    .price-hero {{
      background: #0f172a;
      border-radius: 16px;
      padding: 28px 32px;
      margin-bottom: 28px;
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
      font-size: 34px;
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
    /* Itinerary table */
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
      font-size: 12px;
    }}
    table.items tr:last-child td {{
      border-bottom: none;
    }}
    /* Pricing breakdown */
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
    /* Notes */
    .notes {{
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #78350f;
    }}
    /* Terms */
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
    /* Footer */
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
  <!-- Header -->
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

  <!-- Client -->
  <div class="client-block">
    <div class="label">Prepared For</div>
    <div class="name">{q.lead_name}</div>
    <div class="dest">{q.destination}</div>
  </div>

  <!-- Total hero -->
  <div class="price-hero">
    <div>
      <div class="plabel">Total Package Value</div>
      <div class="pvalue">{fmt(total_price)}</div>
    </div>
    <div class="pstatus">{q.status}</div>
  </div>

  <!-- Itinerary summary -->
  <div class="section-title">Itinerary Summary</div>
  <table class="items">
    <thead>
      <tr>
        <th style="width:10%">Day</th>
        <th style="width:50%">Description</th>
        <th style="width:25%">Category</th>
        <th style="width:15%;text-align:right">Cost</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1–N</td>
        <td>{q.destination} — Full Package</td>
        <td>Travel &amp; Accommodation</td>
        <td style="text-align:right">{fmt(base_price)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Pricing breakdown -->
  <div class="section-title">Pricing Breakdown</div>
  <div class="pricing-box">
    <div class="pricing-row"><span>Subtotal (base cost)</span><span>{fmt(base_price)}</span></div>
    <div class="pricing-row"><span>Agency service &amp; markup ({margin_pct:.1f}%)</span><span>{fmt(margin_amt)}</span></div>
    <div class="pricing-row"><span>Taxes &amp; levies (est. GST 5% on margin)</span><span>{fmt(tax_amt)}</span></div>
    <div class="pricing-row total"><span>Total Payable</span><span>{fmt(total_price)}</span></div>
  </div>

  {notes_block}

  <!-- Terms -->
  <div class="terms">
    <strong>Terms &amp; Conditions</strong>
    <ul>
      <li>This quotation is valid for {valid_days} days from the date of issue.</li>
      <li>Prices are subject to availability at the time of booking confirmation.</li>
      <li>A 30% advance deposit is required to confirm the booking.</li>
      <li>Cancellation policy applies as per supplier terms — details available on request.</li>
      <li>International travel requires a valid passport with minimum 6 months validity.</li>
      <li>Visa requirements are the responsibility of the traveller; assistance available.</li>
    </ul>
  </div>

  <!-- Footer -->
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
    q         = _get_or_404(db, body.quotation_id, tenant_id)
    html      = _build_quotation_html(q)
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

    q         = _get_or_404(db, body.quotation_id, tenant_id)
    html      = _build_quotation_html(q)
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
    currency = booking.currency or "INR"

    # Tier 9D: tax rate is tenant-configurable.
    # The customer admin / finance role sets:
    #   tenant.settings["tax_rate_pct"]  — e.g. 18 (GST), 5 (transport), 0 (export)
    #   tenant.settings["tax_label"]     — e.g. "GST", "IGST", "CGST+SGST", "VAT"
    # If neither is set, NO tax line appears on the invoice — admin must
    # explicitly configure their rate. Better to show tax-exclusive total
    # than to silently invent a rate that may not apply to the customer's
    # business or jurisdiction.
    tax_rate_pct = 0.0
    tax_label = "Tax"
    try:
        from sqlalchemy.orm import object_session
        sess = object_session(booking)
        if sess is not None:
            from app.models.auth import Tenant as _Tenant
            tenant_row = sess.query(_Tenant).filter(_Tenant.id == booking.tenant_id).first()
            if tenant_row and tenant_row.settings:
                raw_rate = tenant_row.settings.get("tax_rate_pct")
                if raw_rate is not None:
                    tax_rate_pct = float(raw_rate)
                tax_label = tenant_row.settings.get("tax_label", "Tax")
    except Exception:
        # If settings can't be read, default to no tax line — better to be
        # silent than to show a wrong rate.
        pass

    tax_rate = tax_rate_pct / 100.0
    if tax_rate > 0:
        # total is tax-inclusive (matches the price the customer agreed to).
        base_price = round(total_price / (1 + tax_rate), 2)
        gst = round(total_price - base_price, 2)
    else:
        base_price = total_price
        gst = 0.0
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

    # Tier 9D: render the configured tax label + actual rate from tenant settings.
    gst_row = ""
    tax_display = f"{tax_label} ({tax_rate_pct:g}%)" if tax_rate_pct > 0 else tax_label
    if gst > 0:
        gst_row = f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569">{tax_display}</td>
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
      {"<div class='totals-row'><span>" + tax_display + "</span><span>" + fmt(gst) + "</span></div>" if gst > 0 else ""}
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
