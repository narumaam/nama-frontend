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
