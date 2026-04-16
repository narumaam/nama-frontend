"""
NAMA Platform Admin — Bootstrap & Management Endpoints
──────────────────────────────────────────────────────
POST /api/v1/admin/bootstrap
  - One-time setup: creates NAMA platform tenant + owner + super admin
  - Protected: only works if NO R0_NAMA_OWNER exists yet
  - Call with: { "owner_password": "...", "super_admin_password": "..." }
  - Returns created user info (passwords NOT stored in response)

GET  /api/v1/admin/tenants   → list all tenants (R0/R1 only)
GET  /api/v1/admin/users     → list all users   (R0/R1 only)
GET  /api/v1/admin/stats     → platform stats   (R0/R1 only)
"""

import secrets
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.auth import Tenant, User, TenantType, UserRole
from app.core.security import hash_password
from app.api.v1.deps import get_token_claims, RoleChecker

router = APIRouter()

OWNER_ROLES = RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class BootstrapRequest(BaseModel):
    owner_password: Optional[str] = None       # leave blank for auto-generated
    super_admin_password: Optional[str] = None  # leave blank for auto-generated


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    tenant_id: int
    is_active: bool

    class Config:
        from_attributes = True


class TenantOut(BaseModel):
    id: int
    name: str
    type: str
    org_code: Optional[str]
    status: str

    class Config:
        from_attributes = True


class PlatformStats(BaseModel):
    total_tenants: int
    total_users: int
    active_users: int
    travel_companies: int


# ── Bootstrap ─────────────────────────────────────────────────────────────────

@router.post("/bootstrap", tags=["admin"])
def bootstrap_platform(
    payload: BootstrapRequest,
    db: Session = Depends(get_db),
):
    """
    One-time platform bootstrap. Creates NAMA platform tenant + owner + super admin.
    Returns 409 if platform is already bootstrapped (owner already exists).
    Call with no auth — this is the FIRST thing you run on a fresh DB.
    """
    # Guard: refuse if any R0_NAMA_OWNER already exists
    existing_owner = db.query(User).filter_by(role=UserRole.R0_NAMA_OWNER).first()
    if existing_owner:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Platform already bootstrapped. Owner account exists.",
        )

    # 1. Create platform tenant
    tenant = db.query(Tenant).filter_by(org_code="NAMA-PLATFORM").first()
    if not tenant:
        tenant = Tenant(
            name="NAMA Networks",
            type=TenantType.L1_OWNER,
            org_code="NAMA-PLATFORM",
            base_currency="INR",
            status="ACTIVE",
            settings={},
        )
        db.add(tenant)
        db.flush()

    # 2. Create owner
    owner_pw = payload.owner_password or ("NamaOwner@" + secrets.token_urlsafe(8))
    owner = User(
        tenant_id=tenant.id,
        email="narayan.mallapur@gmail.com",
        hashed_password=hash_password(owner_pw),
        full_name="Narayan Mallapur",
        role=UserRole.R0_NAMA_OWNER,
        is_active=True,
        profile_data={"bootstrapped": True},
    )
    db.add(owner)

    # 3. Create super admin
    sa_pw = payload.super_admin_password or ("NamaAdmin@" + secrets.token_urlsafe(8))
    super_admin = User(
        tenant_id=tenant.id,
        email="hello@getnama.app",
        hashed_password=hash_password(sa_pw),
        full_name="NAMA Super Admin",
        role=UserRole.R1_SUPER_ADMIN,
        is_active=True,
        profile_data={"bootstrapped": True},
    )
    db.add(super_admin)
    db.commit()

    return {
        "status": "bootstrapped",
        "platform_tenant": tenant.name,
        "owner": {
            "email": owner.email,
            "role": "R0_NAMA_OWNER",
            "password": owner_pw,   # shown once — save it!
        },
        "super_admin": {
            "email": super_admin.email,
            "role": "R1_SUPER_ADMIN",
            "password": sa_pw,       # shown once — save it!
        },
        "warning": "Save these passwords — they are shown only once.",
    }


# ── Tenant management ─────────────────────────────────────────────────────────

@router.get("/tenants", response_model=List[TenantOut], tags=["admin"])
def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    claims: dict = Depends(OWNER_ROLES),
):
    """List all tenants across the platform."""
    return db.query(Tenant).offset(skip).limit(limit).all()


@router.get("/users", response_model=List[UserOut], tags=["admin"])
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    claims: dict = Depends(OWNER_ROLES),
):
    """List all users across all tenants."""
    return db.query(User).offset(skip).limit(limit).all()


# ── Platform stats ────────────────────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStats, tags=["admin"])
def platform_stats(
    db: Session = Depends(get_db),
    claims: dict = Depends(OWNER_ROLES),
):
    """High-level platform stats for the owner/super-admin dashboard."""
    total_tenants = db.query(Tenant).count()
    total_users = db.query(User).count()
    active_users = db.query(User).filter_by(is_active=True).count()
    travel_cos = db.query(Tenant).filter_by(type=TenantType.L3_TRAVEL_CO).count()

    return PlatformStats(
        total_tenants=total_tenants,
        total_users=total_users,
        active_users=active_users,
        travel_companies=travel_cos,
    )
