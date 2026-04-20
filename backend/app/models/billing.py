"""
NAMA OS — Subscription & Billing Models
────────────────────────────────────────
Three tables that power dynamic subscription management:

  subscription_plans       Platform-wide plan catalog (Starter / Growth / Scale)
  tenant_subscriptions     Current subscription state per tenant
  subscription_events      Immutable audit log of plan changes + payment events
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey,
    DateTime, Text, Numeric, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


# ── SubscriptionPlan ──────────────────────────────────────────────────────────

class SubscriptionPlan(Base):
    """
    Platform-wide plan catalog — managed by NAMA staff, not per-tenant.
    """
    __tablename__ = "subscription_plans"

    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(String(100), nullable=False)               # "Starter", "Growth", "Scale"
    slug              = Column(String(50),  nullable=False, unique=True)  # "starter", "growth", "scale"
    price_monthly     = Column(Numeric(12, 2), nullable=False)            # INR, e.g. 4999.00
    price_yearly      = Column(Numeric(12, 2), nullable=False)            # INR, e.g. 49999.00
    price_monthly_usd = Column(Numeric(10, 2), nullable=True)             # USD monthly price
    price_yearly_usd  = Column(Numeric(10, 2), nullable=True)             # USD yearly price
    max_users         = Column(Integer, nullable=True)                    # NULL = unlimited
    max_leads         = Column(Integer, nullable=True)                    # NULL = unlimited
    features          = Column(JSONB, nullable=True)                      # feature flag map
    is_active         = Column(Boolean, default=True, nullable=False)
    sort_order        = Column(Integer, default=10)                       # display ordering
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    subscriptions   = relationship("TenantSubscription", back_populates="plan")

    def daily_rate(self, billing_cycle: str) -> float:
        """Returns the daily rate (price / days) for pro-rata calculations."""
        if billing_cycle == "yearly":
            return float(self.price_yearly) / 365
        return float(self.price_monthly) / 30

    def get_price(self, currency: str = 'INR', cycle: str = 'monthly') -> float:
        """Returns the plan price for the given currency and billing cycle."""
        if currency == 'USD':
            return float(self.price_monthly_usd or 0) if cycle == 'monthly' else float(self.price_yearly_usd or 0)
        return float(self.price_monthly) if cycle == 'monthly' else float(self.price_yearly)


# ── TenantSubscription ────────────────────────────────────────────────────────

class TenantSubscription(Base):
    """
    One active subscription per tenant.  Status machine:
      trial → active (on first payment)
      active → cancelled (at period end) → expired
      active → paused (payment failure)
      cancelled → active (reactivation)
    """
    __tablename__ = "tenant_subscriptions"

    id                       = Column(Integer, primary_key=True, index=True)
    tenant_id                = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                                      nullable=False, index=True)
    plan_id                  = Column(Integer, ForeignKey("subscription_plans.id"),
                                      nullable=False, index=True)
    # Status: active | cancelled | paused | trial
    status                   = Column(String(20), nullable=False, default="trial")
    # Billing cycle: monthly | yearly
    billing_cycle            = Column(String(10), nullable=False, default="monthly")
    current_period_start     = Column(DateTime(timezone=True), nullable=True)
    current_period_end       = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end     = Column(Boolean, default=False, nullable=False)
    trial_ends_at            = Column(DateTime(timezone=True), nullable=True)
    razorpay_subscription_id = Column(String(100), nullable=True, index=True)
    razorpay_customer_id     = Column(String(100), nullable=True)
    notes                    = Column(Text, nullable=True)
    created_at               = Column(DateTime(timezone=True), server_default=func.now())
    updated_at               = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    plan   = relationship("SubscriptionPlan", back_populates="subscriptions")
    events = relationship("SubscriptionEvent", back_populates="subscription",
                          cascade="all, delete-orphan",
                          order_by="SubscriptionEvent.created_at.desc()")

    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_tenant_subscriptions_tenant"),
        Index("ix_tenant_subscriptions_status", "status"),
    )


# ── SubscriptionEvent ─────────────────────────────────────────────────────────

class SubscriptionEvent(Base):
    """
    Immutable append-only log of all subscription lifecycle events.
    Never update or delete rows here.
    """
    __tablename__ = "subscription_events"

    id              = Column(Integer, primary_key=True, index=True)
    tenant_id       = Column(Integer, nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("tenant_subscriptions.id", ondelete="CASCADE"),
                             nullable=True, index=True)
    # event_type: plan_changed | payment_succeeded | payment_failed | cancelled | reactivated | trial_started
    event_type      = Column(String(50), nullable=False)
    old_plan_id     = Column(Integer, ForeignKey("subscription_plans.id"), nullable=True)
    new_plan_id     = Column(Integer, ForeignKey("subscription_plans.id"), nullable=True)
    old_billing_cycle = Column(String(10), nullable=True)
    new_billing_cycle = Column(String(10), nullable=True)
    amount_charged  = Column(Numeric(12, 2), nullable=True)   # INR
    proration_credit = Column(Numeric(12, 2), nullable=True)  # credit applied
    razorpay_payment_id = Column(String(100), nullable=True)
    notes           = Column(Text, nullable=True)
    meta            = Column(JSONB, nullable=True)             # arbitrary extra context
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    subscription = relationship("TenantSubscription", back_populates="events")

    __table_args__ = (
        Index("ix_subscription_events_tenant_time", "tenant_id", "created_at"),
    )
