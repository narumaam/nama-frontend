"""
ConversationMessage — durable record of inbound/outbound messages across
WhatsApp, Email, and in-app channels.

Tier 7A: introduces a dedicated message store. Replaces the lead-derived
projection from Tier 6A. The /threads endpoint reads from this table when
present and falls back to the lead-derived view for tenants who don't have
any messages stored yet.

Direction semantics:
    INBOUND  — message FROM the customer to the agency (webhook ingest).
    OUTBOUND — message FROM the agency to the customer (sent via /send).

Channel matches the comms schema enum (WHATSAPP / EMAIL / IN_APP). external_id
holds the upstream provider id when available (Meta wamid for WhatsApp, IMAP
Message-ID for email) so we can dedupe webhook replays.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class MessageDirection(str, enum.Enum):
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"


class MessageDeliveryStatus(str, enum.Enum):
    QUEUED = "QUEUED"            # OUTBOUND: in our DB, not yet sent to provider
    SENT = "SENT"                # OUTBOUND: provider accepted it
    DELIVERED = "DELIVERED"      # OUTBOUND: provider confirmed delivery
    READ = "READ"                # OUTBOUND: customer read it (WhatsApp blue ticks)
    FAILED = "FAILED"            # OUTBOUND: provider rejected
    RECEIVED = "RECEIVED"        # INBOUND: stored from webhook
    NONE = "NONE"                # IN_APP: status not applicable


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)

    # Channel + direction — matches comms schemas. Stored as plain strings to
    # avoid postgres ENUM creation friction across migrations.
    channel = Column(String(32), nullable=False, default="IN_APP")
    direction = Column(String(16), nullable=False, default=MessageDirection.OUTBOUND.value)
    status = Column(String(32), nullable=False, default=MessageDeliveryStatus.QUEUED.value)

    content = Column(Text, nullable=False, default="")

    # Upstream provider id for dedup (Meta wamid, IMAP Message-ID, etc.)
    external_id = Column(String(256), nullable=True)
    # Sender / recipient identifier on the channel side (phone number for
    # WhatsApp, email address for IMAP, user id for in-app).
    peer_address = Column(String(256), nullable=True)
    # Display name of the agent who sent (OUTBOUND) or the customer (INBOUND);
    # falls back to peer_address in the UI.
    author_name = Column(String(128), nullable=True)

    # Optional failure reason when status = FAILED.
    error_message = Column(String(512), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    lead = relationship("Lead", backref="conversation_messages")

    # Composite indexes for the two hot read paths:
    #   1. /threads — list latest message per lead for a tenant
    #   2. dedup    — find by (tenant_id, external_id) when webhooks replay
    __table_args__ = (
        Index("ix_conv_msgs_tenant_lead_created", "tenant_id", "lead_id", "created_at"),
        Index("ix_conv_msgs_tenant_external", "tenant_id", "external_id"),
    )
