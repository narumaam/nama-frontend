"""
M6: Vendor / Supplier Model
-----------------------------
Vendors are the third-party suppliers (hotels, airlines, activity operators,
transfer companies) whose inventory is quoted in itineraries and booked.

A Vendor belongs to a Tenant (the travel company that has contracted them).
Pricing is stored in the VendorRate table (category × season).

Key design decisions:
  - tenant_id FK enforces RLS (HS-2).
  - vendor_code must be unique per tenant for import/export operations.
  - markup_pct is the default markup used when building itinerary pricing
    (overridable per booking item).
  - is_preferred flag drives the bidding engine (M5) sort order.
"""

import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text,
    ForeignKey, DateTime, Enum as SQLEnum, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class VendorCategory(str, enum.Enum):
    HOTEL      = "HOTEL"
    AIRLINE    = "AIRLINE"
    TRANSFER   = "TRANSFER"
    ACTIVITY   = "ACTIVITY"
    RESTAURANT = "RESTAURANT"
    CRUISE     = "CRUISE"
    INSURANCE  = "INSURANCE"
    OTHER      = "OTHER"


class VendorStatus(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED  = "BLOCKED"


class Vendor(Base):
    """
    Third-party supplier / service provider contracted by a travel company.
    """
    __tablename__ = "vendors"

    id              = Column(Integer, primary_key=True, index=True)
    tenant_id       = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    vendor_code     = Column(String(64),  nullable=False)       # internal code (unique per tenant)
    name            = Column(String(256), nullable=False)
    category        = Column(SQLEnum(VendorCategory), nullable=False, default=VendorCategory.HOTEL)
    status          = Column(SQLEnum(VendorStatus),   nullable=False, default=VendorStatus.ACTIVE)

    # Contact
    contact_name    = Column(String(256), nullable=True)
    contact_email   = Column(String(256), nullable=True)
    contact_phone   = Column(String(64),  nullable=True)
    website         = Column(String(512), nullable=True)

    # Location
    country         = Column(String(128), nullable=True)
    city            = Column(String(128), nullable=True)
    address         = Column(Text,        nullable=True)

    # Financial
    default_currency= Column(String(10),  default="INR")
    markup_pct      = Column(Float,       default=0.0)          # % added above cost_net
    credit_days     = Column(Integer,     default=30)           # payment terms
    gst_number      = Column(String(64),  nullable=True)

    # Flags
    is_preferred    = Column(Boolean, default=False)
    is_verified     = Column(Boolean, default=False)

    # Metadata
    tags            = Column(JSON,  default=list)
    notes           = Column(Text,  nullable=True)
    rating          = Column(Float, nullable=True)              # 1–5 internal rating

    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant          = relationship("Tenant", foreign_keys=[tenant_id])
    rates           = relationship("VendorRate", back_populates="vendor", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "vendor_code", name="uq_vendor_tenant_code"),
        Index("ix_vendors_tenant_category", "tenant_id", "category"),
        Index("ix_vendors_tenant_preferred", "tenant_id", "is_preferred"),
    )


class VendorRate(Base):
    """
    Seasonal rate card for a vendor.
    cost_net is what the vendor charges; price_gross is what we bill the client.
    """
    __tablename__ = "vendor_rates"

    id              = Column(Integer, primary_key=True, index=True)
    vendor_id       = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    tenant_id       = Column(Integer, ForeignKey("tenants.id"), nullable=False)

    season          = Column(String(64),  nullable=False)       # "HIGH", "LOW", "PEAK", or custom
    description     = Column(String(256), nullable=True)        # "Deluxe Room incl. breakfast"
    category        = Column(SQLEnum(VendorCategory), nullable=False)

    cost_net        = Column(Float, nullable=False)
    currency        = Column(String(10), default="INR")
    markup_pct      = Column(Float, default=0.0)                # overrides vendor.markup_pct

    valid_from      = Column(DateTime(timezone=True), nullable=True)
    valid_until     = Column(DateTime(timezone=True), nullable=True)

    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    vendor          = relationship("Vendor", back_populates="rates")
