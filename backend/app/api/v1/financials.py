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
