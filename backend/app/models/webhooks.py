"""
Inbound Webhook Events — M19 Integrations
------------------------------------------
Stores raw inbound webhook payloads from WhatsApp, Razorpay, and generic
sources BEFORE they are processed. Enables replay, deduplication, and audit.

Separate from app.models.payments.WebhookEvent (which is outbound payment
event tracking). This model covers *inbound* channel events.
"""

import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, Text, DateTime, Enum as SQLEnum, Index
)
from sqlalchemy.sql import func
from app.db.session import Base


class WebhookSource(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    RAZORPAY = "RAZORPAY"
    TELEGRAM = "TELEGRAM"
    GENERIC  = "GENERIC"


class InboundWebhookEvent(Base):
    """
    Persisted inbound webhook payloads — stored BEFORE processing.
    processed=False events can be replayed by the background worker.
    """
    __tablename__ = "inbound_webhook_events"

    id           = Column(Integer, primary_key=True, index=True)
    source       = Column(SQLEnum(WebhookSource), nullable=False, default=WebhookSource.GENERIC)
    event_type   = Column(String(128), nullable=False, default="unknown")
    payload_json = Column(Text, nullable=False)           # raw JSON body
    processed    = Column(Boolean, default=False, index=True)
    attempts     = Column(Integer, default=0)
    error_detail = Column(String(512), nullable=True)

    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_inbound_webhook_source_processed", "source", "processed"),
    )


# ── Outbound Webhook Endpoints ─────────────────────────────────────────────────

from sqlalchemy import JSON, ForeignKey  # noqa: E402 (keep imports together)

class WebhookEndpoint(Base):
    """
    Outbound webhook endpoint — NAMA fires signed HTTPS POST events to these URLs.
    Each endpoint subscribes to a list of event types (e.g. lead.created).
    """
    __tablename__ = "webhook_endpoints"

    id                 = Column(Integer, primary_key=True, index=True)
    tenant_id          = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    url                = Column(String(512), nullable=False)
    events             = Column(JSON, default=list)
    secret             = Column(String(64), nullable=False)
    description        = Column(String(256), nullable=True)
    is_active          = Column(Boolean, default=True)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    last_triggered_at  = Column(DateTime(timezone=True), nullable=True)
    delivery_count     = Column(Integer, default=0)
    failure_count      = Column(Integer, default=0)
