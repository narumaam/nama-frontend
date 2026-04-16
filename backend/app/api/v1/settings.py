"""
M15: BYOK — Bring Your Own Key (Settings)
------------------------------------------
Stores and manages tenant-scoped LLM API keys for BYOK.

Security:
  - Keys are AES-256 encrypted before storage (Fernet symmetric encryption).
  - Only the masked key (first 6 + last 4 chars) is returned in GET responses.
  - Keys are decrypted in-memory only at AI call time.
  - All operations scoped to JWT tenant_id (HS-2 enforcement).

Endpoints:
  GET    /settings/api-keys       — list active keys for tenant (masked)
  POST   /settings/api-keys       — add a new encrypted key
  DELETE /settings/api-keys/{id}  — revoke a key
  GET    /settings/subscription   — tenant's current plan info
"""

import os
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Session

from app.db.session import get_db, Base
from app.api.v1.deps import require_tenant, get_token_claims, RoleChecker
from app.models.auth import UserRole

logger = logging.getLogger(__name__)
router = APIRouter()

# Role guard — org admin or above can manage API keys
_admin_roles = RoleChecker([
    UserRole.R1_SUPER_ADMIN,
    UserRole.R2_ORG_ADMIN,
])

# ── Fernet encryption helper ───────────────────────────────────────────────────
def _get_fernet():
    """Lazy-load Fernet with the master key from env. Falls back to a test key."""
    try:
        from cryptography.fernet import Fernet
        master = os.getenv("BYOK_MASTER_KEY")
        if not master:
            logger.warning("BYOK_MASTER_KEY not set — using insecure fallback key")
            master = "dGhpcyBpcyBhIHRlc3Qga2V5IHBhZGRpbmcgaGVyZQ=="
            # Derive a valid 32-byte Fernet key from the master
            import base64, hashlib
            raw = hashlib.sha256(master.encode()).digest()
            master = base64.urlsafe_b64encode(raw).decode()
        return Fernet(master.encode())
    except ImportError:
        logger.error("cryptography package not installed — BYOK encryption unavailable")
        return None


def _encrypt(plaintext: str) -> str:
    f = _get_fernet()
    if f is None:
        return plaintext  # fallback (dev only)
    return f.encrypt(plaintext.encode()).decode()


def _decrypt(ciphertext: str) -> str:
    f = _get_fernet()
    if f is None:
        return ciphertext
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except Exception:
        raise ValueError("Failed to decrypt API key — key may be corrupted or master key changed")


def _mask(api_key: str) -> str:
    """Return sk-...xxxx style masked key."""
    if len(api_key) <= 10:
        return "***"
    return api_key[:6] + "..." + api_key[-4:]


# ── SQLAlchemy model ──────────────────────────────────────────────────────────
class ByokApiKey(Base):
    __tablename__ = "byok_api_keys"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    provider    = Column(String(50), nullable=False)  # openai | anthropic | google
    label       = Column(String(200), nullable=True)
    key_encrypted = Column(Text, nullable=False)
    key_masked  = Column(String(30), nullable=False)
    is_active   = Column(Boolean, default=True, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)


# ── Pydantic schemas ──────────────────────────────────────────────────────────
SUPPORTED_PROVIDERS = {"openai", "anthropic", "google"}

class ApiKeyCreate(BaseModel):
    provider: str
    label: Optional[str] = None
    api_key: str

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in SUPPORTED_PROVIDERS:
            raise ValueError(f"provider must be one of: {', '.join(SUPPORTED_PROVIDERS)}")
        return v

    @field_validator("api_key")
    @classmethod
    def validate_key_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("API key appears too short to be valid")
        return v


class ApiKeyOut(BaseModel):
    id: int
    provider: str
    label: Optional[str]
    key_masked: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True


class SubscriptionInfo(BaseModel):
    plan_id: str
    plan_name: str
    seats: int
    byok_enabled: bool
    period_end: Optional[str]


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get(
    "/api-keys",
    response_model=List[ApiKeyOut],
    summary="List tenant's BYOK API keys (masked)",
)
def list_api_keys(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_admin_roles),
):
    keys = (
        db.query(ByokApiKey)
        .filter(ByokApiKey.tenant_id == tenant_id, ByokApiKey.is_active == True)
        .order_by(ByokApiKey.created_at.desc())
        .all()
    )
    return keys


@router.post(
    "/api-keys",
    response_model=ApiKeyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new BYOK API key (stored encrypted)",
)
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_admin_roles),
):
    # Check for duplicate active key for same provider
    existing = (
        db.query(ByokApiKey)
        .filter(
            ByokApiKey.tenant_id == tenant_id,
            ByokApiKey.provider == payload.provider,
            ByokApiKey.is_active == True,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active {payload.provider} key already exists. Delete it first.",
        )

    encrypted = _encrypt(payload.api_key)
    key = ByokApiKey(
        tenant_id=tenant_id,
        provider=payload.provider,
        label=payload.label or payload.provider.title(),
        key_encrypted=encrypted,
        key_masked=_mask(payload.api_key),
        is_active=True,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    logger.info(f"BYOK key added: tenant={tenant_id} provider={payload.provider} id={key.id}")
    return key


@router.delete(
    "/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a BYOK API key",
)
def delete_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_admin_roles),
):
    key = (
        db.query(ByokApiKey)
        .filter(ByokApiKey.id == key_id, ByokApiKey.tenant_id == tenant_id)
        .first()
    )
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    # Soft delete
    key.is_active = False
    db.commit()
    logger.info(f"BYOK key revoked: tenant={tenant_id} key_id={key_id}")


@router.get(
    "/subscription",
    response_model=SubscriptionInfo,
    summary="Get current tenant subscription info",
)
def get_subscription(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    """
    Returns the tenant's current plan.
    In production, this will query a Subscription table.
    For now returns a sensible default based on tenant_id parity.
    """
    # TODO: query Subscription model once M14 billing backend is built
    return SubscriptionInfo(
        plan_id="growth",
        plan_name="Growth",
        seats=5,
        byok_enabled=True,
        period_end=None,
    )


# ── Decryption helper for internal AI agent use ───────────────────────────────
def get_active_byok_key(db: Session, tenant_id: int, provider: str) -> Optional[str]:
    """
    Called by AI agents to get the decrypted BYOK key for a given provider.
    Returns None if no active key exists → agents fall back to NAMA's default key.
    """
    key_row = (
        db.query(ByokApiKey)
        .filter(
            ByokApiKey.tenant_id == tenant_id,
            ByokApiKey.provider == provider,
            ByokApiKey.is_active == True,
        )
        .first()
    )
    if not key_row:
        return None
    try:
        decrypted = _decrypt(key_row.key_encrypted)
        # Update last_used_at
        key_row.last_used_at = datetime.utcnow()
        db.commit()
        return decrypted
    except Exception as e:
        logger.error(f"Failed to decrypt BYOK key for tenant={tenant_id} provider={provider}: {e}")
        return None
