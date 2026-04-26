"""
Email Template model — tenant-owned + NAMA system templates.
System templates (tenant_id=None, is_system=True) are read-only; tenants clone them.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.session import Base


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    # nullable → system/NAMA template visible to all tenants

    name        = Column(String(200), nullable=False)
    category    = Column(String(50),  nullable=False)
    # ENQUIRY | QUOTES | BOOKINGS | PAYMENTS | DOCUMENTS | PRE_TRIP | POST_TRIP | FOLLOW_UP | MARKETING

    subject     = Column(String(300), nullable=False)
    html_body   = Column(Text,        nullable=False)
    text_body   = Column(Text,        nullable=True)

    # list of variable names e.g. ["client_name","destination","quote_ref"]
    variables   = Column(JSONB, nullable=False, default=list)

    is_system   = Column(Boolean, nullable=False, default=False)   # NAMA-provided
    is_active   = Column(Boolean, nullable=False, default=True)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
