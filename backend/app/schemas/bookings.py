from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class BookingStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    WAITLISTED = "WAITLISTED"

class BookingItemType(str, Enum):
    HOTEL = "HOTEL"
    FLIGHT = "FLIGHT"
    TRANSFER = "TRANSFER"
    ACTIVITY = "ACTIVITY"

class BookingItem(BaseModel):
    id: Optional[int] = None
    booking_id: int
    type: BookingItemType
    item_name: str
    status: BookingStatus
    vendor_id: int
    confirmation_number: Optional[str] = None
    voucher_url: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    cost_net: float
    price_gross: float
    currency: str

class Booking(BaseModel):
    id: Optional[int] = None
    itinerary_id: int
    tenant_id: int
    lead_id: int
    status: BookingStatus
    total_price: float
    currency: str
    items: List[BookingItem] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class VoucherGenerateResponse(BaseModel):
    booking_id: int
    voucher_id: str
    download_url: str
    generated_at: datetime
