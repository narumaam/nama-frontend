"""
M13: Client / Contact Model
-----------------------------
A Client is a known traveller who has done business with the agency.
Unlike Leads (open enquiries), Clients are confirmed past/repeat customers.
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text,
    ForeignKey, DateTime, Enum as SQLEnum, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class ClientStatus(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    VIP      = "VIP"
    INACTIVE = "INACTIVE"
    BLOCKED  = "BLOCKED"


class Client(Base):
    """Known client / traveller contact in the agency's database."""
    __tablename__ = "clients"

    id               = Column(Integer, primary_key=True, index=True)
    tenant_id        = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    # Identity
    full_name        = Column(String(256), nullable=False)
    email            = Column(String(256), nullable=True, index=True)
    phone            = Column(String(64),  nullable=True, index=True)
    secondary_phone  = Column(String(64),  nullable=True)

    # Location
    city             = Column(String(128), nullable=True)
    country          = Column(String(128), nullable=True, default="India")

    # Profile
    status           = Column(SQLEnum(ClientStatus), nullable=False, default=ClientStatus.ACTIVE)
    travel_type      = Column(String(64),  nullable=True)         # Luxury, Family, Corporate, etc.
    preferred_destinations = Column(JSON,  default=list)          # ["Maldives", "Bali"]
    tags             = Column(JSON, default=list)                  # ["VIP", "Repeat", "Group"]
    notes            = Column(Text, nullable=True)

    # Financials (can be populated from booking history or manually on import)
    total_bookings   = Column(Integer, default=0)
    total_spend      = Column(Float,   default=0.0)
    currency         = Column(String(10), default="INR")
    last_booking_date = Column(DateTime(timezone=True), nullable=True)

    # Import metadata
    import_source    = Column(String(64), nullable=True)          # "google_contacts", "outlook", "excel", "manual"
    external_id      = Column(String(256), nullable=True)         # ID in source system if known

    # Lifecycle
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    last_contact     = Column(DateTime(timezone=True), nullable=True)

    tenant           = relationship("Tenant", foreign_keys=[tenant_id])
    assigned_user    = relationship("User",   foreign_keys=[assigned_user_id])

    __table_args__ = (
        Index("ix_clients_tenant_status",  "tenant_id", "status"),
        Index("ix_clients_tenant_email",   "tenant_id", "email"),
    )
