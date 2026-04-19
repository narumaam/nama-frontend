"""
NAMA Platform Admin — Bootstrap & Management Endpoints
──────────────────────────────────────────────────────
POST /api/v1/admin/bootstrap
  - One-time setup: creates NAMA platform tenant + owner + super admin
  - Protected: only works if NO R0_NAMA_OWNER exists yet
  - Call with: { "owner_password": "...", "super_admin_password": "..." }
  - Returns created user info (passwords NOT stored in response)

GET  /api/v1/admin/tenants              → list all tenants (R0/R1 only)
GET  /api/v1/admin/users                → list all users   (R0/R1 only)
GET  /api/v1/admin/stats                → platform stats   (R0/R1 only)

# Super Owner endpoints (R0 only)
GET  /api/v1/admin/tenant-stats         → all tenants with rich usage + adoption data
GET  /api/v1/admin/tenant-stats/{id}    → single tenant detail
GET  /api/v1/admin/platform-stats       → platform-wide aggregate KPIs
"""

import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.auth import Tenant, User, TenantType, UserRole
from app.core.security import hash_password
from app.api.v1.deps import get_token_claims, RoleChecker, get_current_user

logger = logging.getLogger(__name__)

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


# ─────────────────────────────────────────────────────────────────────────────
# Super Owner (R0 only) — rich tenant usage + platform aggregate KPIs
# ─────────────────────────────────────────────────────────────────────────────

def _require_r0(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: only R0_NAMA_OWNER may access super-owner admin endpoints."""
    if current_user.role != UserRole.R0_NAMA_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access requires R0_NAMA_OWNER role",
        )
    return current_user


# ── Schemas ───────────────────────────────────────────────────────────────────

class TenantStats(BaseModel):
    id: int
    name: str
    org_code: Optional[str] = None
    status: str
    plan: str = "beta"
    created_at: Optional[datetime] = None
    # Usage
    user_count: int = 0
    lead_count: int = 0
    booking_count: int = 0
    quotation_count: int = 0
    total_revenue: float = 0.0
    # Activity
    last_activity: Optional[datetime] = None
    days_since_signup: int = 0
    # Feature adoption flags
    has_imported_leads: bool = False
    has_sent_quote: bool = False
    has_confirmed_booking: bool = False
    has_used_copilot: bool = False
    adoption_score: int = 0

    class Config:
        from_attributes = True


class RichPlatformStats(BaseModel):
    total_tenants: int
    active_tenants: int        # activity in last 7 days
    total_leads: int
    total_bookings: int
    total_revenue: float
    avg_adoption_score: float
    new_signups_7d: int
    new_signups_30d: int


# ── Helper: build stats for a single tenant ───────────────────────────────────

def _build_tenant_stats(t: Tenant, db: Session) -> TenantStats:
    now = datetime.now(timezone.utc)

    # user count
    user_count = db.query(User).filter(User.tenant_id == t.id).count()

    # leads
    lead_count = 0
    last_lead_at: Optional[datetime] = None
    try:
        from app.models.leads import Lead
        lead_count = db.query(Lead).filter(Lead.tenant_id == t.id).count()
        last_lead_row = (
            db.query(Lead.created_at)
            .filter(Lead.tenant_id == t.id)
            .order_by(Lead.created_at.desc())
            .first()
        )
        if last_lead_row:
            last_lead_at = last_lead_row[0]
    except Exception:
        pass

    # bookings
    booking_count = 0
    confirmed_booking_count = 0
    last_booking_at: Optional[datetime] = None
    total_revenue = 0.0
    try:
        from app.models.bookings import Booking
        from app.schemas.bookings import BookingStatus
        booking_count = db.query(Booking).filter(Booking.tenant_id == t.id).count()
        confirmed_booking_count = (
            db.query(Booking)
            .filter(Booking.tenant_id == t.id, Booking.status == BookingStatus.CONFIRMED)
            .count()
        )
        last_booking_row = (
            db.query(Booking.created_at)
            .filter(Booking.tenant_id == t.id)
            .order_by(Booking.created_at.desc())
            .first()
        )
        if last_booking_row:
            last_booking_at = last_booking_row[0]
        rev_row = (
            db.query(func.sum(Booking.total_price))
            .filter(Booking.tenant_id == t.id, Booking.status == BookingStatus.CONFIRMED)
            .scalar()
        )
        total_revenue = float(rev_row or 0.0)
    except Exception:
        pass

    # quotations
    quotation_count = 0
    try:
        from app.api.v1.quotations import Quotation
        quotation_count = (
            db.query(Quotation)
            .filter(Quotation.tenant_id == t.id, Quotation.is_deleted == False)
            .count()
        )
    except Exception:
        pass

    # copilot usage
    has_used_copilot = False
    try:
        from app.models.ai_usage import AIUsage
        has_used_copilot = (
            db.query(AIUsage).filter(AIUsage.tenant_id == t.id).count() > 0
        )
    except Exception:
        pass

    # last activity = most recent of lead/booking created_at
    candidates = [ts for ts in [last_lead_at, last_booking_at] if ts is not None]
    last_activity: Optional[datetime] = max(candidates) if candidates else None

    # days since signup
    days_since_signup = 0
    if t.created_at:
        created = t.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        days_since_signup = max(0, (now - created).days)

    # adoption flags
    has_imported_leads = lead_count > 2
    has_sent_quote = quotation_count > 0
    has_confirmed_booking = confirmed_booking_count > 0

    # adoption score (0-100)
    adoption_score = 0
    if has_imported_leads:
        adoption_score += 20
    if has_sent_quote:
        adoption_score += 20
    if has_confirmed_booking:
        adoption_score += 30
    if user_count > 1:
        adoption_score += 10
    if days_since_signup <= 7 and lead_count > 0:
        adoption_score += 20

    return TenantStats(
        id=t.id,
        name=t.name,
        org_code=t.org_code,
        status=t.status or "ACTIVE",
        plan="beta",
        created_at=t.created_at,
        user_count=user_count,
        lead_count=lead_count,
        booking_count=booking_count,
        quotation_count=quotation_count,
        total_revenue=total_revenue,
        last_activity=last_activity,
        days_since_signup=days_since_signup,
        has_imported_leads=has_imported_leads,
        has_sent_quote=has_sent_quote,
        has_confirmed_booking=has_confirmed_booking,
        has_used_copilot=has_used_copilot,
        adoption_score=adoption_score,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/tenant-stats", response_model=List[TenantStats], tags=["admin"])
def list_tenant_stats(
    _admin: User = Depends(_require_r0),
    db: Session = Depends(get_db),
) -> List[TenantStats]:
    """All tenants with rich usage + feature adoption stats. R0_NAMA_OWNER only."""
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    return [_build_tenant_stats(t, db) for t in tenants]


@router.get("/tenant-stats/{tenant_id}", response_model=TenantStats, tags=["admin"])
def get_tenant_stats(
    tenant_id: int,
    _admin: User = Depends(_require_r0),
    db: Session = Depends(get_db),
) -> TenantStats:
    """Single tenant detail with usage + feature adoption stats. R0_NAMA_OWNER only."""
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return _build_tenant_stats(t, db)


@router.get("/platform-stats", response_model=RichPlatformStats, tags=["admin"])
def get_rich_platform_stats(
    _admin: User = Depends(_require_r0),
    db: Session = Depends(get_db),
) -> RichPlatformStats:
    """Platform-wide aggregate KPIs. R0_NAMA_OWNER only."""
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    total_tenants = db.query(Tenant).count()
    new_signups_7d = db.query(Tenant).filter(Tenant.created_at >= seven_days_ago).count()
    new_signups_30d = db.query(Tenant).filter(Tenant.created_at >= thirty_days_ago).count()

    total_leads = 0
    total_bookings = 0
    total_revenue = 0.0
    active_tenant_ids: set = set()

    try:
        from app.models.leads import Lead
        total_leads = db.query(Lead).count()
        # tenants active in last 7d based on leads
        rows = (
            db.query(Lead.tenant_id)
            .filter(Lead.created_at >= seven_days_ago)
            .distinct()
            .all()
        )
        for r in rows:
            active_tenant_ids.add(r[0])
    except Exception:
        pass

    try:
        from app.models.bookings import Booking
        from app.schemas.bookings import BookingStatus
        total_bookings = db.query(Booking).count()
        rev = db.query(func.sum(Booking.total_price)).filter(
            Booking.status == BookingStatus.CONFIRMED
        ).scalar()
        total_revenue = float(rev or 0.0)
        # tenants active in last 7d based on bookings
        rows = (
            db.query(Booking.tenant_id)
            .filter(Booking.created_at >= seven_days_ago)
            .distinct()
            .all()
        )
        for r in rows:
            active_tenant_ids.add(r[0])
    except Exception:
        pass

    # avg adoption score — compute per tenant
    tenants = db.query(Tenant).all()
    scores = [_build_tenant_stats(t, db).adoption_score for t in tenants]
    avg_adoption_score = (sum(scores) / len(scores)) if scores else 0.0

    return RichPlatformStats(
        total_tenants=total_tenants,
        active_tenants=len(active_tenant_ids),
        total_leads=total_leads,
        total_bookings=total_bookings,
        total_revenue=total_revenue,
        avg_adoption_score=round(avg_adoption_score, 1),
        new_signups_7d=new_signups_7d,
        new_signups_30d=new_signups_30d,
    )
