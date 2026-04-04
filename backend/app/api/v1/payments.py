import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.api.v1.demo_founder_contract_store import get_founder_payment_snapshot, record_founder_payment
from app.db.session import get_db
from app.schemas.bookings import BookingStatus

router = APIRouter()


class PaymentStatusResponse(BaseModel):
    booking_id: int
    booking_status: BookingStatus
    quote_total: float
    deposit_due: float
    deposit_state: str
    settlement_state: str
    bank_ref: Optional[str] = None
    recorded_at: Optional[datetime] = None
    updated_at: datetime
    currency: str


class PaymentRecordRequest(BaseModel):
    bank_ref: Optional[str] = Field(default=None, min_length=1)


def _tenant_name(current_user: Any) -> Optional[str]:
    return getattr(current_user, "tenant_name", None)


@router.get("/booking/{booking_id}", response_model=PaymentStatusResponse)
def get_payment_status(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return PaymentStatusResponse(**get_founder_payment_snapshot(_tenant_name(current_user), booking_id))
    except KeyError as error:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.post("/booking/{booking_id}/record", response_model=PaymentStatusResponse)
def record_payment(
    booking_id: int,
    payload: PaymentRecordRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return PaymentStatusResponse(
            **record_founder_payment(_tenant_name(current_user), booking_id, bank_ref=payload.bank_ref)
        )
    except KeyError as error:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.get("/health")
def health_check():
    stripe_enabled = bool(os.getenv("STRIPE_SECRET_KEY"))
    razorpay_enabled = bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET"))
    mode = "live" if stripe_enabled or razorpay_enabled else "mock"
    return {
        "status": "ready",
        "module": "M6 Secure Payments",
        "mode": mode,
        "providers": {
            "stripe": "configured" if stripe_enabled else "not_configured",
            "razorpay": "configured" if razorpay_enabled else "not_configured",
        },
    }
