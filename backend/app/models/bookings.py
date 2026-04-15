from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from app.schemas.bookings import BookingStatus, BookingItemType

class Booking(Base):
    """
    Core Booking Management (M7). 
    Tracks the lifecycle of an itinerary after it has been won.
    """
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    itinerary_id = Column(Integer, ForeignKey("itineraries.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.DRAFT)
    total_price = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    items      = relationship("BookingItem", back_populates="booking")
    lead       = relationship("Lead",        back_populates="bookings", foreign_keys=[lead_id])
    itinerary  = relationship("Itinerary",   back_populates="bookings", foreign_keys=[itinerary_id])

class BookingItem(Base):
    """
    Individual items within a booking (e.g. specific hotel stay or flight).
    """
    __tablename__ = "booking_items"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    type = Column(SQLEnum(BookingItemType), nullable=False)
    item_name = Column(String, nullable=False)
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING_CONFIRMATION)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    confirmation_number = Column(String, nullable=True)
    voucher_url = Column(String, nullable=True)
    
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    cost_net = Column(Float, nullable=False)
    price_gross = Column(Float, nullable=False)
    currency = Column(String, default="INR")

    booking = relationship("Booking", back_populates="items")
