"""
AuditLog — durable record of sensitive admin operations.

Tier 9B: every privileged action that affects security, billing, or data
visibility writes one row. SOC-2 readiness, incident-response forensics,
customer-support trail — all need this.

Sensitive ops to log:
- Login / logout
- Role grant / revoke
- Subscription create / change / cancel / reactivate
- Tenant create / suspend / delete
- Customer-data export (GDPR)
- Permission override grant / deny
- WhatsApp / SMTP credential change
- API key create / rotate / revoke
- Customer portal token regenerate

Read-only by design — never UPDATE or DELETE rows after insert.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Index
from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    # tenant_id is nullable so platform-level events (e.g. NAMA staff actions
    # affecting multiple tenants) can be recorded with tenant_id=NULL.
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    actor_email = Column(String(256), nullable=True)
    actor_role = Column(String(64), nullable=True)
    actor_ip = Column(String(64), nullable=True)

    # The action category and target. Examples:
    #   action="role.grant" target_type="user" target_id="42"
    #   action="subscription.cancel" target_type="tenant" target_id="7"
    action = Column(String(64), nullable=False, index=True)
    target_type = Column(String(64), nullable=True)
    target_id = Column(String(128), nullable=True)

    # Free-form context — what changed, why, request payload snippet, etc.
    # Don't store PII / tokens here.
    details = Column(JSON, nullable=True)

    # Outcome of the action
    outcome = Column(String(32), nullable=False, default="success")  # success | failure
    error_message = Column(String(512), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("ix_audit_log_tenant_created", "tenant_id", "created_at"),
        Index("ix_audit_log_action_created", "action", "created_at"),
    )
