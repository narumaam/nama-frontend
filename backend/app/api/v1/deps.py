"""
HS-1 + HS-2: Dependency Injection — Auth, Tenant Scope & Permission Checking
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

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import and_
from sqlalchemy.orm import Session

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


# ── Dynamic permission check (RBAC + ABAC) ────────────────────────────────────

def can(
    module: str,
    action: str,
    context: Optional[dict[str, Any]] = None,
):
    """
    FastAPI dependency factory for fine-grained permission checks.

    Usage:
        @router.get("/leads/export")
        def export_leads(_: dict = Depends(can("leads", "export"))):
            ...

        @router.get("/leads/{lead_id}")
        def get_lead(lead_id: int, _: dict = Depends(can("leads", "view_all", {"own_data_only_check": True}))):
            ...

    Resolution order (matches frontend Role Builder + /roles/check endpoint):
      1. User DENY override → HTTP 403 immediately
      2. User GRANT override → pass through
      3. Active role assignments → check role_permissions
      4. Default → HTTP 403
    """
    def _check(
        claims: dict    = Depends(get_token_claims),
        db:     Session = Depends(get_db),
    ) -> dict:
        # Import here to avoid circular imports (roles.py ↔ deps.py)
        from app.models.rbac import (
            UserPermissionOverride, UserRoleAssignment, RolePermission, Role,
        )
        from sqlalchemy import func

        user_id   = int(claims["user_id"])
        tenant_id = int(claims["tenant_id"])
        ctx       = context or {}
        now       = datetime.now(timezone.utc)

        # ── 1 + 2: Per-user overrides ────────────────────────────────────────
        override = db.query(UserPermissionOverride).filter(
            and_(
                UserPermissionOverride.user_id   == user_id,
                UserPermissionOverride.tenant_id == tenant_id,
                UserPermissionOverride.module    == module,
                UserPermissionOverride.action    == action,
            )
        ).first()

        if override and not (override.expires_at and override.expires_at < now):
            if override.state == "deny":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{module}:{action}' explicitly denied for this user",
                )
            if override.state == "grant":
                return claims

        # ── 3: Role-based check ──────────────────────────────────────────────
        assignments = db.query(UserRoleAssignment).filter(
            UserRoleAssignment.user_id   == user_id,
            UserRoleAssignment.tenant_id == tenant_id,
        ).all()

        role_ids = [a.role_id for a in assignments if not (a.expires_at and a.expires_at < now)]

        if role_ids:
            perms = (
                db.query(RolePermission)
                .join(Role, Role.id == RolePermission.role_id)
                .filter(
                    RolePermission.role_id.in_(role_ids),
                    RolePermission.module == module,
                    RolePermission.action == action,
                    RolePermission.state  != "off",
                )
                .order_by(Role.priority.asc())
                .all()
            )
            for perm in perms:
                if perm.state == "on":
                    return claims
                if perm.state == "conditional":
                    conditions = perm.conditions or {}
                    # Basic ABAC evaluation (mirrors _evaluate_abac in roles.py)
                    geo = conditions.get("geography", [])
                    if geo and ctx.get("geography") not in geo:
                        continue
                    pt = conditions.get("product_types", [])
                    if pt and ctx.get("product_type") not in pt:
                        continue
                    if conditions.get("own_data_only") and ctx.get("user_id") != ctx.get("target_user_id"):
                        continue
                    valid_until = conditions.get("valid_until")
                    if valid_until:
                        try:
                            cutoff = datetime.fromisoformat(valid_until).replace(tzinfo=timezone.utc)
                            if now > cutoff:
                                continue
                        except ValueError:
                            pass
                    return claims

        # ── 4: Default deny ──────────────────────────────────────────────────
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: '{module}:{action}'",
        )

    return _check


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
