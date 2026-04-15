"""
HS-1 + HS-2: Dependency Injection — Auth & Tenant Scope
---------------------------------------------------------
Every protected endpoint must use one of:
  - get_current_user      → full User object (DB lookup)
  - get_token_claims      → lightweight dict from JWT (no DB hit)
  - require_tenant        → returns tenant_id for RLS filtering
  - RoleChecker(roles)    → verify role from JWT claims, not DB

HS-1 Acceptance Gate:
  ✓ Missing/invalid/expired token → HTTP 401
  ✓ JWT payload carries user_id, tenant_id, role on every request

HS-2 Acceptance Gate:
  ✓ require_tenant() returns tenant_id from JWT (cannot be spoofed by request body)
  ✓ All DB queries filter by this tenant_id
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.models.auth import User, UserRole
from app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login")

_CREDS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


# ── Lightweight: extract claims from JWT (no DB hit) ──────────────────────────

def get_token_claims(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decode and validate the access token.
    Returns the full claims dict: user_id, tenant_id, role, sub (email).
    Raises 401 if token is missing, expired, or tampered.
    """
    try:
        claims = decode_access_token(token)
    except JWTError:
        raise _CREDS_EXCEPTION
    return claims


def require_tenant(claims: dict = Depends(get_token_claims)) -> int:
    """
    Return the tenant_id from the validated JWT.
    This is the single source of truth for RLS filtering — never trust
    tenant_id from the request body or URL parameters.
    """
    tenant_id = claims.get("tenant_id")
    if tenant_id is None:
        raise _CREDS_EXCEPTION
    return int(tenant_id)


# ── Full user object (DB lookup) — use when you need User relationships ────────

def get_current_user(
    claims: dict = Depends(get_token_claims),
    db: Session = Depends(get_db),
) -> User:
    """
    Fetch the full User row from DB.
    Use this when you need User.profile_data, User.settings, etc.
    For most endpoints, get_token_claims is sufficient and faster.
    """
    user_id = claims.get("user_id")
    if user_id is None:
        raise _CREDS_EXCEPTION

    user: Optional[User] = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
    ).first()

    if user is None:
        raise _CREDS_EXCEPTION
    return user


def get_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account deactivated")
    return user


# ── Role enforcement ──────────────────────────────────────────────────────────

class RoleChecker:
    """
    FastAPI dependency that enforces role membership from JWT claims.
    Does NOT hit the database.

    Usage:
        @router.get("/admin-only")
        def admin_endpoint(claims = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN"]))):
            ...
    """

    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, claims: dict = Depends(get_token_claims)) -> dict:
        role = claims.get("role")
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' is not authorised for this action. Required: {self.allowed_roles}",
            )
        return claims


# ── Cross-tenant guard ────────────────────────────────────────────────────────

def assert_same_tenant(resource_tenant_id: int, claims: dict) -> None:
    """
    Call this inside an endpoint after loading a resource to confirm the
    current user's tenant matches the resource's tenant.
    Raises 403 if they differ.

    Example:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        assert_same_tenant(booking.tenant_id, claims)
    """
    token_tenant_id = int(claims.get("tenant_id", -1))
    if resource_tenant_id != token_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to a resource outside your organisation is not permitted.",
        )
