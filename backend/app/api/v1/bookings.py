from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.bookings import Booking, BookingStatus, BookingItem, VoucherGenerateResponse
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/", response_model=List[Booking])
def get_bookings(
    status: Optional[BookingStatus] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all bookings for the tenant organization (M7).
    Supports filtering by status (e.g., CONFIRMED, PENDING).
    """
    # Mocking for prototype
    return [
        Booking(
            id=1001,
            itinerary_id=1,
            tenant_id=current_user.tenant_id,
            lead_id=1,
            status=BookingStatus.CONFIRMED,
            total_price=150000.0,
            currency="INR",
            items=[
                BookingItem(
                    id=1,
                    booking_id=1001,
                    type="HOTEL",
                    item_name="Grand Hyatt Dubai",
                    status=BookingStatus.CONFIRMED,
                    vendor_id=101,
                    confirmation_number="DXB-123456",
                    start_date=datetime.utcnow() + timedelta(days=30),
                    cost_net=120000.0,
                    price_gross=150000.0,
                    currency="INR"
                )
            ]
        )
    ]


@router.post("/{booking_id}/confirm", response_model=Booking)
def confirm_booking(
    booking_id: int,
    current_user=Depends(
        RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])
    ),
    db: Session = Depends(get_db)
):
    """
    Mark a booking as confirmed after manual or automated supplier verification (M7).
    """
    # Prototype: Mocking the confirmation process
    return Booking(
        id=booking_id,
        itinerary_id=1,
        tenant_id=current_user.tenant_id,
        lead_id=1,
        status=BookingStatus.CONFIRMED,
        total_price=150000.0,
        currency="INR",
        items=[]
    )


@router.post("/{booking_id}/voucher", response_model=VoucherGenerateResponse)
def generate_voucher(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a travel voucher for a confirmed booking (M7).
    In a real app, this would use the 'pdf' skill to generate the document.
    """
    return VoucherGenerateResponse(
        booking_id=booking_id,
        voucher_id=f"VCH-{booking_id}-XYZ",
        download_url=f"https://api.nama.travel/v1/vouchers/VCH-{booking_id}-XYZ.pdf",
        generated_at=datetime.utcnow()
    )


@router.delete("/{booking_id}", response_model=Booking)
def cancel_booking(
    booking_id: int,
    current_user=Depends(RoleChecker([UserRole.R2_ORG_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Cancel an existing booking (M7).
    """
    # Prototype: Mocking the cancellation
    return Booking(
        id=booking_id,
        itinerary_id=1,
        tenant_id=current_user.tenant_id,
        lead_id=1,
        status=BookingStatus.CANCELLED,
        total_price=150000.0,
        currency="INR",
        items=[]
    )
