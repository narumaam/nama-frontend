"""
DMC Marketplace API
--------------------
Cross-tenant read-only catalog of PUBLIC rates published by DMC vendors.

Key design decisions:
  - Requires a valid session (get_token_claims) but NO tenant restriction —
    this is intentionally cross-tenant so any agency can browse all DMC rates.
  - cost_net, markup_pct and markup_amount are NEVER returned to callers.
    Only the computed price_gross (and price_gross_child) are exposed.
  - POST /rates/{rate_id}/snap copies a public rate into the calling tenant's
    own vendor library.  The tenant pays the DMC's gross price (stored as
    cost_net=price_gross with 0 markup so the tenant can apply their own).

Endpoints:
  GET  /rates                       → paginated cross-tenant marketplace listing
  GET  /rates/{rate_id}             → single rate detail (no cost_net)
  POST /rates/{rate_id}/snap        → copy rate into caller's vendor library
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import get_token_claims, require_tenant
from app.models.vendors import Vendor, VendorCategory, VendorRate, VendorStatus, RateVisibility

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Pydantic Schemas ───────────────────────────────────────────────────────────

class MarketplaceVendorSummary(BaseModel):
    """Vendor fields safe to expose in the public marketplace."""
    id: int
    name: str
    category: str
    country: Optional[str] = None
    city: Optional[str] = None
    rating: Optional[float] = None
    is_verified: bool

    class Config:
        from_attributes = True


class MarketplaceRateOut(BaseModel):
    """
    Rate card as seen by marketplace consumers.
    cost_net / markup_pct / markup_amount are deliberately absent.
    """
    id: int
    vendor_id: int
    season: str
    description: Optional[str] = None
    category: str
    currency: str

    # Gross prices only — cost is never exposed
    price_gross: float
    price_gross_child: Optional[float] = None

    # Child age band
    child_age_min: Optional[int] = None
    child_age_max: Optional[int] = None

    # Validity window
    valid_from: Optional[Any] = None
    valid_until: Optional[Any] = None

    # Vendor summary (nested)
    vendor: MarketplaceVendorSummary

    class Config:
        from_attributes = True


class MarketplaceListResponse(BaseModel):
    rates: List[MarketplaceRateOut]
    total: int
    page: int
    per_page: int


class SnapResponse(BaseModel):
    vendor_id: int
    rate_id: int
    message: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_marketplace_query(
    db: Session,
    category: Optional[str] = None,
    country: Optional[str] = None,
    season: Optional[str] = None,
):
    """
    Core SQLAlchemy join: VendorRate ⋈ Vendor
    Conditions: is_public=True AND is_dmc=True
    Optional filters: category, country, season.
    """
    q = (
        db.query(VendorRate)
        .join(Vendor, VendorRate.vendor_id == Vendor.id)
        .filter(
            VendorRate.is_public == True,   # noqa: E712
            Vendor.is_dmc == True,          # noqa: E712
            Vendor.status != VendorStatus.BLOCKED,
        )
    )

    if category and category.upper() != "ALL":
        try:
            cat_enum = VendorCategory(category.upper())
            q = q.filter(VendorRate.category == cat_enum)
        except ValueError:
            pass  # unknown category — return everything

    if country:
        q = q.filter(Vendor.country.ilike(f"%{country}%"))

    if season:
        q = q.filter(VendorRate.season.ilike(f"%{season}%"))

    return q


def _rate_to_out(rate: VendorRate) -> MarketplaceRateOut:
    """
    Serialize a VendorRate to the marketplace-safe response model.
    Uses the model's computed properties so cost_net never leaks.
    """
    vendor = rate.vendor
    vendor_summary = MarketplaceVendorSummary(
        id=vendor.id,
        name=vendor.name,
        category=vendor.category.value if hasattr(vendor.category, "value") else str(vendor.category),
        country=vendor.country,
        city=vendor.city,
        rating=vendor.rating,
        is_verified=vendor.is_verified,
    )

    cat_str = rate.category.value if hasattr(rate.category, "value") else str(rate.category)

    return MarketplaceRateOut(
        id=rate.id,
        vendor_id=rate.vendor_id,
        season=rate.season,
        description=rate.description,
        category=cat_str,
        currency=rate.currency,
        price_gross=rate.price_gross,
        price_gross_child=rate.price_gross_child,
        child_age_min=rate.child_age_min,
        child_age_max=rate.child_age_max,
        valid_from=rate.valid_from,
        valid_until=rate.valid_until,
        vendor=vendor_summary,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get(
    "/rates",
    response_model=MarketplaceListResponse,
    summary="Browse DMC marketplace rates",
)
def list_marketplace_rates(
    category: Optional[str] = Query(None, description="Filter by VendorCategory (e.g. HOTEL, ACTIVITY)"),
    country: Optional[str]  = Query(None, description="Filter by vendor country (partial match)"),
    season: Optional[str]   = Query(None, description="Filter by season name (partial match)"),
    page: int               = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int           = Query(20, ge=1, le=100, description="Results per page (max 100)"),
    claims: dict            = Depends(get_token_claims),
    db: Session             = Depends(get_db),
):
    """
    Return paginated PUBLIC rates from ALL tenants' DMC vendors.

    - Requires a valid session but places no tenant restriction on results.
    - Never exposes cost_net, markup_pct, or markup_amount — only price_gross.
    - Supports filtering by category, country, and season.
    """
    q = _build_marketplace_query(db, category=category, country=country, season=season)

    total = q.count()

    offset = (page - 1) * per_page
    rates = (
        q.order_by(Vendor.is_verified.desc(), Vendor.rating.desc(), VendorRate.id)
        .offset(offset)
        .limit(per_page)
        .all()
    )

    logger.info(
        f"Marketplace browse: user={claims.get('user_id')} tenant={claims.get('tenant_id')} "
        f"category={category} country={country} season={season} page={page} total={total}"
    )

    return MarketplaceListResponse(
        rates=[_rate_to_out(r) for r in rates],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get(
    "/rates/{rate_id}",
    response_model=MarketplaceRateOut,
    summary="Get single DMC marketplace rate",
)
def get_marketplace_rate(
    rate_id: int,
    claims: dict    = Depends(get_token_claims),
    db: Session     = Depends(get_db),
):
    """
    Return detail for a single public DMC rate.

    - Raises 404 if the rate does not exist, is not public, or the vendor is
      not flagged as a DMC.
    - Never exposes cost_net, markup_pct, or markup_amount.
    """
    rate = (
        db.query(VendorRate)
        .join(Vendor, VendorRate.vendor_id == Vendor.id)
        .filter(
            VendorRate.id == rate_id,
            VendorRate.is_public == True,   # noqa: E712
            Vendor.is_dmc == True,          # noqa: E712
            Vendor.status != VendorStatus.BLOCKED,
        )
        .first()
    )

    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rate not found or not available in the marketplace",
        )

    return _rate_to_out(rate)


@router.post(
    "/rates/{rate_id}/snap",
    response_model=SnapResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Snap a marketplace rate into your vendor library",
)
def snap_marketplace_rate(
    rate_id: int,
    tenant_id: int  = Depends(require_tenant),
    claims: dict    = Depends(get_token_claims),
    db: Session     = Depends(get_db),
):
    """
    Copy a public DMC rate into the calling tenant's vendor library.

    Behaviour:
    - Looks up the public DMC rate (404 if unavailable).
    - Finds or creates a Vendor record in the tenant's account that mirrors
      the DMC vendor (matched by name).
    - Creates a new VendorRate for that tenant with:
        cost_net  = price_gross of the DMC rate (tenant pays the gross price)
        markup_pct = 0  (tenant may add their own markup later)
        is_public = False (private to the tenant's library by default)
    - Returns the new vendor_id and rate_id scoped to the calling tenant.

    The DMC's actual cost_net is never stored in the tenant's record —
    only the computed gross price is transferred.
    """
    # ── 1. Fetch the source marketplace rate ─────────────────────────────────
    source_rate = (
        db.query(VendorRate)
        .join(Vendor, VendorRate.vendor_id == Vendor.id)
        .filter(
            VendorRate.id == rate_id,
            VendorRate.is_public == True,   # noqa: E712
            Vendor.is_dmc == True,          # noqa: E712
            Vendor.status != VendorStatus.BLOCKED,
        )
        .first()
    )

    if not source_rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rate not found or not available in the marketplace",
        )

    source_vendor = source_rate.vendor

    # ── 2. Find or create a Vendor in the calling tenant's library ───────────
    existing_vendor = (
        db.query(Vendor)
        .filter(
            Vendor.tenant_id == tenant_id,
            Vendor.name == source_vendor.name,
            Vendor.status != VendorStatus.BLOCKED,
        )
        .first()
    )

    if existing_vendor:
        tenant_vendor = existing_vendor
        logger.info(
            f"Marketplace snap: reusing vendor id={tenant_vendor.id} "
            f"name='{tenant_vendor.name}' for tenant={tenant_id}"
        )
    else:
        # Generate a unique vendor_code for this tenant (DMC-<source_vendor_id>-<short_uuid>)
        short_uid = uuid.uuid4().hex[:8].upper()
        vendor_code = f"DMC-{source_vendor.id}-{short_uid}"

        # Ensure vendor_code uniqueness (extremely unlikely collision but be safe)
        while db.query(Vendor).filter(
            Vendor.tenant_id == tenant_id,
            Vendor.vendor_code == vendor_code,
        ).first():
            vendor_code = f"DMC-{source_vendor.id}-{uuid.uuid4().hex[:8].upper()}"

        tenant_vendor = Vendor(
            tenant_id=tenant_id,
            vendor_code=vendor_code,
            name=source_vendor.name,
            category=source_vendor.category,
            status=VendorStatus.ACTIVE,
            contact_name=source_vendor.contact_name,
            contact_email=source_vendor.contact_email,
            contact_phone=source_vendor.contact_phone,
            website=source_vendor.website,
            country=source_vendor.country,
            city=source_vendor.city,
            address=source_vendor.address,
            default_currency=source_vendor.default_currency,
            markup_pct=0.0,   # tenant sets their own markup later
            credit_days=source_vendor.credit_days,
            is_preferred=False,
            is_verified=source_vendor.is_verified,
            is_dmc=False,     # this copy lives in the tenant's private library
            tags=list(source_vendor.tags or []),
            notes=f"Snapped from DMC marketplace (vendor_id={source_vendor.id}, rate_id={source_rate.id})",
            rating=source_vendor.rating,
        )
        db.add(tenant_vendor)
        db.flush()  # get the new id without committing yet
        logger.info(
            f"Marketplace snap: created vendor id={tenant_vendor.id} "
            f"name='{tenant_vendor.name}' for tenant={tenant_id}"
        )

    # ── 3. Determine the gross price to carry over ───────────────────────────
    # The tenant pays the DMC's gross price.  We store it as cost_net with
    # 0 markup so the tenant can freely set their own markup on top.
    gross_price = source_rate.price_gross
    gross_price_child = source_rate.price_gross_child

    cat_enum = source_rate.category

    snapped_rate = VendorRate(
        vendor_id=tenant_vendor.id,
        tenant_id=tenant_id,
        season=source_rate.season,
        description=source_rate.description,
        category=cat_enum,
        cost_net=gross_price,              # tenant's cost = DMC's gross
        currency=source_rate.currency,
        markup_pct=0.0,                    # tenant adds their own markup later
        markup_amount=None,
        cost_net_child=gross_price_child,  # child cost = DMC's gross child price
        child_age_min=source_rate.child_age_min,
        child_age_max=source_rate.child_age_max,
        is_public=False,                   # private to this tenant by default
        visibility_type=RateVisibility.PRIVATE,
        valid_from=source_rate.valid_from,
        valid_until=source_rate.valid_until,
    )
    db.add(snapped_rate)
    db.commit()
    db.refresh(snapped_rate)

    logger.info(
        f"Marketplace snap: tenant={tenant_id} user={claims.get('user_id')} "
        f"source_rate={source_rate.id} → new_vendor={tenant_vendor.id} new_rate={snapped_rate.id}"
    )

    return SnapResponse(
        vendor_id=tenant_vendor.id,
        rate_id=snapped_rate.id,
        message=(
            f"Rate snapped successfully into your vendor library. "
            f"Vendor '{tenant_vendor.name}' is ready with 0% markup — "
            f"update it in the Vendors module to set your desired margin."
        ),
    )
