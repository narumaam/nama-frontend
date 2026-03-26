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
    Calculates net profit and margin based on reconciled transactions.
    """
    try:
        # Mocking transactions for the booking
        # In real app, query from `transactions` table
        mock_transactions = [
            Transaction(booking_id=booking_id, tenant_id=1, amount=150000.0, currency="INR", type=TransactionType.INFLOW, status=TransactionStatus.COMPLETED),
            Transaction(booking_id=booking_id, tenant_id=1, amount=120000.0, currency="INR", type=TransactionType.OUTFLOW, status=TransactionStatus.COMPLETED)
        ]
        
        # Step 1: AI-powered P&L Calculation
        profit_data = await finance_agent.calculate_booking_profit(mock_transactions)
        
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
    Uses the Finance Intelligence Agent to match messy descriptions.
    """
    try:
        # Step 1: Mock fetch from DB
        mock_transaction = Transaction(id=transaction_id, booking_id=1001, tenant_id=1, amount=150000.0, currency="INR", type=TransactionType.INFLOW, status=TransactionStatus.COMPLETED)
        
        # Step 2: Use AI for reconciliation
        reconciled_transaction = await finance_agent.reconcile_transaction(mock_transaction, bank_ref)
        
        return reconciled_transaction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary", response_model=LedgerSummary)
def get_finance_overview(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the overall ledger summary for the tenant organization (Kinetic layer).
    """
    # Prototype: Return mock summary
    return LedgerSummary(
        tenant_id=current_user.tenant_id,
        balance_available=1525000.0,
        pending_settlements=420000.0,
        currency="INR",
        last_reconciled=datetime.utcnow() - timedelta(minutes=15)
    )
