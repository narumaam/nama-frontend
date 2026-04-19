"""
M2: Lead / CRM Model
----------------------
A Lead is created when the Query Triage Agent (M1) classifies an inbound
WhatsApp/email message as a valid travel enquiry.

State machine:
  NEW → CONTACTED → QUALIFIED → PROPOSAL_SENT → WON | LOST

Key design decisions:
  - tenant_id FK enforces RLS at application layer (HS-2).
  - assigned_user_id is nullable (unassigned on creation, assigned by manager).
  - source tracks acquisition channel for analytics (M12).
  - extracted_data stores the raw triage JSON for audit trail.
"""

import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text,
    ForeignKey, DateTime, Enum as SQLEnum, JSON, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class LeadStatus(str, enum.Enum):
    NEW              = "NEW"
    CONTACTED        = "CONTACTED"
    QUALIFIED        = "QUALIFIED"
    PROPOSAL_SENT    = "PROPOSAL_SENT"
    NEGOTIATING      = "NEGOTIATING"
    WON              = "WON"
    LOST             = "LOST"
    UNRESPONSIVE     = "UNRESPONSIVE"


class LeadSource(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    EMAIL    = "EMAIL"
    DIRECT   = "DIRECT"
    REFERRAL = "REFERRAL"
    PORTAL   = "PORTAL"
    WALK_IN  = "WALK_IN"
    WEBSITE  = "WEBSITE"


class Lead(Base):
    """
    CRM lead record — created from raw inbound query via Query Triage Agent.
    """
    __tablename__ = "leads"

    id               = Column(Integer, primary_key=True, index=True)
    tenant_id        = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"),   nullable=True,  index=True)

    # Enquirer details
    sender_id        = Column(String(256), nullable=False)       # WhatsApp number or email
    source           = Column(SQLEnum(LeadSource), nullable=False, default=LeadSource.WHATSAPP)
    full_name        = Column(String(256), nullable=True)
    email            = Column(String(256), nullable=True)
    phone            = Column(String(64),  nullable=True)

    # Trip details (extracted by Triage Agent — M1)
    destination      = Column(String(512), nullable=True)
    duration_days    = Column(Integer,     nullable=True)
    travelers_count  = Column(Integer,     default=1)
    travel_dates     = Column(String(256), nullable=True)        # free-text from message
    budget_per_person= Column(Float,       nullable=True)
    currency         = Column(String(10),  default="INR")
    travel_style     = Column(String(64),  default="Standard")   # Budget | Standard | Luxury
    preferences      = Column(JSON,        default=list)         # ["beach","adventure",...]
    triage_confidence= Column(Float,       default=0.0)          # 0–1 from AI
    raw_message      = Column(Text,        nullable=True)        # original message text

    # AI triage output for audit trail
    triage_result    = Column(JSON,        nullable=True)        # full QueryTriageResult dict
    suggested_reply  = Column(Text,        nullable=True)

    # CRM state
    status           = Column(SQLEnum(LeadStatus), nullable=False, default=LeadStatus.NEW)
    priority         = Column(Integer,     default=5)            # 1 (high) – 10 (low)
    notes            = Column(Text,        nullable=True)

    # Lifecycle timestamps
    created_at       = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    contacted_at     = Column(DateTime(timezone=True), nullable=True)
    qualified_at     = Column(DateTime(timezone=True), nullable=True)
    won_at           = Column(DateTime(timezone=True), nullable=True)
    lost_at          = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    tenant           = relationship("Tenant", foreign_keys=[tenant_id])
    assigned_user    = relationship("User",   foreign_keys=[assigned_user_id])
    bookings         = relationship("Booking", back_populates="lead", lazy="dynamic")

    __table_args__ = (
        Index("ix_leads_tenant_status", "tenant_id", "status"),
        Index("ix_leads_tenant_source", "tenant_id", "source"),
    )


class LeadTag(Base):
    """Many-to-many tag system for lead categorisation."""
    __tablename__ = "lead_tags"

    id        = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    lead_id   = Column(Integer, ForeignKey("leads.id",   ondelete="CASCADE"), nullable=False)
    tag       = Column(String(128), nullable=False)

    __table_args__ = (
        Index("ix_lead_tags_lead", "lead_id"),
        Index("ix_lead_tags_tenant_tag", "tenant_id", "tag"),
    )
