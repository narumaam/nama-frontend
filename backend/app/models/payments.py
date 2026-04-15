"""
HS-3: Payment Models
----------------------
Key safety properties:
  - idempotency_key is UNIQUE — duplicate requests with same key are deduplicated
  - status ENUM prevents invalid state transitions
  - Every webhook event is persisted before processing (at-least-once delivery)
"""

import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    ForeignKey, DateTime, Enum as SQLEnum, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class PaymentStatus(str, enum.Enum):
    PENDING    = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED  = "COMPLETED"
    FAILED     = "FAILED"
    REFUNDED   = "REFUNDED"
    CANCELLED  = "CANCELLED"


class PaymentProvider(str, enum.Enum):
    STRIPE    = "STRIPE"
    RAZORPAY  = "RAZORPAY"
    MANUAL    = "MANUAL"


class Payment(Base):
    """
    Central payment record.  idempotency_key UNIQUE prevents double-charging.
    """
    __tablename__ = "payments"

    id               = Column(Integer, primary_key=True, index=True)
    booking_id       = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    tenant_id        = Column(Integer, ForeignKey("tenants.id"), nullable=False)

    # HS-3: idempotency — client generates a UUID per payment attempt
    idempotency_key  = Column(String(128), nullable=False, unique=True, index=True)

    amount           = Column(Float, nullable=False)
    currency         = Column(String(10), nullable=False, default="INR")
    provider         = Column(SQLEnum(PaymentProvider), nullable=False, default=PaymentProvider.RAZORPAY)
    provider_ref     = Column(String(256), nullable=True)   # Stripe payment_intent_id / Razorpay order_id
    status           = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)

    # FX snapshot at payment time
    fx_rate          = Column(Float, nullable=True)
    fx_from_currency = Column(String(10), nullable=True)

    failure_reason   = Column(String(512), nullable=True)
    refunded_amount  = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_payments_booking_tenant", "booking_id", "tenant_id"),
    )


class WebhookEvent(Base):
    """
    Persisted webhook events — stored BEFORE processing to enable replay.
    processed=False events are retried by the background worker.
    """
    __tablename__ = "webhook_events"

    id           = Column(Integer, primary_key=True, index=True)
    provider     = Column(SQLEnum(PaymentProvider), nullable=False)
    event_id     = Column(String(256), nullable=False, unique=True, index=True)  # provider's event ID
    event_type   = Column(String(128), nullable=False)
    raw_payload  = Column(String, nullable=False)   # full JSON as string
    processed    = Column(Boolean, default=False, index=True)
    attempts     = Column(Integer, default=0)
    error_detail = Column(String(512), nullable=True)

    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)


class LedgerEntry(Base):
    """
    Double-entry style ledger.  Every payment event creates a matching entry.
    Balance = SUM(amount WHERE type='CREDIT') - SUM(amount WHERE type='DEBIT')
    """
    __tablename__ = "ledger_entries"

    id           = Column(Integer, primary_key=True, index=True)
    tenant_id    = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    booking_id   = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    payment_id   = Column(Integer, ForeignKey("payments.id"), nullable=True)

    entry_type   = Column(String(10), nullable=False)   # DEBIT | CREDIT
    amount       = Column(Float, nullable=False)
    currency     = Column(String(10), nullable=False, default="INR")
    description  = Column(String(512), nullable=False)
    reference    = Column(String(256), nullable=True)

    created_at   = Column(DateTime(timezone=True), server_default=func.now())
