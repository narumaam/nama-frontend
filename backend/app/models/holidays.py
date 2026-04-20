"""
NAMA OS — Holiday Package Models
──────────────────────────────────
HolidayPackage: pre-packaged holiday products with pricing, inclusions,
departure slots, and itinerary template linkage.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base


class HolidayPackage(Base):
    __tablename__ = "holiday_packages"

    id                   = Column(Integer, primary_key=True, index=True)
    tenant_id            = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Basic info
    name                 = Column(String(255), nullable=False)
    destination          = Column(String(255), nullable=False)
    duration_days        = Column(Integer, nullable=False, default=1)

    # Pricing
    price_per_person     = Column(Float, nullable=False, default=0.0)
    max_pax              = Column(Integer, nullable=True)          # None = unlimited

    # Rich content (stored as JSONB arrays)
    inclusions           = Column(JSONB, nullable=False, server_default="[]")   # ["Flights", "Hotel", ...]
    exclusions           = Column(JSONB, nullable=False, server_default="[]")   # ["Visa fees", ...]
    images               = Column(JSONB, nullable=False, server_default="[]")   # [{url, alt, caption}, ...]
    tags                 = Column(JSONB, nullable=False, server_default="[]")   # ["beach", "family", ...]

    # Linked itinerary template (optional FK — nullable so packages can exist without one)
    itinerary_template_id = Column(Integer, ForeignKey("itineraries.id", ondelete="SET NULL"), nullable=True)

    # Visibility / state flags
    is_active            = Column(Boolean, nullable=False, default=True)
    is_featured          = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at           = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at           = Column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships (lazy — avoid circular import issues with ORM loading)
    itinerary_template   = relationship("Itinerary", lazy="select", foreign_keys=[itinerary_template_id])
