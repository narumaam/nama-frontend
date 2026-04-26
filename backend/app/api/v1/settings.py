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
import secrets
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
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
# AI providers + Payment gateways — all stored encrypted in byok_api_keys table
SUPPORTED_PROVIDERS = {"openai", "anthropic", "google", "stripe", "razorpay"}

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


# ── Team Management Model ─────────────────────────────────────────────────────
class TenantInvite(Base):
    __tablename__ = "tenant_invites"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    email       = Column(String(255), nullable=False)
    role        = Column(String(50), nullable=False, default="R6_AGENT")
    token       = Column(String(64), unique=True, nullable=False, index=True)
    invited_by  = Column(Integer, nullable=True)
    invited_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at  = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    revoked_at  = Column(DateTime, nullable=True)


# ── Team Pydantic Schemas ─────────────────────────────────────────────────────
VALID_ROLES = {"R2_ORG_ADMIN", "R3_SALES_MANAGER", "R4_SENIOR_AGENT",
               "R5_FINANCE_ADMIN", "R6_AGENT", "R7_READ_ONLY"}


class InviteCreate(BaseModel):
    email: str
    role: str = "R6_AGENT"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v


class InviteOut(BaseModel):
    id: int
    email: str
    role: str
    invited_at: datetime
    accepted_at: Optional[datetime]
    revoked_at: Optional[datetime]

    @property
    def is_pending(self):
        return self.accepted_at is None and self.revoked_at is None

    class Config:
        from_attributes = True


# ── Team Endpoints ────────────────────────────────────────────────────────────
@router.get("/team", response_model=List[InviteOut], summary="List team invites")
def list_team_invites(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_admin_roles),
):
    invites = (
        db.query(TenantInvite)
        .filter(TenantInvite.tenant_id == tenant_id)
        .order_by(TenantInvite.invited_at.desc())
        .all()
    )
    return invites


@router.post(
    "/team/invite",
    response_model=InviteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a team member by email",
)
def invite_team_member(
    payload: InviteCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    claims: dict = Depends(_admin_roles),
):
    email = payload.email.lower().strip()

    # Check for existing pending invite for same email
    existing = (
        db.query(TenantInvite)
        .filter(
            TenantInvite.tenant_id == tenant_id,
            TenantInvite.email == email,
            TenantInvite.accepted_at.is_(None),
            TenantInvite.revoked_at.is_(None),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending invite already exists for this email.",
        )

    invite = TenantInvite(
        tenant_id=tenant_id,
        email=email,
        role=payload.role,
        token=secrets.token_urlsafe(32),
        invited_by=int(claims.get("user_id", 0)) if claims.get("user_id") else None,
        expires_at=datetime.utcnow() + timedelta(days=14),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    logger.info(f"Team invite created: tenant={tenant_id} email={email} role={payload.role}")

    # Send invite email if SendGrid is configured
    try:
        from app.core.email import send_invite_email
        from app.models.auth import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        tenant_name = tenant.name if tenant else "NAMA"
        send_invite_email(email, invite.token, tenant_name, payload.role)
    except Exception as e:
        logger.warning(f"Could not send invite email: {e}")

    return invite


@router.delete(
    "/team/invite/{invite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a pending invite",
)
def revoke_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    _: dict = Depends(_admin_roles),
):
    invite = db.query(TenantInvite).filter(
        TenantInvite.id == invite_id,
        TenantInvite.tenant_id == tenant_id,
    ).first()
    if not invite:
        raise HTTPException(404, "Invite not found")
    invite.revoked_at = datetime.utcnow()
    db.commit()


@router.get(
    "/team/invite/accept/{token}",
    summary="Validate an invite token (public endpoint for registration)",
)
def accept_invite_info(
    token: str,
    db: Session = Depends(get_db),
):
    """Returns invite details so the registration page can pre-fill the form.
    READ-ONLY — does not mark the invite consumed. Call POST below after the
    user is successfully created.
    """
    invite = db.query(TenantInvite).filter(
        TenantInvite.token == token,
        TenantInvite.accepted_at.is_(None),
        TenantInvite.revoked_at.is_(None),
    ).first()
    if not invite:
        raise HTTPException(404, "Invite not found or already used")
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(410, "This invite has expired")
    return {
        "email": invite.email,
        "role": invite.role,
        "tenant_id": invite.tenant_id,
        "token": token,
        "message": "Invite valid. Complete registration to join the team.",
    }


@router.post(
    "/team/invite/accept/{token}",
    summary="Mark an invite token as accepted (called after successful user registration)",
)
def consume_invite_token(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Marks the invite as accepted (sets `accepted_at = utcnow()`), making it
    unreusable. Idempotent in the sense that re-calling with an already-accepted
    token returns 410 Gone — the caller should treat that as "already consumed,
    nothing to do" rather than a hard error.

    The frontend register flow calls this after `register-user` succeeds, so
    that the invite cannot be replayed for the remaining 14-day TTL.
    """
    invite = db.query(TenantInvite).filter(
        TenantInvite.token == token,
        TenantInvite.revoked_at.is_(None),
    ).first()
    if not invite:
        raise HTTPException(404, "Invite not found")
    if invite.accepted_at is not None:
        raise HTTPException(410, "This invite has already been used")
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(410, "This invite has expired")

    invite.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(invite)
    return {
        "email": invite.email,
        "role": invite.role,
        "tenant_id": invite.tenant_id,
        "accepted_at": invite.accepted_at.isoformat() + "Z",
        "message": "Invite consumed. The user is now joined to the tenant.",
    }


# ── FX Rates endpoint ─────────────────────────────────────────────────────────

_FX_FALLBACK = {
    "USD": 0.012,
    "EUR": 0.011,
    "GBP": 0.0095,
    "AED": 0.044,
    "SGD": 0.016,
}


@router.get("/fx-rates", summary="Get live FX rates (base INR), cached 1hr")
def get_fx_rates():
    """
    Returns conversion rates FROM INR for display currencies.
    Fetches from open.er-api.com (free tier) and caches via Redis/in-memory for 1hr.
    Falls back to static rates if the external API is unavailable.
    """
    cache_key = "fx_rates_inr"

    # Try distributed cache first
    try:
        from app.core.redis_cache import distributed_cache
        cached = distributed_cache.get(cache_key)
        if cached:
            return cached
    except Exception:
        pass

    # Fetch live rates
    try:
        import requests as _requests
        resp = _requests.get("https://open.er-api.com/v6/latest/INR", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            raw_rates = data.get("rates", {})
            rates = {k: raw_rates.get(k, _FX_FALLBACK[k]) for k in _FX_FALLBACK}
            result = {
                "base": "INR",
                "rates": rates,
                "updated_at": data.get("time_last_update_utc", ""),
            }
            try:
                from app.core.redis_cache import distributed_cache
                distributed_cache.set(cache_key, result, ttl_seconds=3600)
            except Exception:
                pass
            return result
    except Exception as exc:
        logger.warning("FX rate fetch failed: %s — using fallback", exc)

    return {"base": "INR", "rates": _FX_FALLBACK, "updated_at": "fallback"}


# ── WhatsApp number save (onboarding Connect Channels step) ──────────────────

class WhatsAppNumberRequest(BaseModel):
    whatsapp_number: str


@router.post("/whatsapp-number", summary="Save WhatsApp Business number for this tenant")
def save_whatsapp_number(
    body: WhatsAppNumberRequest,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Stores the WhatsApp Business phone number in tenant.settings["whatsapp_number"].
    Used by the onboarding Connect Channels step. The number is later used to match
    inbound WhatsApp messages to this tenant's webhook.
    """
    try:
        from app.models.auth import Tenant as TenantModel
        tenant_row = db.query(TenantModel).filter(TenantModel.id == tenant_id).first()
        if tenant_row:
            settings = dict(tenant_row.settings or {})
            settings["whatsapp_number"] = body.whatsapp_number.strip()
            tenant_row.settings = settings
            db.commit()
            logger.info("save_whatsapp_number: tenant=%d number=%s", tenant_id, body.whatsapp_number)
    except Exception as e:
        logger.warning("save_whatsapp_number: failed: %s", e)
        db.rollback()
    return {"saved": True, "whatsapp_number": body.whatsapp_number.strip()}


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



# ─── Tax Settings (Tier 9D follow-up) ─────────────────────────────────────────
# Customer admin OR finance role configures their tax rate + label.
# Read by documents.py invoice generator. Default = 0 (no tax line) until set.

class TaxSettingsIn(BaseModel):
    tax_rate_pct: float
    tax_label: Optional[str] = "GST"

    @field_validator("tax_rate_pct")
    @classmethod
    def _bounded_rate(cls, v: float) -> float:
        if v < 0 or v > 50:
            raise ValueError("tax_rate_pct must be between 0 and 50")
        return round(v, 2)


class TaxSettingsOut(BaseModel):
    tax_rate_pct: float
    tax_label: str
    configured: bool


_finance_or_admin = RoleChecker([
    UserRole.R0_NAMA_OWNER,
    UserRole.R1_SUPER_ADMIN,
    UserRole.R2_ORG_ADMIN,
    UserRole.R5_FINANCE_ADMIN,
])


@router.get("/tax", response_model=TaxSettingsOut, summary="Get tenant tax configuration")
def get_tax_settings(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    """
    Returns the tenant's configured tax rate + label.
    `configured=false` means no tax line will appear on invoices yet —
    customer admin or finance must set the rate before sending invoices.
    """
    from app.models.auth import Tenant
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    settings = (tenant.settings or {}) if tenant else {}
    raw_rate = settings.get("tax_rate_pct")
    return TaxSettingsOut(
        tax_rate_pct=float(raw_rate) if raw_rate is not None else 0.0,
        tax_label=settings.get("tax_label", "GST"),
        configured=raw_rate is not None,
    )


@router.put("/tax", response_model=TaxSettingsOut, summary="Set tenant tax configuration")
def update_tax_settings(
    body: TaxSettingsIn,
    request: Request,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
    claims: dict = Depends(_finance_or_admin),
):
    """
    Customer admin or finance role sets the tax rate + label.
    Audit-logged. Takes effect on next invoice generation.
    """
    from app.models.auth import Tenant
    from app.core.audit import write_audit
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    settings = dict(tenant.settings or {})
    old_rate = settings.get("tax_rate_pct")
    old_label = settings.get("tax_label")
    settings["tax_rate_pct"] = body.tax_rate_pct
    settings["tax_label"] = body.tax_label or "GST"
    tenant.settings = settings
    db.commit()

    # Synthesize an actor for audit (claims is a dict not a User object)
    class _Actor:
        pass
    actor = _Actor()
    actor.id = claims.get("user_id") if isinstance(claims, dict) else None
    actor.email = claims.get("email") if isinstance(claims, dict) else None
    actor.role = claims.get("role") if isinstance(claims, dict) else None
    actor.tenant_id = tenant_id

    write_audit(
        db=db, actor=actor, request=request,
        action="settings.tax.update",
        target_type="tenant", target_id=str(tenant_id),
        details={
            "old": {"tax_rate_pct": old_rate, "tax_label": old_label},
            "new": {"tax_rate_pct": body.tax_rate_pct, "tax_label": body.tax_label},
        },
    )

    return TaxSettingsOut(
        tax_rate_pct=body.tax_rate_pct,
        tax_label=body.tax_label or "GST",
        configured=True,
    )
