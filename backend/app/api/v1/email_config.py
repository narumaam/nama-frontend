"""
Per-Tenant Email Configuration API
-------------------------------------
Manages SMTP + IMAP settings per tenant, tests connections, and polls for
inbound email replies that should be threaded back to quotations.

Security: All endpoints require a valid JWT (require_tenant). Passwords are
encrypted before storage and never returned in responses (masked as ••••••••).

# Register in main.py:
# from app.api.v1 import email_config as email_config_router
# app.include_router(email_config_router.router, prefix="/api/v1/email-config", tags=["email-config"])

Endpoints:
  GET    /                — get current config (passwords masked)
  POST   /                — save / upsert config (encrypt passwords)
  POST   /test-smtp       — test SMTP connection
  POST   /test-imap       — test IMAP connection, return message count
  POST   /poll-replies    — trigger IMAP poll; thread replies to quotations
  DELETE /                — remove config (reverts to NAMA default sender)
"""

import logging
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant, RoleChecker
from app.models.auth import UserRole
from app.models.email_config import TenantEmailConfig, encrypt_password

logger = logging.getLogger(__name__)
router = APIRouter()

_MASK = "••••••••"

# Only org admins and above can manage email config
_admin_roles = RoleChecker([
    UserRole.R1_SUPER_ADMIN,
    UserRole.R2_ORG_ADMIN,
])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class EmailConfigIn(BaseModel):
    """Payload for creating / updating the tenant email config."""
    # SMTP
    smtp_host:       Optional[str]   = None
    smtp_port:       Optional[int]   = Field(default=587, ge=1, le=65535)
    smtp_username:   Optional[str]   = None
    smtp_password:   Optional[str]   = None   # plain-text; encrypted before storage
    smtp_from_name:  Optional[str]   = None
    smtp_from_email: Optional[str]   = None
    smtp_use_tls:    Optional[bool]  = True

    # IMAP
    imap_host:       Optional[str]   = None
    imap_port:       Optional[int]   = Field(default=993, ge=1, le=65535)
    imap_username:   Optional[str]   = None
    imap_password:   Optional[str]   = None   # plain-text; encrypted before storage
    imap_use_ssl:    Optional[bool]  = True
    imap_folder:     Optional[str]   = "INBOX"


class EmailConfigOut(BaseModel):
    """Config response — passwords are masked."""
    id:              int
    tenant_id:       int
    # SMTP
    smtp_host:       Optional[str]
    smtp_port:       int
    smtp_username:   Optional[str]
    smtp_password:   str   # always "••••••••" if set, else ""
    smtp_from_name:  Optional[str]
    smtp_from_email: Optional[str]
    smtp_use_tls:    bool
    # IMAP
    imap_host:       Optional[str]
    imap_port:       int
    imap_username:   Optional[str]
    imap_password:   str   # always "••••••••" if set, else ""
    imap_use_ssl:    bool
    imap_folder:     str
    # State
    smtp_verified:   bool
    imap_verified:   bool
    last_imap_poll:  Optional[datetime]
    created_at:      datetime
    updated_at:      datetime

    class Config:
        from_attributes = True


def _to_out(cfg: TenantEmailConfig) -> dict:
    """Convert ORM row to response dict with masked passwords."""
    return {
        "id":              cfg.id,
        "tenant_id":       cfg.tenant_id,
        "smtp_host":       cfg.smtp_host,
        "smtp_port":       cfg.smtp_port,
        "smtp_username":   cfg.smtp_username,
        "smtp_password":   _MASK if cfg.smtp_password_encrypted else "",
        "smtp_from_name":  cfg.smtp_from_name,
        "smtp_from_email": cfg.smtp_from_email,
        "smtp_use_tls":    cfg.smtp_use_tls,
        "imap_host":       cfg.imap_host,
        "imap_port":       cfg.imap_port,
        "imap_username":   cfg.imap_username,
        "imap_password":   _MASK if cfg.imap_password_encrypted else "",
        "imap_use_ssl":    cfg.imap_use_ssl,
        "imap_folder":     cfg.imap_folder,
        "smtp_verified":   cfg.smtp_verified,
        "imap_verified":   cfg.imap_verified,
        "last_imap_poll":  cfg.last_imap_poll,
        "created_at":      cfg.created_at,
        "updated_at":      cfg.updated_at,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get(
    "/",
    summary="Get current tenant email config (passwords masked)",
)
def get_email_config(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_admin_roles),
):
    cfg = db.query(TenantEmailConfig).filter(TenantEmailConfig.tenant_id == tenant_id).first()
    if not cfg:
        return {
            "configured": False,
            "message": "No email config found. Using NAMA default sender.",
        }
    return _to_out(cfg)


@router.post(
    "/",
    summary="Save / update tenant email config",
    status_code=status.HTTP_200_OK,
)
def upsert_email_config(
    payload:   EmailConfigIn,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_admin_roles),
):
    cfg = db.query(TenantEmailConfig).filter(TenantEmailConfig.tenant_id == tenant_id).first()

    if cfg is None:
        cfg = TenantEmailConfig(tenant_id=tenant_id)
        db.add(cfg)

    # SMTP fields
    if payload.smtp_host       is not None: cfg.smtp_host       = payload.smtp_host.strip()
    if payload.smtp_port       is not None: cfg.smtp_port       = payload.smtp_port
    if payload.smtp_username   is not None: cfg.smtp_username   = payload.smtp_username.strip()
    if payload.smtp_from_name  is not None: cfg.smtp_from_name  = payload.smtp_from_name.strip()
    if payload.smtp_from_email is not None: cfg.smtp_from_email = payload.smtp_from_email.strip().lower()
    if payload.smtp_use_tls    is not None: cfg.smtp_use_tls    = payload.smtp_use_tls

    if payload.smtp_password:
        cfg.smtp_password_encrypted = encrypt_password(payload.smtp_password)
        cfg.smtp_verified = False  # re-verify after password change

    # IMAP fields
    if payload.imap_host     is not None: cfg.imap_host     = payload.imap_host.strip()
    if payload.imap_port     is not None: cfg.imap_port     = payload.imap_port
    if payload.imap_username is not None: cfg.imap_username = payload.imap_username.strip()
    if payload.imap_use_ssl  is not None: cfg.imap_use_ssl  = payload.imap_use_ssl
    if payload.imap_folder   is not None: cfg.imap_folder   = payload.imap_folder.strip() or "INBOX"

    if payload.imap_password:
        cfg.imap_password_encrypted = encrypt_password(payload.imap_password)
        cfg.imap_verified = False

    cfg.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cfg)

    logger.info("Email config saved: tenant=%s", tenant_id)
    return _to_out(cfg)


@router.post(
    "/test-smtp",
    summary="Test SMTP connection — returns success + latency_ms",
)
def test_smtp_endpoint(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_admin_roles),
):
    cfg = db.query(TenantEmailConfig).filter(TenantEmailConfig.tenant_id == tenant_id).first()
    if not cfg or not cfg.smtp_host:
        raise HTTPException(status_code=400, detail="SMTP not configured. Save config first.")

    from app.core.email_service import test_smtp

    t0 = time.perf_counter()
    result = test_smtp(cfg)
    latency_ms = round((time.perf_counter() - t0) * 1000)

    if result["success"]:
        cfg.smtp_verified = True
        db.commit()

    return {
        "success":    result["success"],
        "error":      result.get("error"),
        "latency_ms": latency_ms,
    }


@router.post(
    "/test-imap",
    summary="Test IMAP connection — returns success + message count",
)
def test_imap_endpoint(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_admin_roles),
):
    cfg = db.query(TenantEmailConfig).filter(TenantEmailConfig.tenant_id == tenant_id).first()
    if not cfg or not cfg.imap_host:
        raise HTTPException(status_code=400, detail="IMAP not configured. Save config first.")

    from app.core.email_service import test_imap

    result = test_imap(cfg)

    if result["success"]:
        cfg.imap_verified = True
        db.commit()

    return {
        "success":       result["success"],
        "error":         result.get("error"),
        "message_count": result.get("message_count", 0),
    }


@router.post(
    "/poll-replies",
    summary="Trigger IMAP poll and thread replies to quotations",
)
def poll_replies_endpoint(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_admin_roles),
):
    """
    Polls the IMAP inbox for the last 24 hours of unseen messages.
    For each message with an In-Reply-To header that matches a quotation's
    stored message_id_tag (in quotation.notes as "[email-thread:{tag}]"),
    appends the reply to quotation.notes and updates the lead timeline.

    Returns:
        { replies_found: int, matched: int, unmatched: int, replies: list }
    """
    cfg = db.query(TenantEmailConfig).filter(TenantEmailConfig.tenant_id == tenant_id).first()
    if not cfg or not cfg.imap_host:
        raise HTTPException(status_code=400, detail="IMAP not configured.")

    from app.core.email_service import poll_imap_replies

    replies = poll_imap_replies(cfg, since_hours=24)

    # Update last poll timestamp
    cfg.last_imap_poll = datetime.utcnow()
    db.commit()

    matched = 0
    unmatched = 0
    reply_summary = []

    for reply in replies:
        in_reply_to = reply.get("in_reply_to", "")
        matched_quotation_id = None

        if in_reply_to:
            # in_reply_to looks like: <quotation-42@nama.5>
            # We search quotation.notes for "[email-thread:quotation-42]"
            # Extract the tag: strip < > and take the part before @
            try:
                tag_part = in_reply_to.strip("<>").split("@")[0]  # e.g. "quotation-42"
            except Exception:
                tag_part = ""

            if tag_part:
                # Import Quotation model lazily to avoid circular imports
                from app.api.v1.quotations import Quotation

                # Search for the tag marker in quotation notes
                search_marker = f"[email-thread:{tag_part}]"
                q = (
                    db.query(Quotation)
                    .filter(
                        Quotation.tenant_id == tenant_id,
                        Quotation.is_deleted == False,
                        Quotation.notes.contains(search_marker),
                    )
                    .first()
                )

                if q:
                    matched_quotation_id = q.id
                    # Append the reply to quotation notes
                    from_label = reply.get("from_name") or reply.get("from_email", "Client")
                    received = reply.get("received_at", "")
                    body_snippet = (reply.get("body_text") or "")[:500]
                    reply_block = (
                        f"\n\n--- Reply from {from_label}"
                        + (f" ({received})" if received else "")
                        + f" ---\n{body_snippet}"
                    )
                    existing_notes = q.notes or ""
                    q.notes = existing_notes + reply_block
                    q.updated_at = datetime.utcnow()
                    db.commit()
                    matched += 1
                else:
                    unmatched += 1
            else:
                unmatched += 1
        else:
            unmatched += 1

        reply_summary.append({
            "from_email":    reply.get("from_email"),
            "subject":       reply.get("subject"),
            "received_at":   reply.get("received_at"),
            "in_reply_to":   in_reply_to,
            "quotation_id":  matched_quotation_id,
            "threaded":      matched_quotation_id is not None,
        })

    logger.info(
        "IMAP poll done: tenant=%s found=%d matched=%d unmatched=%d",
        tenant_id, len(replies), matched, unmatched
    )

    return {
        "replies_found": len(replies),
        "matched":       matched,
        "unmatched":     unmatched,
        "replies":       reply_summary,
    }


@router.delete(
    "/",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove tenant email config (reverts to NAMA default sender)",
)
def delete_email_config(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _:         dict    = Depends(_admin_roles),
):
    cfg = db.query(TenantEmailConfig).filter(TenantEmailConfig.tenant_id == tenant_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No email config to delete.")
    db.delete(cfg)
    db.commit()
    logger.info("Email config deleted: tenant=%s", tenant_id)
