"""
Data export endpoint — Tier 9B (GDPR / DPDP compliance).

GET /api/v1/me/export
  Returns a JSON dump of all data the calling user has access to.

POST /api/v1/me/delete-request
  Records a deletion request. Actual deletion is a manual review step
  by NAMA staff to prevent malicious / accidental wipes.

Both audit-logged.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.deps import get_current_user, require_tenant
from app.core.audit import write_audit
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/export", summary="Export all data accessible to the current user (GDPR / DPDP)")
def export_my_data(
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    """
    Returns a JSON document containing the user's profile, their tenant's
    leads/bookings/itineraries/quotations/conversation_messages, and the
    audit log of actions they personally took.

    Only R2_ORG_ADMIN can call this for their tenant. Other roles see only
    their own user-level data.
    """
    from app.models.auth import User, Tenant
    from app.models.leads import Lead
    from app.models.bookings import Booking
    from app.models.itineraries import Itinerary
    from app.models.conversation_messages import ConversationMessage
    from app.models.audit_log import AuditLog

    # Audit the export request itself — this is itself a sensitive action.
    write_audit(
        db=db, actor=current_user, request=request,
        action="data.export",
        target_type="tenant", target_id=str(tenant_id),
    )

    # User's own row
    user_row = db.query(User).filter(User.id == current_user.id).first()
    user_data = {
        "id": user_row.id,
        "email": user_row.email,
        "tenant_id": user_row.tenant_id,
        "role": user_row.role.value if hasattr(user_row.role, "value") else str(user_row.role),
        "is_active": user_row.is_active,
        "created_at": user_row.created_at.isoformat() if getattr(user_row, "created_at", None) else None,
    } if user_row else None

    role_str = (current_user.role.value if hasattr(current_user.role, "value")
                else str(current_user.role))
    is_admin = role_str in ("R0_NAMA_OWNER", "R1_SUPER_ADMIN", "R2_ORG_ADMIN")

    payload = {
        "exported_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "user": user_data,
        "tenant_scope": is_admin,
    }

    if is_admin:
        # Tenant-wide export
        tenant_row = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        payload["tenant"] = {
            "id": tenant_row.id, "name": tenant_row.name, "org_code": tenant_row.org_code,
        } if tenant_row else None

        leads = db.query(Lead).filter(Lead.tenant_id == tenant_id).all()
        payload["leads"] = [{
            "id": l.id, "full_name": l.full_name, "email": l.email, "phone": l.phone,
            "destination": l.destination, "status": l.status.value if hasattr(l.status, "value") else str(l.status),
            "created_at": l.created_at.isoformat() if l.created_at else None,
        } for l in leads]

        bookings = db.query(Booking).filter(Booking.tenant_id == tenant_id).all()
        payload["bookings"] = [{
            "id": b.id, "lead_id": b.lead_id, "itinerary_id": b.itinerary_id,
            "status": b.status.value if hasattr(b.status, "value") else str(b.status),
            "total_price": float(b.total_price) if b.total_price else 0,
            "currency": b.currency,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        } for b in bookings]

        itins = db.query(Itinerary).filter(Itinerary.tenant_id == tenant_id).all()
        payload["itineraries"] = [{
            "id": i.id, "title": i.title, "destination": i.destination,
            "duration_days": i.duration_days, "status": i.status.value if hasattr(i.status, "value") else str(i.status),
            "days_json": i.days_json,
        } for i in itins]

        msgs = db.query(ConversationMessage).filter(
            ConversationMessage.tenant_id == tenant_id
        ).limit(5000).all()
        payload["conversation_messages"] = [{
            "id": m.id, "lead_id": m.lead_id, "channel": m.channel,
            "direction": m.direction, "status": m.status, "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        } for m in msgs]

    # Audit log scoped to the actor (always)
    audit_rows = db.query(AuditLog).filter(
        AuditLog.actor_user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).limit(1000).all()
    payload["my_audit_log"] = [{
        "action": a.action, "target_type": a.target_type, "target_id": a.target_id,
        "outcome": a.outcome, "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in audit_rows]

    return payload


@router.post("/delete-request", summary="Request account/tenant deletion (manual review)")
def request_deletion(
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    """
    Records a deletion intent. Actual deletion is performed by NAMA staff
    after a 30-day cooldown + email confirmation. Per GDPR Article 17
    (right to erasure) and DPDP Section 12 (right to correction).
    """
    write_audit(
        db=db, actor=current_user, request=request,
        action="data.delete_request",
        target_type="tenant", target_id=str(tenant_id),
        details={"requested_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()},
    )
    return {
        "status": "received",
        "message": "Deletion request recorded. NAMA staff will contact you within 5 business days. "
                   "Per GDPR / DPDP Act 2023, deletion will be performed within 30 days unless "
                   "we have a legal obligation to retain specific records (e.g. tax invoices).",
    }
