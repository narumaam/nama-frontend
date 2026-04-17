from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.financials import Transaction, TransactionType, TransactionStatus, BookingProfit, LedgerSummary
from app.agents.finance import FinanceAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import List, Dict, Any
from datetime import datetime, timedelta

router = APIRouter()
finance_agent = FinanceAgent()

@router.get("/booking/{booking_id}/profit", response_model=BookingProfit)
async def get_booking_profitability(
    booking_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the real-time P&L for a specific booking (M11).
    Calculates net profit and margin based on actual payment and cost data.
    """
    try:
        # Query real data: payments and booking items
        profit_data = finance_agent.calculate_booking_profit(
            db, booking_id, current_user.tenant_id
        )
        return profit_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reconcile/{transaction_id}", response_model=Transaction)
async def reconcile_payment(
    transaction_id: int,
    bank_ref: str,
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R5_FINANCE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Reconcile an internal transaction with a bank reference (M11).
    """
    try:
        # Fetch transaction (not implemented - placeholder for future)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Transaction reconciliation not yet implemented"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary", response_model=LedgerSummary)
def get_finance_overview(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the overall ledger summary for the tenant organization.
    """
    return finance_agent.get_ledger_summary(db, current_user.tenant_id)


# ── PDF Document endpoints ─────────────────────────────────────────────────────
# P2-3 / P2-4: 8 trip-lifecycle documents via centralized pdf_engine

from datetime import date, timezone
from fastapi.responses import StreamingResponse
from app.core.pdf_engine import pdf_response, DocumentType as DocType
from app.api.v1.deps import require_tenant
from app.models.bookings import Booking  # type: ignore


def _booking_ctx(db, booking_id: int, tenant_id: int) -> dict:
    """Build shared context dict from a booking row (best-effort, doesn't crash)."""
    ctx: dict = {
        "agency_name": "NAMA Travel",
        "agency_email": "accounts@namatravel.com",
        "currency": "INR",
    }
    try:
        b = db.query(Booking).filter(
            Booking.id == booking_id,
            Booking.tenant_id == tenant_id,
        ).first()
        if b:
            ctx.update({
                "booking_ref":    f"BK-{b.id:05d}",
                "client_name":    getattr(b, "lead_name", "Guest"),
                "destination":    getattr(b, "destination", ""),
                "travel_dates":   f"{getattr(b, 'check_in_date', '')} → {getattr(b, 'check_out_date', '')}",
                "pax":            getattr(b, "pax_count", 1),
                "hotel":          getattr(b, "hotel_name", ""),
                "total":          float(getattr(b, "total_price", 0) or 0),
                "amount_paid":    float(getattr(b, "amount_paid", 0) or 0),
                "balance_due":    float(getattr(b, "balance_due", 0) or 0),
                "doc_date":       date.today().strftime("%d %b %Y"),
            })
    except Exception:
        pass  # Return minimal context on any DB error
    return ctx


@router.get(
    "/invoice/{booking_id}/pdf",
    summary="Download GST tax invoice for a booking",
    response_class=StreamingResponse,
)
def download_invoice(
    booking_id: int,
    db:         Session  = Depends(get_db),
    tenant_id:  int      = Depends(require_tenant),
    _:          dict     = Depends(get_current_user),
):
    ctx = _booking_ctx(db, booking_id, tenant_id)
    ctx["doc_number"] = f"INV/FY25-26/{booking_id:04d}"
    ctx["paid"] = ctx.get("balance_due", 1) == 0
    return pdf_response(DocType.INVOICE, ctx, f"invoice-{booking_id}.pdf")


@router.get(
    "/receipt/{booking_id}/pdf",
    summary="Download payment receipt",
    response_class=StreamingResponse,
)
def download_receipt(
    booking_id: int,
    db:         Session  = Depends(get_db),
    tenant_id:  int      = Depends(require_tenant),
    _:          dict     = Depends(get_current_user),
):
    ctx = _booking_ctx(db, booking_id, tenant_id)
    ctx["doc_number"]      = f"RCP/{booking_id:04d}"
    ctx["amount_paid"]     = ctx.get("amount_paid", 0)
    ctx["payment_date"]    = date.today().strftime("%d %b %Y")
    ctx["payment_method"]  = "Bank Transfer"
    ctx["transaction_ref"] = f"TXN-{booking_id:06d}"
    ctx["balance_due"]     = ctx.get("balance_due", 0)
    return pdf_response(DocType.RECEIPT, ctx, f"receipt-{booking_id}.pdf")


@router.get(
    "/refund/{booking_id}/pdf",
    summary="Download refund note",
    response_class=StreamingResponse,
)
def download_refund_note(
    booking_id:         int,
    refund_amount:      float = 0,
    cancellation_charge: float = 0,
    db:                 Session  = Depends(get_db),
    tenant_id:          int      = Depends(require_tenant),
    _:                  dict     = Depends(get_current_user),
):
    ctx = _booking_ctx(db, booking_id, tenant_id)
    ctx["doc_number"]          = f"RF/{booking_id:04d}"
    ctx["cancellation_date"]   = date.today().strftime("%d %b %Y")
    ctx["refund_amount"]       = refund_amount
    ctx["cancellation_charge"] = cancellation_charge
    return pdf_response(DocType.REFUND_NOTE, ctx, f"refund-note-{booking_id}.pdf")


@router.get(
    "/vendor-payout/{booking_id}/pdf",
    summary="Download vendor payout statement",
    response_class=StreamingResponse,
)
def download_vendor_payout(
    booking_id: int,
    db:         Session  = Depends(get_db),
    tenant_id:  int      = Depends(require_tenant),
    _:          dict     = Depends(get_current_user),
):
    ctx = _booking_ctx(db, booking_id, tenant_id)
    ctx["doc_number"]    = f"VP/{booking_id:04d}"
    ctx["payment_date"]  = date.today().strftime("%d %b %Y")
    ctx["total_payout"]  = ctx.get("total", 0)
    ctx["items"] = [{
        "booking_ref": ctx.get("booking_ref", ""),
        "description": ctx.get("destination", "Travel services"),
        "amount":      ctx.get("total", 0),
    }]
    return pdf_response(DocType.VENDOR_PAYOUT, ctx, f"vendor-payout-{booking_id}.pdf")
