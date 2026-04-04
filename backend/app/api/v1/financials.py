from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.api.v1.deps import RoleChecker, get_current_user
from app.api.v1.demo_founder_contract_store import (
    get_founder_booking_profit,
    reconcile_founder_transaction,
    summarize_founder_financials,
)
from app.db.session import get_db
from app.models.auth import UserRole
from app.schemas.financials import BookingProfit, LedgerSummary, Transaction

router = APIRouter()


def _tenant_name(current_user: Any) -> Optional[str]:
    return getattr(current_user, "tenant_name", None)


@router.get("/booking/{booking_id}/profit", response_model=BookingProfit)
def get_booking_profitability(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the seeded P&L for a specific booking (M11).
    """
    try:
        return BookingProfit(**get_founder_booking_profit(_tenant_name(current_user), booking_id))
    except KeyError as error:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.post("/reconcile/{transaction_id}", response_model=Transaction)
def reconcile_payment(
    transaction_id: int,
    bank_ref: str,
    current_user=Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R5_FINANCE_ADMIN])),
    db: Session = Depends(get_db),
):
    """
    Reconcile a seeded transaction with a bank reference (M11).
    """
    try:
        transaction = reconcile_founder_transaction(_tenant_name(current_user), transaction_id, bank_ref)
    except KeyError as error:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=str(error)) from error
    transaction["tenant_id"] = current_user.tenant_id
    return Transaction(**transaction)


@router.get("/summary", response_model=LedgerSummary)
def get_finance_overview(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the overall seeded ledger summary for the tenant organization.
    """
    summary = summarize_founder_financials(_tenant_name(current_user))
    return LedgerSummary(
        tenant_id=current_user.tenant_id,
        **summary,
    )


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "FINANCIALS"}
