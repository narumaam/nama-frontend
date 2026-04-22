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

from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
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
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Authenticate with email + password.
    Returns access token in JSON body; refresh token in httpOnly cookie.
    """
    user: Optional[User] = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
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

    from app.models.auth import Tenant as TenantModel
    tenant = db.query(TenantModel).filter(TenantModel.id == payload.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    from app.models.auth import UserRole
    try:
        role_enum = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid role: {payload.role}")

    try:
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
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create user account",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User registration failed",
        ) from exc

    # Fire Day 0 drip email — best-effort, never blocks registration
    try:
        from app.api.v1.onboarding import _send_drip_email
        agency_name = "Your Agency"
        try:
            if tenant:
                agency_name = tenant.name
        except Exception:
            pass
        _send_drip_email(new_user.email, new_user.full_name or new_user.email, agency_name, day=0)
    except Exception:
        pass  # drip failure never breaks registration

    access_token = create_access_token(
        user_id=new_user.id,
        tenant_id=new_user.tenant_id,
        role=role_enum.value,
        email=new_user.email,
    )
    refresh_token = create_refresh_token(
        user_id=new_user.id,
        tenant_id=new_user.tenant_id,
        role=role_enum.value,
        email=new_user.email,
    )
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user_id=new_user.id,
        tenant_id=new_user.tenant_id,
        role=role_enum.value,
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
