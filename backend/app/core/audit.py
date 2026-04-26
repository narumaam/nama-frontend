"""
Audit log helper — Tier 9B.

Usage in any endpoint:
    from app.core.audit import write_audit
    write_audit(
        db=db,
        actor=current_user,
        action="role.grant",
        target_type="user",
        target_id=str(user_id),
        details={"role": "R3_SALES_MANAGER"},
        request=request,
    )

Always best-effort. If the audit write fails (DB hiccup, table missing
pre-migration, etc.) the surrounding endpoint logic is unaffected.
"""

from typing import Any, Optional
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)


def _client_ip(request) -> Optional[str]:
    """Extract client IP from common proxy headers."""
    if request is None:
        return None
    # Trust X-Forwarded-For if present (Vercel/Railway both set this)
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None


def write_audit(
    db: Session,
    *,
    actor: Any = None,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[dict] = None,
    outcome: str = "success",
    error_message: Optional[str] = None,
    request: Any = None,
    tenant_id_override: Optional[int] = None,
) -> None:
    """
    Write a single audit row. Best-effort — never raises.
    """
    try:
        from app.models.audit_log import AuditLog

        actor_user_id = getattr(actor, "id", None) if actor else None
        actor_email = getattr(actor, "email", None) if actor else None
        actor_role = getattr(actor, "role", None) if actor else None
        # Coerce role enum to string if needed
        if actor_role is not None and hasattr(actor_role, "value"):
            actor_role = actor_role.value
        tenant_id = (
            tenant_id_override
            if tenant_id_override is not None
            else (getattr(actor, "tenant_id", None) if actor else None)
        )

        row = AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            actor_role=str(actor_role) if actor_role else None,
            actor_ip=_client_ip(request),
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details or {},
            outcome=outcome,
            error_message=error_message,
        )
        db.add(row)
        db.commit()
    except Exception as exc:
        # Never let audit-write failure cascade. Log it and continue.
        logger.warning("Audit-log write failed: action=%s err=%s", action, exc)
        try:
            db.rollback()
        except Exception:
            pass
