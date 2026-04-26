"""
HS-1: Authentication Endpoints
--------------------------------
Endpoints:
  POST /api/v1/login   — email+password → access token (header) + refresh token (httpOnly cookie)
  POST /api/v1/refresh — valid refresh cookie → new access token + rotated refresh cookie
  POST /api/v1/logout  — clears refresh cookie

Acceptance Gate (HS-1):
  ✓ Unauthenticated request returns 401
  ✓ Expired token returns 401
  ✓ Valid token passes with tenant_id, role, user_id in payload
  ✓ Cross-tenant token rejected
  ✓ Refresh endpoint issues new access token and rotates refresh token
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.models.auth import User
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from pydantic import BaseModel

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    tenant_id: int
    role: str
    email: str


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    tenant_id: int
    role: str = "R4_OPS_EXECUTIVE"


# ── Helpers ───────────────────────────────────────────────────────────────────

COOKIE_NAME = "nama_refresh_token"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=True,        # HTTPS only in production
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/api/v1/refresh",   # Scoped so cookie not sent on every request
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/api/v1/refresh")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Authenticate with email + password.
    Returns access token in JSON body; refresh token in httpOnly cookie.

    Tier 9B: writes auth.login.success / auth.login.failure to audit_log.
    """
    from app.core.audit import write_audit

    user: Optional[User] = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        # Audit failed login (without leaking which side failed).
        write_audit(
            db=db,
            actor=user,  # may be None
            action="auth.login.failure",
            target_type="email",
            target_id=form_data.username,
            outcome="failure",
            error_message="invalid_credentials",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        write_audit(
            db=db, actor=user,
            action="auth.login.failure", outcome="failure",
            error_message="account_deactivated",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )

    write_audit(
        db=db, actor=user,
        action="auth.login.success",
        request=request,
    )

    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

    access_token = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=role_str,
        email=user.email,
    )
    refresh_token = create_refresh_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=role_str,
        email=user.email,
    )

    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=role_str,
        email=user.email,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
):
    """
    Exchange a valid refresh token cookie for a new access token.
    Rotates the refresh token (old one is implicitly invalidated via expiry).

    Acceptance Gate: Returns 401 if cookie missing, expired, or tampered.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        from jose import JWTError
        payload = decode_refresh_token(refresh_token)
    except Exception:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Verify user still exists and is active
    user: Optional[User] = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user or not user.is_active:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or deactivated")

    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

    new_access = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=role_str,
        email=user.email,
    )
    new_refresh = create_refresh_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=role_str,
        email=user.email,
    )

    _set_refresh_cookie(response, new_refresh)

    return TokenResponse(
        access_token=new_access,
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=role_str,
        email=user.email,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    """Clear the refresh cookie."""
    _clear_refresh_cookie(response)
    return


# ── Atomic org + admin-user registration ─────────────────────────────────────
# This single-call endpoint replaces the previous 2-call frontend flow
# (register-org → register-user) which left orphan tenants when the second
# call failed (e.g., 409 on duplicate email). Both writes happen in a single
# transaction with rollback on either failure.

class RegisterOrgRequest(BaseModel):
    organization_name: str
    admin_email: str
    admin_password: str
    admin_full_name: Optional[str] = None


@router.post("/register-organization", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_organization(
    payload: RegisterOrgRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Atomic organization + admin-user registration. Single transaction. If any
    step fails, NOTHING is committed — caller can retry safely without
    creating orphan tenants. On success returns access token + sets refresh
    cookie so the new admin is logged in without a separate /login call.
    """
    import re
    import secrets
    from app.models.auth import Tenant, TenantType, UserRole

    # 1. Reject duplicate email up-front to avoid creating a tenant we can't use.
    if db.query(User).filter(User.email == payload.admin_email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    if not payload.organization_name.strip():
        raise HTTPException(status_code=422, detail="Organization name is required")
    if len(payload.admin_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    # 2. Derive a unique org_code from the name. 4-char-name-prefix + 4 random hex.
    slug = re.sub(r"[^A-Z0-9]", "", payload.organization_name.upper())[:4] or "ORG"
    org_code = f"{slug}-{secrets.token_hex(2).upper()}"

    # 3. Atomic create: tenant first (need its id), then user. db.flush() on the
    # tenant gets us tenant.id without committing; if user creation throws,
    # rollback wipes the tenant too.
    try:
        new_tenant = Tenant(
            name=payload.organization_name.strip(),
            type=TenantType.TRAVEL_COMPANY,
            org_code=org_code,
            base_currency="INR",
            parent_id=None,
            status="ACTIVE",
            settings={},
        )
        db.add(new_tenant)
        db.flush()  # populates new_tenant.id without committing

        admin_user = User(
            email=payload.admin_email,
            hashed_password=hash_password(payload.admin_password),
            full_name=payload.admin_full_name or payload.admin_email.split("@")[0],
            tenant_id=new_tenant.id,
            role=UserRole.R2_ORG_ADMIN,
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        db.refresh(new_tenant)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {exc}")

    role_str = admin_user.role.value if hasattr(admin_user.role, "value") else str(admin_user.role)

    # 4. Issue tokens — admin is logged in immediately.
    access_token = create_access_token(
        user_id=admin_user.id,
        tenant_id=admin_user.tenant_id,
        role=role_str,
        email=admin_user.email,
    )
    refresh_token = create_refresh_token(
        user_id=admin_user.id,
        tenant_id=admin_user.tenant_id,
        role=role_str,
        email=admin_user.email,
    )
    _set_refresh_cookie(response, refresh_token)

    # 5. Best-effort welcome drip — never blocks registration.
    try:
        from app.api.v1.onboarding import _send_drip_email
        _send_drip_email(admin_user.email, admin_user.full_name or admin_user.email, new_tenant.name, day=0)
    except Exception:
        pass

    return TokenResponse(
        access_token=access_token,
        user_id=admin_user.id,
        tenant_id=admin_user.tenant_id,
        role=role_str,
        email=admin_user.email,
    )


@router.post("/register-user", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserCreate,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Create a new user with a hashed password.
    Returns tokens immediately so the user is logged in after registration.
    In production, gate this endpoint behind an admin role or invitation token.
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    from app.models.auth import UserRole
    try:
        role_enum = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid role: {payload.role}")

    new_user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        tenant_id=payload.tenant_id,
        role=role_enum,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Fire Day 0 drip email — best-effort, never blocks registration
    try:
        from app.api.v1.onboarding import _send_drip_email
        tenant = db.query(User).filter(User.id == new_user.id).first()
        agency_name = "Your Agency"
        try:
            from app.models.auth import Tenant as TenantModel
            tenant_row = db.query(TenantModel).filter(TenantModel.id == new_user.tenant_id).first()
            if tenant_row:
                agency_name = tenant_row.name
        except Exception:
            pass
        _send_drip_email(new_user.email, new_user.full_name or new_user.email, agency_name, day=0)
    except Exception:
        pass  # drip failure never breaks registration

    access_token = create_access_token(
        user_id=new_user.id,
        tenant_id=new_user.tenant_id,
        role=payload.role,
        email=new_user.email,
    )
    refresh_token = create_refresh_token(
        user_id=new_user.id,
        tenant_id=new_user.tenant_id,
        role=payload.role,
        email=new_user.email,
    )
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user_id=new_user.id,
        tenant_id=new_user.tenant_id,
        role=payload.role,
        email=new_user.email,
    )


# ── Forgot Password ───────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ForgotPasswordResponse(BaseModel):
    message: str


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset link.

    Security: Always returns 200 regardless of whether the email exists,
    to prevent email enumeration attacks. In production, send a reset
    email via SendGrid/SES with a short-lived signed token.
    """
    import logging
    logger = logging.getLogger(__name__)

    # Look up user (silently ignore if not found — anti-enumeration)
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()

    if user and user.is_active:
        # In production: generate a reset token and send via email
        # For MVP: log the action (real email sending wired in M16 Comms)
        import secrets as _secrets
        reset_token = _secrets.token_urlsafe(32)
        logger.info(
            "Password reset requested for user_id=%s email=%s token_prefix=%s",
            user.id, user.email, reset_token[:8]
        )
        # TODO (M16): call email service
        # email_service.send_reset_link(user.email, reset_token)

    # Always return success — prevents email enumeration
    return ForgotPasswordResponse(
        message="If that email address is registered, you'll receive a reset link shortly."
    )
