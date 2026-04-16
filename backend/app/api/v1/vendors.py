"""
M6 — Vendor / Supplier Management API
---------------------------------------
Full CRUD for the Vendor directory: hotels, airlines, transfer operators,
activity providers, restaurants, cruise lines, insurance providers.

Each vendor belongs to a tenant (RLS enforced via require_tenant).
VendorRate records are managed via sub-routes.

Endpoints:
  GET    /                      → paginated + filtered vendor list
  POST   /                      → create new vendor
  GET    /{vendor_id}           → single vendor with rates
  PATCH  /{vendor_id}           → update vendor fields
  DELETE /{vendor_id}           → soft-delete (status → INACTIVE)
  GET    /{vendor_id}/rates     → list rate cards
  POST   /{vendor_id}/rates     → add rate card
  DELETE /{vendor_id}/rates/{rate_id} → remove rate card
  POST   /import                → bulk CSV import (future)
"""

import logging
from typing import List, Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant, RoleChecker
from app.models.auth import UserRole
from app.models.vendors import Vendor, VendorRate, VendorCategory, VendorStatus

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Pydantic Schemas ───────────────────────────────────────────────────────────

class VendorRateOut(BaseModel):
    id: int
    season: str
    description: Optional[str] = None
    category: str
    cost_net: float
    currency: str
    markup_pct: float
    valid_from: Optional[Any] = None
    valid_until: Optional[Any] = None

    class Config:
        from_attributes = True


class VendorOut(BaseModel):
    id: int
    tenant_id: int
    vendor_code: str
    name: str
    category: str
    status: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    default_currency: str
    markup_pct: float
    credit_days: int
    gst_number: Optional[str] = None
    is_preferred: bool
    is_verified: bool
    tags: List[str]
    notes: Optional[str] = None
    rating: Optional[float] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
    rates: List[VendorRateOut] = []

    class Config:
        from_attributes = True


class VendorCreate(BaseModel):
    vendor_code: str
    name: str
    category: str = "HOTEL"
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    default_currency: str = "INR"
    markup_pct: float = 0.0
    credit_days: int = 30
    gst_number: Optional[str] = None
    is_preferred: bool = False
    is_verified: bool = False
    tags: List[str] = []
    notes: Optional[str] = None
    rating: Optional[float] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    default_currency: Optional[str] = None
    markup_pct: Optional[float] = None
    credit_days: Optional[int] = None
    gst_number: Optional[str] = None
    is_preferred: Optional[bool] = None
    is_verified: Optional[bool] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    rating: Optional[float] = None


class VendorRateCreate(BaseModel):
    season: str
    description: Optional[str] = None
    category: str
    cost_net: float
    currency: str = "INR"
    markup_pct: float = 0.0
    valid_from: Optional[Any] = None
    valid_until: Optional[Any] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_vendor_or_404(vendor_id: int, tenant_id: int, db: Session) -> Vendor:
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.tenant_id == tenant_id,
        Vendor.status != VendorStatus.BLOCKED,
    ).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return vendor


# ── Vendor CRUD ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[VendorOut], summary="List vendors")
def list_vendors(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    is_preferred: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Return paginated, filtered vendor list for the current tenant.
    Filters: category, status, is_preferred, free-text search.
    """
    tenant_id = tenant_payload["tenant_id"]
    q = db.query(Vendor).filter(Vendor.tenant_id == tenant_id)

    if category and category != "ALL":
        q = q.filter(Vendor.category == category)
    if status_filter and status_filter != "ALL":
        q = q.filter(Vendor.status == status_filter)
    else:
        # By default, exclude BLOCKED vendors
        q = q.filter(Vendor.status != VendorStatus.BLOCKED)
    if is_preferred is not None:
        q = q.filter(Vendor.is_preferred == is_preferred)
    if search:
        term = f"%{search}%"
        q = q.filter(
            Vendor.name.ilike(term) |
            Vendor.vendor_code.ilike(term) |
            Vendor.city.ilike(term) |
            Vendor.country.ilike(term)
        )

    vendors = q.order_by(Vendor.is_preferred.desc(), Vendor.name).offset(skip).limit(limit).all()
    return vendors


@router.post("", response_model=VendorOut, status_code=status.HTTP_201_CREATED, summary="Create vendor")
def create_vendor(
    body: VendorCreate,
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
    _role = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
):
    """Create a new vendor in the directory."""
    tenant_id = tenant_payload["tenant_id"]

    # Enforce unique vendor_code per tenant
    existing = db.query(Vendor).filter(
        Vendor.tenant_id == tenant_id,
        Vendor.vendor_code == body.vendor_code,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Vendor code '{body.vendor_code}' already exists for this tenant",
        )

    try:
        category_enum = VendorCategory(body.category)
    except ValueError:
        category_enum = VendorCategory.OTHER

    vendor = Vendor(
        tenant_id=tenant_id,
        vendor_code=body.vendor_code,
        name=body.name,
        category=category_enum,
        status=VendorStatus.ACTIVE,
        contact_name=body.contact_name,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
        website=body.website,
        country=body.country,
        city=body.city,
        address=body.address,
        default_currency=body.default_currency,
        markup_pct=body.markup_pct,
        credit_days=body.credit_days,
        gst_number=body.gst_number,
        is_preferred=body.is_preferred,
        is_verified=body.is_verified,
        tags=body.tags or [],
        notes=body.notes,
        rating=body.rating,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    logger.info(f"Vendor created: tenant={tenant_id} id={vendor.id} name={vendor.name}")
    return vendor


@router.get("/{vendor_id}", response_model=VendorOut, summary="Get vendor detail")
def get_vendor(
    vendor_id: int,
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    tenant_id = tenant_payload["tenant_id"]
    return _get_vendor_or_404(vendor_id, tenant_id, db)


@router.patch("/{vendor_id}", response_model=VendorOut, summary="Update vendor")
def update_vendor(
    vendor_id: int,
    body: VendorUpdate,
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
    _role = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
):
    tenant_id = tenant_payload["tenant_id"]
    vendor = _get_vendor_or_404(vendor_id, tenant_id, db)

    update_data = body.model_dump(exclude_none=True)
    if "category" in update_data:
        try:
            update_data["category"] = VendorCategory(update_data["category"])
        except ValueError:
            update_data["category"] = VendorCategory.OTHER
    if "status" in update_data:
        try:
            update_data["status"] = VendorStatus(update_data["status"])
        except ValueError:
            del update_data["status"]

    for field, value in update_data.items():
        setattr(vendor, field, value)

    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Deactivate vendor")
def delete_vendor(
    vendor_id: int,
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
    _role = Depends(RoleChecker([UserRole.R2_ORG_ADMIN])),
):
    """Soft-delete: sets status to INACTIVE rather than removing the record."""
    tenant_id = tenant_payload["tenant_id"]
    vendor = _get_vendor_or_404(vendor_id, tenant_id, db)
    vendor.status = VendorStatus.INACTIVE
    db.commit()


# ── Rate Card Sub-routes ───────────────────────────────────────────────────────

@router.get("/{vendor_id}/rates", response_model=List[VendorRateOut], summary="List vendor rates")
def list_rates(
    vendor_id: int,
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    tenant_id = tenant_payload["tenant_id"]
    _get_vendor_or_404(vendor_id, tenant_id, db)
    rates = db.query(VendorRate).filter(
        VendorRate.vendor_id == vendor_id,
        VendorRate.tenant_id == tenant_id,
    ).all()
    return rates


@router.post(
    "/{vendor_id}/rates",
    response_model=VendorRateOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add rate card",
)
def add_rate(
    vendor_id: int,
    body: VendorRateCreate,
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
    _role = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
):
    tenant_id = tenant_payload["tenant_id"]
    _get_vendor_or_404(vendor_id, tenant_id, db)

    try:
        cat_enum = VendorCategory(body.category)
    except ValueError:
        cat_enum = VendorCategory.OTHER

    rate = VendorRate(
        vendor_id=vendor_id,
        tenant_id=tenant_id,
        season=body.season,
        description=body.description,
        category=cat_enum,
        cost_net=body.cost_net,
        currency=body.currency,
        markup_pct=body.markup_pct,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


@router.delete(
    "/{vendor_id}/rates/{rate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove rate card",
)
def delete_rate(
    vendor_id: int,
    rate_id: int,
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
    _role = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
):
    tenant_id = tenant_payload["tenant_id"]
    rate = db.query(VendorRate).filter(
        VendorRate.id == rate_id,
        VendorRate.vendor_id == vendor_id,
        VendorRate.tenant_id == tenant_id,
    ).first()
    if not rate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rate not found")
    db.delete(rate)
    db.commit()


# ── Stats endpoint (dashboard KPIs) ───────────────────────────────────────────

@router.get("/stats/summary", response_model=Dict[str, Any], summary="Vendor stats")
def vendor_stats(
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """Quick KPI summary: total, by category, preferred count, avg rating."""
    tenant_id = tenant_payload["tenant_id"]
    all_vendors = db.query(Vendor).filter(
        Vendor.tenant_id == tenant_id,
        Vendor.status == VendorStatus.ACTIVE,
    ).all()

    by_category: Dict[str, int] = {}
    total_rating = 0.0
    rated_count = 0
    preferred_count = 0

    for v in all_vendors:
        cat = v.category.value if hasattr(v.category, "value") else str(v.category)
        by_category[cat] = by_category.get(cat, 0) + 1
        if v.rating:
            total_rating += v.rating
            rated_count += 1
        if v.is_preferred:
            preferred_count += 1

    return {
        "total_active": len(all_vendors),
        "preferred_count": preferred_count,
        "avg_rating": round(total_rating / rated_count, 2) if rated_count else None,
        "by_category": by_category,
    }
