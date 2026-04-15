"""
HS-4: AI Usage & Budget Models
--------------------------------
Every agent invocation writes one AIUsage row.
TenantAIBudget holds the monthly limit and current spend.

Acceptance Gate (HS-4):
  ✓ Every agent call persists a usage row (audit trail)
  ✓ Budget enforcement middleware checks usage before calling Claude
  ✓ Over-limit tenant gets HTTP 429, not a Claude call
"""

import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class AIUsage(Base):
    """One row per agent invocation — written by the budget middleware."""
    __tablename__ = "ai_usage"

    id           = Column(Integer, primary_key=True, index=True)
    tenant_id    = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    agent_name   = Column(String(128), nullable=False)
    model        = Column(String(128), nullable=False)
    tokens_in    = Column(Integer, default=0)
    tokens_out   = Column(Integer, default=0)
    cost_usd     = Column(Float, default=0.0)
    success      = Column(Boolean, default=True)
    error_detail = Column(String(512), nullable=True)

    created_at   = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class TenantAIBudget(Base):
    """Per-tenant monthly AI budget and current spend."""
    __tablename__ = "tenant_ai_budgets"

    id                   = Column(Integer, primary_key=True, index=True)
    tenant_id            = Column(Integer, ForeignKey("tenants.id"), nullable=False, unique=True, index=True)
    plan_tier            = Column(String(64), default="STARTER")  # STARTER | GROWTH | ENTERPRISE
    monthly_token_limit  = Column(Integer, default=500_000)       # tokens per month
    tokens_used_month    = Column(Integer, default=0)
    hard_limit_usd       = Column(Float, default=50.0)            # hard cost cap per month
    cost_used_month      = Column(Float, default=0.0)
    reset_date           = Column(DateTime(timezone=True), nullable=True)
    updated_at           = Column(DateTime(timezone=True), onupdate=func.now())
