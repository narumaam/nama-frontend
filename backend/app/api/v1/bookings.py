from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.api.v1.deps import RoleChecker, get_current_user
from app.api.v1.demo_founder_contract_store import (
    cancel_founder_booking,
    confirm_founder_booking,
    generate_founder_voucher,
    get_founder_booking,
    list_founder_bookings,
)
from app.db.session import get_db
from app.models.auth import UserRole
from app.schemas.bookings import Booking, BookingStatus, VoucherGenerateResponse

router = APIRouter()


def _tenant_name(current_user: Any) -> Optional[str]:
    return getattr(current_user, "tenant_name", None)


def _shape_booking(booking: dict[str, Any], tenant_id: int) -> Booking:
    booking_payload = dict(booking)
    booking_payload["tenant_id"] = tenant_id
    return Booking(**booking_payload)


@router.get("/", response_model=List[Booking])
def get_bookings(
    status: Optional[BookingStatus] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the seeded founder-path bookings for the tenant organization (M7).
    """
    bookings = list_founder_bookings(_tenant_name(current_user))
    if status is not None:
        bookings = [booking for booking in bookings if booking["status"] == status]
    return [_shape_booking(booking, current_user.tenant_id) for booking in bookings]


@router.post("/{booking_id}/confirm", response_model=Booking)
def confirm_booking(
    booking_id: int,
    current_user=Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
    db: Session = Depends(get_db),
):
    """
    Mark a seeded booking as confirmed after manual or automated supplier verification (M7).
    """
    try:
        booking = confirm_founder_booking(_tenant_name(current_user), booking_id)
    except KeyError as error:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=str(error)) from error
    return _shape_booking(booking, current_user.tenant_id)


@router.post("/{booking_id}/voucher", response_model=VoucherGenerateResponse)
def generate_voucher(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a travel voucher for a confirmed seeded booking (M7).
    """
    try:
        voucher = generate_founder_voucher(_tenant_name(current_user), booking_id)
    except KeyError as error:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except PermissionError as error:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=str(error)) from error
    return VoucherGenerateResponse(**voucher)


@router.delete("/{booking_id}", response_model=Booking)
def cancel_booking(
    booking_id: int,
    current_user=Depends(RoleChecker([UserRole.R2_ORG_ADMIN])),
    db: Session = Depends(get_db),
):
    """
    Cancel a seeded booking (M7).
    """
    try:
        booking = cancel_founder_booking(_tenant_name(current_user), booking_id)
    except KeyError as error:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    return _shape_booking(booking, current_user.tenant_id)


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "BOOKINGS"}
