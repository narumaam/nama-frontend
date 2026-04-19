"""
Per-Tenant Email Configuration Model
--------------------------------------
Stores SMTP (outbound) and IMAP (inbound reply ingestion) credentials for each tenant.
Passwords are AES-256 encrypted via Fernet before storage.

Security:
  - smtp_password_encrypted and imap_password_encrypted are never returned in API responses.
  - Decryption happens only at send/poll time, in-memory.
  - One config row per tenant (UniqueConstraint on tenant_id).
"""

import os
import logging
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
)

from app.db.session import Base

logger = logging.getLogger(__name__)


# ── Fernet encryption helpers ──────────────────────────────────────────────────

def _get_fernet():
    """Lazy-load Fernet using ENCRYPTION_KEY env var. Falls back to derived key with a warning."""
    try:
        from cryptography.fernet import Fernet
        master = os.getenv("ENCRYPTION_KEY")
        if not master:
            logger.warning(
                "ENCRYPTION_KEY not set — email config passwords will use insecure fallback key. "
                "Set ENCRYPTION_KEY in Railway environment variables."
            )
            import base64, hashlib
            raw = hashlib.sha256(b"nama-email-config-fallback-key-do-not-use-in-prod").digest()
            master = base64.urlsafe_b64encode(raw).decode()
        return Fernet(master.encode())
    except ImportError:
        logger.error("cryptography package not installed — email password encryption unavailable")
        return None


def encrypt_password(plaintext: str) -> str:
    """Encrypt a plaintext password for storage."""
    f = _get_fernet()
    if f is None:
        import base64
        logger.warning("Falling back to base64 encoding (no encryption) for email password")
        return base64.b64encode(plaintext.encode()).decode()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_password(ciphertext: str) -> str:
    """Decrypt a stored password ciphertext. Raises ValueError on corruption."""
    f = _get_fernet()
    if f is None:
        import base64
        return base64.b64decode(ciphertext.encode()).decode()
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except Exception:
        raise ValueError(
            "Failed to decrypt email password — credential may be corrupted or ENCRYPTION_KEY changed"
        )


# ── SQLAlchemy Model ──────────────────────────────────────────────────────────

class TenantEmailConfig(Base):
    __tablename__ = "tenant_email_configs"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_tenant_email_config_tenant_id"),
    )

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # ── SMTP (outbound sending) ───────────────────────────────────────────────
    smtp_host               = Column(String(255), nullable=True)
    smtp_port               = Column(Integer, default=587, nullable=False)
    smtp_username           = Column(String(255), nullable=True)
    smtp_password_encrypted = Column(Text, nullable=True)
    smtp_from_name          = Column(String(200), nullable=True)
    smtp_from_email         = Column(String(255), nullable=True)
    smtp_use_tls            = Column(Boolean, default=True, nullable=False)

    # ── IMAP (inbound reply polling) ──────────────────────────────────────────
    imap_host               = Column(String(255), nullable=True)
    imap_port               = Column(Integer, default=993, nullable=False)
    imap_username           = Column(String(255), nullable=True)
    imap_password_encrypted = Column(Text, nullable=True)
    imap_use_ssl            = Column(Boolean, default=True, nullable=False)
    imap_folder             = Column(String(100), default="INBOX", nullable=False)

    # ── Verification state ────────────────────────────────────────────────────
    smtp_verified   = Column(Boolean, default=False, nullable=False)
    imap_verified   = Column(Boolean, default=False, nullable=False)
    last_imap_poll  = Column(DateTime, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
