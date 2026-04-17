"""
NAMA PDF Document Engine  v1.0
================================
Generates all 8 trip-lifecycle documents:

  1. Proforma Invoice      — /bookings/{id}/proforma/pdf
  2. Invoice               — /finance/invoice/{id}/pdf
  3. Receipt               — /finance/receipt/{id}/pdf
  4. Booking Confirmation  — /bookings/{id}/confirmation/pdf
  5. Travel Voucher        — /bookings/{id}/voucher/pdf
  6. Refund Note           — /finance/refund/{id}/pdf
  7. Amendment Letter      — /bookings/{id}/amendment/pdf
  8. Vendor Payout Stmt    — /finance/vendor-payout/{id}/pdf

Uses WeasyPrint for PDF generation; falls back to HTML download if WeasyPrint
is not installed (dev environments).

Usage:
    from app.core.pdf_engine import generate_pdf, DocumentType
    pdf_bytes = generate_pdf(DocumentType.INVOICE, context_dict)
    # or
    html_str = render_document_html(DocumentType.INVOICE, context_dict)
"""

from __future__ import annotations
import io
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

# ── NAMA brand tokens ────────────────────────────────────────────────────────
BRAND_COLOR  = "#14B8A6"
BRAND_DARK   = "#0F172A"
BRAND_LIGHT  = "#F8FAFC"

# ── Shared CSS ───────────────────────────────────────────────────────────────
BASE_CSS = f"""
  @page {{
    size: A4;
    margin: 18mm 16mm;
    @bottom-right {{
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9pt;
      color: #94a3b8;
    }}
  }}
  * {{ box-sizing: border-box; }}
  body {{
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: {BRAND_DARK};
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 3px solid {BRAND_COLOR};
    margin-bottom: 18px;
  }}
  .logo-block {{ display: flex; align-items: center; gap: 10px; }}
  .logo-square {{
    width: 36px; height: 36px;
    background: {BRAND_COLOR};
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18pt; font-weight: 900; color: {BRAND_DARK};
  }}
  .company-name {{ font-size: 17pt; font-weight: 900; color: {BRAND_DARK}; }}
  .company-sub  {{ font-size: 8pt; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; }}
  .doc-title {{
    text-align: right;
  }}
  .doc-title h2 {{
    font-size: 22pt; font-weight: 900;
    color: {BRAND_COLOR}; margin: 0 0 4px;
    text-transform: uppercase; letter-spacing: 0.05em;
  }}
  .doc-title .doc-meta {{ font-size: 9pt; color: #64748b; }}
  .party-row {{
    display: flex; gap: 20px; margin: 16px 0;
  }}
  .party-box {{
    flex: 1;
    background: {BRAND_LIGHT};
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
  }}
  .party-box .label {{
    font-size: 8pt; font-weight: 700; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 4px;
  }}
  .party-box .name {{ font-size: 12pt; font-weight: 700; }}
  .party-box .detail {{ font-size: 9pt; color: #475569; }}
  table.items {{
    width: 100%; border-collapse: collapse; margin: 16px 0;
  }}
  table.items thead tr {{
    background: {BRAND_DARK}; color: white;
  }}
  table.items thead th {{
    padding: 8px 12px; text-align: left; font-size: 9pt;
    text-transform: uppercase; letter-spacing: 0.06em;
    font-weight: 700;
  }}
  table.items tbody tr {{ border-bottom: 1px solid #f1f5f9; }}
  table.items tbody tr:nth-child(even) {{ background: {BRAND_LIGHT}; }}
  table.items td {{ padding: 8px 12px; font-size: 10pt; }}
  table.items td.right {{ text-align: right; }}
  .totals-block {{
    margin-left: auto; width: 260px; margin-top: 8px;
  }}
  .totals-row {{
    display: flex; justify-content: space-between;
    padding: 5px 12px; font-size: 10pt;
  }}
  .totals-row.total {{
    background: {BRAND_COLOR}; color: white;
    border-radius: 6px; font-weight: 900;
    font-size: 12pt; margin-top: 4px;
  }}
  .totals-row.subtotal {{ color: #475569; }}
  .badge {{
    display: inline-block;
    padding: 3px 10px; border-radius: 20px;
    font-size: 9pt; font-weight: 700;
  }}
  .badge-green {{ background: #d1fae5; color: #065f46; }}
  .badge-amber {{ background: #fef3c7; color: #92400e; }}
  .badge-red   {{ background: #fee2e2; color: #991b1b; }}
  .badge-blue  {{ background: #dbeafe; color: #1e40af; }}
  .badge-teal  {{ background: #ccfbf1; color: #0f766e; }}
  .section-title {{
    font-size: 10pt; font-weight: 700;
    color: #475569; text-transform: uppercase;
    letter-spacing: 0.08em; margin: 18px 0 8px;
    padding-bottom: 4px; border-bottom: 1px solid #e2e8f0;
  }}
  .info-grid {{
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px 24px; font-size: 10pt;
  }}
  .info-grid .key {{ color: #64748b; font-size: 9pt; }}
  .info-grid .val {{ font-weight: 600; }}
  .note-box {{
    background: #fefce8; border: 1px solid #fde68a;
    border-radius: 8px; padding: 12px 14px;
    font-size: 9.5pt; color: #78350f; margin: 12px 0;
  }}
  .footer {{
    margin-top: 28px; padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex; justify-content: space-between;
    align-items: flex-end; font-size: 8.5pt; color: #94a3b8;
  }}
  .footer-left {{ max-width: 55%; }}
  .footer-right {{ text-align: right; }}
  .stamp-paid {{
    display: inline-block;
    border: 3px solid #16a34a; color: #16a34a;
    font-size: 22pt; font-weight: 900;
    padding: 4px 18px; border-radius: 4px;
    transform: rotate(-15deg);
    opacity: 0.7;
    margin-top: 8px;
  }}
"""

# ── Document type enum ────────────────────────────────────────────────────────

class DocumentType(str, Enum):
    PROFORMA_INVOICE     = "proforma_invoice"
    INVOICE              = "invoice"
    RECEIPT              = "receipt"
    BOOKING_CONFIRMATION = "booking_confirmation"
    VOUCHER              = "voucher"
    REFUND_NOTE          = "refund_note"
    AMENDMENT            = "amendment"
    VENDOR_PAYOUT        = "vendor_payout"

DOC_TITLES = {
    DocumentType.PROFORMA_INVOICE:     "Proforma Invoice",
    DocumentType.INVOICE:              "Tax Invoice",
    DocumentType.RECEIPT:              "Payment Receipt",
    DocumentType.BOOKING_CONFIRMATION: "Booking Confirmation",
    DocumentType.VOUCHER:              "Travel Voucher",
    DocumentType.REFUND_NOTE:          "Refund Note",
    DocumentType.AMENDMENT:            "Amendment Letter",
    DocumentType.VENDOR_PAYOUT:        "Vendor Payout Statement",
}

# ── HTML Templates ─────────────────────────────────────────────────────────────

def _header_html(doc_type: DocumentType, ctx: Dict[str, Any]) -> str:
    """Shared header used across all documents."""
    now = datetime.now(timezone.utc).strftime("%d %b %Y")
    agency  = ctx.get("agency_name", "NAMA Travel")
    tagline = ctx.get("agency_tagline", "Your World, Our Expertise")
    doc_no  = ctx.get("doc_number", "—")
    doc_date = ctx.get("doc_date", now)
    title = DOC_TITLES[doc_type]
    return f"""
    <div class="header">
      <div class="logo-block">
        <div class="logo-square">N</div>
        <div>
          <div class="company-name">{agency}</div>
          <div class="company-sub">{tagline}</div>
        </div>
      </div>
      <div class="doc-title">
        <h2>{title}</h2>
        <div class="doc-meta">
          <div><strong>#{doc_no}</strong></div>
          <div>Date: {doc_date}</div>
        </div>
      </div>
    </div>
"""

def _footer_html(ctx: Dict[str, Any]) -> str:
    agency = ctx.get("agency_name", "NAMA Travel")
    gstin  = ctx.get("agency_gstin", "")
    now    = datetime.now(timezone.utc).strftime("%d %b %Y %H:%M UTC")
    return f"""
    <div class="footer">
      <div class="footer-left">
        <strong>{agency}</strong><br>
        {f"GSTIN: {gstin}<br>" if gstin else ""}
        For queries: {ctx.get("agency_email", "accounts@namatravel.com")} · {ctx.get("agency_phone", "")}
      </div>
      <div class="footer-right">
        Generated by NAMA OS<br>{now}
      </div>
    </div>
"""

def _party_row(ctx: Dict[str, Any]) -> str:
    client_name  = ctx.get("client_name", "—")
    client_email = ctx.get("client_email", "")
    client_phone = ctx.get("client_phone", "")
    client_gstin = ctx.get("client_gstin", "")
    agency_addr  = ctx.get("agency_address", "")
    return f"""
    <div class="party-row">
      <div class="party-box">
        <div class="label">Bill To</div>
        <div class="name">{client_name}</div>
        <div class="detail">{client_email}</div>
        {f'<div class="detail">{client_phone}</div>' if client_phone else ""}
        {f'<div class="detail">GSTIN: {client_gstin}</div>' if client_gstin else ""}
      </div>
      <div class="party-box">
        <div class="label">Bill From</div>
        <div class="name">{ctx.get("agency_name", "NAMA Travel")}</div>
        <div class="detail">{agency_addr}</div>
        {f'<div class="detail">GSTIN: {ctx.get("agency_gstin", "")}</div>' if ctx.get("agency_gstin") else ""}
      </div>
    </div>
"""

def _items_table(items: list, currency: str = "INR") -> str:
    fmt = lambda n: f"₹{float(n):,.2f}" if currency == "INR" else f"{currency} {float(n):,.2f}"
    rows = ""
    for it in items:
        rows += f"""
        <tr>
          <td>{it.get("description", "")}</td>
          <td class="right">{it.get("qty", 1)}</td>
          <td class="right">{fmt(it.get("unit_price", 0))}</td>
          <td class="right">{fmt(it.get("amount", 0))}</td>
        </tr>"""
    return f"""
    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
"""

def _totals_block(ctx: Dict[str, Any], currency: str = "INR") -> str:
    fmt = lambda n: f"₹{float(n):,.2f}" if currency == "INR" else f"{currency} {float(n):,.2f}"
    subtotal = ctx.get("subtotal", 0)
    discount = ctx.get("discount", 0)
    gst      = ctx.get("gst", 0)
    total    = ctx.get("total", subtotal)
    lines = [f'<div class="totals-row subtotal"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>']
    if discount:
        lines.append(f'<div class="totals-row subtotal"><span>Discount</span><span>−{fmt(discount)}</span></div>')
    if gst:
        lines.append(f'<div class="totals-row subtotal"><span>GST (18%)</span><span>{fmt(gst)}</span></div>')
    lines.append(f'<div class="totals-row total"><span>Total</span><span>{fmt(total)}</span></div>')
    return f'<div class="totals-block">{"".join(lines)}</div>'


# ── Per-document renderers ─────────────────────────────────────────────────────

def _render_invoice_family(doc_type: DocumentType, ctx: Dict[str, Any]) -> str:
    """Covers INVOICE, PROFORMA_INVOICE — both share the same layout."""
    currency = ctx.get("currency", "INR")
    items    = ctx.get("items", [{"description": ctx.get("destination", "Travel Package"),
                                   "qty": 1,
                                   "unit_price": ctx.get("total", 0),
                                   "amount": ctx.get("total", 0)}])
    status_html = ""
    if doc_type == DocumentType.INVOICE:
        paid = ctx.get("paid", False)
        status_html = (
            f'<div class="stamp-paid">PAID</div>' if paid
            else f'<span class="badge badge-amber">PAYMENT DUE · {ctx.get("due_date", "")}</span>'
        )

    return f"""
    {_header_html(doc_type, ctx)}
    {_party_row(ctx)}
    <div class="section-title">Items</div>
    {_items_table(items, currency)}
    {_totals_block(ctx, currency)}
    {status_html}
    {_footer_html(ctx)}
"""

def _render_receipt(ctx: Dict[str, Any]) -> str:
    fmt = lambda n: f"₹{float(n):,.2f}" if ctx.get("currency", "INR") == "INR" else f"{ctx.get('currency')} {float(n):,.2f}"
    return f"""
    {_header_html(DocumentType.RECEIPT, ctx)}
    {_party_row(ctx)}
    <div class="section-title">Payment Details</div>
    <div class="info-grid">
      <div><div class="key">Amount Received</div><div class="val" style="font-size:18pt;color:{BRAND_COLOR}">{fmt(ctx.get("amount_paid", 0))}</div></div>
      <div><div class="key">Payment Date</div><div class="val">{ctx.get("payment_date", "")}</div></div>
      <div><div class="key">Payment Method</div><div class="val">{ctx.get("payment_method", "Bank Transfer")}</div></div>
      <div><div class="key">Transaction Ref</div><div class="val">{ctx.get("transaction_ref", "—")}</div></div>
      <div><div class="key">Booking Ref</div><div class="val">{ctx.get("booking_ref", "—")}</div></div>
      <div><div class="key">Balance Due</div><div class="val">{fmt(ctx.get("balance_due", 0))}</div></div>
    </div>
    <div style="text-align:center;margin:24px 0">
      <div class="stamp-paid">RECEIVED</div>
    </div>
    {_footer_html(ctx)}
"""

def _render_booking_confirmation(ctx: Dict[str, Any]) -> str:
    fmt = lambda n: f"₹{float(n):,.2f}"
    return f"""
    {_header_html(DocumentType.BOOKING_CONFIRMATION, ctx)}
    <div style="background:{BRAND_COLOR};color:white;border-radius:10px;padding:16px 20px;margin:12px 0">
      <div style="font-size:14pt;font-weight:900">🎉 Booking Confirmed!</div>
      <div style="font-size:10pt;opacity:0.85;margin-top:4px">Booking Ref: <strong>{ctx.get("booking_ref", "—")}</strong></div>
    </div>
    <div class="section-title">Traveller Details</div>
    <div class="info-grid">
      <div><div class="key">Name</div><div class="val">{ctx.get("client_name", "—")}</div></div>
      <div><div class="key">Destination</div><div class="val">{ctx.get("destination", "—")}</div></div>
      <div><div class="key">Travel Dates</div><div class="val">{ctx.get("travel_dates", "—")}</div></div>
      <div><div class="key">Pax</div><div class="val">{ctx.get("pax", 1)} pax</div></div>
      <div><div class="key">Hotel</div><div class="val">{ctx.get("hotel", "—")}</div></div>
      <div><div class="key">Meal Plan</div><div class="val">{ctx.get("meal_plan", "—")}</div></div>
    </div>
    <div class="section-title">Inclusions</div>
    <div style="font-size:10pt;color:#475569">{ctx.get("inclusions", "As per quotation agreed upon.")}</div>
    <div class="section-title">Payment Summary</div>
    <div class="info-grid">
      <div><div class="key">Total Amount</div><div class="val">{fmt(ctx.get("total", 0))}</div></div>
      <div><div class="key">Amount Paid</div><div class="val" style="color:#16a34a">{fmt(ctx.get("amount_paid", 0))}</div></div>
      <div><div class="key">Balance Due</div><div class="val" style="color:#dc2626">{fmt(ctx.get("balance_due", 0))}</div></div>
      <div><div class="key">Due Date</div><div class="val">{ctx.get("payment_due_date", "")}</div></div>
    </div>
    {_footer_html(ctx)}
"""

def _render_voucher(ctx: Dict[str, Any]) -> str:
    return f"""
    {_header_html(DocumentType.VOUCHER, ctx)}
    <div style="border:2px solid {BRAND_COLOR};border-radius:12px;padding:16px 20px;margin:12px 0">
      <div style="font-size:13pt;font-weight:900;color:{BRAND_COLOR}">✈ Travel Voucher</div>
      <div style="font-size:9pt;color:#475569;margin-top:4px">Present this voucher at check-in. Valid only with government-issued ID.</div>
    </div>
    <div class="section-title">Guest & Trip Details</div>
    <div class="info-grid">
      <div><div class="key">Guest Name</div><div class="val">{ctx.get("client_name", "—")}</div></div>
      <div><div class="key">Booking Ref</div><div class="val">{ctx.get("booking_ref", "—")}</div></div>
      <div><div class="key">Destination</div><div class="val">{ctx.get("destination", "—")}</div></div>
      <div><div class="key">Travel Dates</div><div class="val">{ctx.get("travel_dates", "—")}</div></div>
      <div><div class="key">Property</div><div class="val">{ctx.get("hotel", "—")}</div></div>
      <div><div class="key">Room Type</div><div class="val">{ctx.get("room_type", "—")}</div></div>
      <div><div class="key">Meal Plan</div><div class="val">{ctx.get("meal_plan", "—")}</div></div>
      <div><div class="key">Nights</div><div class="val">{ctx.get("nights", "—")}</div></div>
      <div><div class="key">Pax</div><div class="val">{ctx.get("pax", 1)} pax</div></div>
      <div><div class="key">Conf. Number</div><div class="val" style="font-family:monospace;font-weight:700">{ctx.get("vendor_confirmation", "—")}</div></div>
    </div>
    <div class="section-title">Transfers & Services</div>
    <div style="font-size:10pt;color:#475569">{ctx.get("services", "Airport transfers included. See itinerary for full details.")}</div>
    <div class="note-box">📞 Emergency contact: {ctx.get("emergency_contact", ctx.get("agency_phone", "+91 98765 43210"))} (24×7)</div>
    {_footer_html(ctx)}
"""

def _render_refund_note(ctx: Dict[str, Any]) -> str:
    fmt = lambda n: f"₹{float(n):,.2f}"
    return f"""
    {_header_html(DocumentType.REFUND_NOTE, ctx)}
    {_party_row(ctx)}
    <div class="section-title">Refund Details</div>
    <div class="info-grid">
      <div><div class="key">Original Booking Ref</div><div class="val">{ctx.get("booking_ref", "—")}</div></div>
      <div><div class="key">Cancellation Date</div><div class="val">{ctx.get("cancellation_date", "")}</div></div>
      <div><div class="key">Reason</div><div class="val">{ctx.get("reason", "Client requested cancellation")}</div></div>
      <div><div class="key">Original Amount Paid</div><div class="val">{fmt(ctx.get("amount_paid", 0))}</div></div>
      <div><div class="key">Cancellation Charge</div><div class="val" style="color:#dc2626">−{fmt(ctx.get("cancellation_charge", 0))}</div></div>
      <div><div class="key">Net Refund</div><div class="val" style="color:{BRAND_COLOR};font-size:14pt;font-weight:900">{fmt(ctx.get("refund_amount", 0))}</div></div>
      <div><div class="key">Refund Method</div><div class="val">{ctx.get("refund_method", "Original payment method")}</div></div>
      <div><div class="key">Expected in</div><div class="val">{ctx.get("expected_days", "5–7 business days")}</div></div>
    </div>
    {_footer_html(ctx)}
"""

def _render_amendment(ctx: Dict[str, Any]) -> str:
    changes = ctx.get("changes", [])
    rows = ""
    for ch in changes:
        rows += f"<tr><td>{ch.get('field','')}</td><td>{ch.get('old','—')}</td><td>{ch.get('new','—')}</td></tr>"
    return f"""
    {_header_html(DocumentType.AMENDMENT, ctx)}
    {_party_row(ctx)}
    <p style="font-size:10.5pt;color:#475569">
      This amendment letter supersedes the earlier booking confirmation <strong>{ctx.get("booking_ref","—")}</strong>
      dated {ctx.get("original_date","")}.
      All other terms remain unchanged.
    </p>
    <div class="section-title">Changes</div>
    <table class="items">
      <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
      <tbody>{rows if rows else "<tr><td colspan='3'>No changes recorded.</td></tr>"}</tbody>
    </table>
    {_footer_html(ctx)}
"""

def _render_vendor_payout(ctx: Dict[str, Any]) -> str:
    fmt = lambda n: f"₹{float(n):,.2f}"
    items = ctx.get("items", [])
    rows = ""
    for it in items:
        rows += f"<tr><td>{it.get('booking_ref','')}</td><td>{it.get('description','')}</td><td class='right'>{fmt(it.get('amount',0))}</td></tr>"
    return f"""
    {_header_html(DocumentType.VENDOR_PAYOUT, ctx)}
    <div class="party-row">
      <div class="party-box">
        <div class="label">Vendor</div>
        <div class="name">{ctx.get("vendor_name","—")}</div>
        <div class="detail">{ctx.get("vendor_email","")}</div>
        {f'<div class="detail">GSTIN: {ctx.get("vendor_gstin","")}</div>' if ctx.get("vendor_gstin") else ""}
        {f'<div class="detail">Bank: {ctx.get("vendor_bank","")}</div>' if ctx.get("vendor_bank") else ""}
      </div>
      <div class="party-box">
        <div class="label">From</div>
        <div class="name">{ctx.get("agency_name","NAMA Travel")}</div>
        <div class="detail">{ctx.get("agency_address","")}</div>
      </div>
    </div>
    <div class="section-title">Bookings Covered</div>
    <table class="items">
      <thead><tr><th>Booking Ref</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>{rows if rows else "<tr><td colspan='3'>No line items.</td></tr>"}</tbody>
    </table>
    <div class="totals-block">
      <div class="totals-row total"><span>Total Payout</span><span>{fmt(ctx.get("total_payout",0))}</span></div>
    </div>
    <div class="section-title">Payment Info</div>
    <div class="info-grid">
      <div><div class="key">Payment Date</div><div class="val">{ctx.get("payment_date","")}</div></div>
      <div><div class="key">Payment Method</div><div class="val">{ctx.get("payment_method","Bank Transfer")}</div></div>
      <div><div class="key">UTR / Ref</div><div class="val" style="font-family:monospace">{ctx.get("utr","—")}</div></div>
    </div>
    {_footer_html(ctx)}
"""


# ── Master renderer ────────────────────────────────────────────────────────────

def render_document_html(doc_type: DocumentType, ctx: Dict[str, Any]) -> str:
    """Return complete HTML string for the given document type."""
    if doc_type in (DocumentType.INVOICE, DocumentType.PROFORMA_INVOICE):
        body = _render_invoice_family(doc_type, ctx)
    elif doc_type == DocumentType.RECEIPT:
        body = _render_receipt(ctx)
    elif doc_type == DocumentType.BOOKING_CONFIRMATION:
        body = _render_booking_confirmation(ctx)
    elif doc_type == DocumentType.VOUCHER:
        body = _render_voucher(ctx)
    elif doc_type == DocumentType.REFUND_NOTE:
        body = _render_refund_note(ctx)
    elif doc_type == DocumentType.AMENDMENT:
        body = _render_amendment(ctx)
    elif doc_type == DocumentType.VENDOR_PAYOUT:
        body = _render_vendor_payout(ctx)
    else:
        body = f"<p>Document type {doc_type} not implemented.</p>"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{DOC_TITLES.get(doc_type, "Document")} — NAMA OS</title>
  <style>{BASE_CSS}</style>
</head>
<body>
{body}
</body>
</html>"""


def generate_pdf(doc_type: DocumentType, ctx: Dict[str, Any]) -> Optional[bytes]:
    """
    Render PDF bytes.  Returns None if WeasyPrint is not installed.
    """
    html = render_document_html(doc_type, ctx)
    try:
        import weasyprint  # type: ignore
        return weasyprint.HTML(string=html).write_pdf()
    except ImportError:
        logger.warning("WeasyPrint not installed; PDF generation unavailable")
        return None


def pdf_response(
    doc_type: DocumentType,
    ctx: Dict[str, Any],
    filename: Optional[str] = None,
) -> StreamingResponse:
    """
    FastAPI StreamingResponse — PDF if WeasyPrint available, else HTML.
    """
    fname = filename or f"{doc_type.value}.pdf"
    pdf_bytes = generate_pdf(doc_type, ctx)
    if pdf_bytes is not None:
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{fname}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    # Fallback: return HTML for browser print
    html = render_document_html(doc_type, ctx)
    html_bytes = html.encode("utf-8")
    logger.info(f"Serving {doc_type} as HTML fallback (WeasyPrint not installed)")
    return StreamingResponse(
        io.BytesIO(html_bytes),
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="{fname.replace(".pdf",".html")}"'},
    )
