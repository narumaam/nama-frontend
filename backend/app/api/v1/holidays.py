"""
NAMA OS — Holiday Package API  v1.0
─────────────────────────────────────
Full CRUD for pre-packaged holiday products (fixed departure group tours).

Endpoints:
  GET    /holidays/packages              List packages with filters
  POST   /holidays/packages              Create a new package
  GET    /holidays/packages/featured     Public featured packages (no auth)
  GET    /holidays/packages/{id}         Get a single package
  PUT    /holidays/packages/{id}         Update a package
  DELETE /holidays/packages/{id}         Soft delete (is_active = False)
  POST   /holidays/packages/{id}/duplicate  Clone a package
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant
from app.models import holidays as _holidays_model  # noqa: F401  triggers ORM registration

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class HolidayPackageCreate(BaseModel):
    name:                 str
    destination:          str
    duration_days:        int = Field(ge=1, le=365)
    price_per_person:     float = Field(ge=0)
    max_pax:              Optional[int] = Field(None, ge=1)
    inclusions:           List[str] = []
    exclusions:           List[str] = []
    images:               List[Dict[str, Any]] = []
    tags:                 List[str] = []
    itinerary_template_id: Optional[int] = None
    is_active:            bool = True
    is_featured:          bool = False


class HolidayPackageUpdate(BaseModel):
    name:                 Optional[str] = None
    destination:          Optional[str] = None
    duration_days:        Optional[int] = Field(None, ge=1, le=365)
    price_per_person:     Optional[float] = Field(None, ge=0)
    max_pax:              Optional[int] = None
    inclusions:           Optional[List[str]] = None
    exclusions:           Optional[List[str]] = None
    images:               Optional[List[Dict[str, Any]]] = None
    tags:                 Optional[List[str]] = None
    itinerary_template_id: Optional[int] = None
    is_active:            Optional[bool] = None
    is_featured:          Optional[bool] = None


class HolidayPackageOut(BaseModel):
    id:                    int
    tenant_id:             int
    name:                  str
    destination:           str
    duration_days:         int
    price_per_person:      float
    max_pax:               Optional[int]
    inclusions:            List[Any]
    exclusions:            List[Any]
    images:                List[Any]
    tags:                  List[Any]
    itinerary_template_id: Optional[int]
    is_active:             bool
    is_featured:           bool
    created_at:            datetime
    updated_at:            Optional[datetime]

    class Config:
        from_attributes = True


# ─── Helper ───────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, pkg_id: int, tenant_id: int) -> Any:
    from app.models.holidays import HolidayPackage
    pkg = (
        db.query(HolidayPackage)
        .filter(
            HolidayPackage.id == pkg_id,
            HolidayPackage.tenant_id == tenant_id,
        )
        .first()
    )
    if not pkg:
        raise HTTPException(status_code=404, detail=f"Holiday package {pkg_id} not found")
    return pkg


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/packages", response_model=List[HolidayPackageOut])
def list_packages(
    destination: Optional[str] = Query(None),
    min_price:   Optional[float] = Query(None, ge=0),
    max_price:   Optional[float] = Query(None, ge=0),
    min_days:    Optional[int]   = Query(None, ge=1),
    max_days:    Optional[int]   = Query(None, ge=1),
    is_featured: Optional[bool]  = Query(None),
    skip:        int             = Query(0, ge=0),
    limit:       int             = Query(50, ge=1, le=200),
    tenant_id:   int             = Depends(require_tenant),
    db:          Session         = Depends(get_db),
) -> List[Any]:
    """List holiday packages with optional destination / price / duration filters."""
    from app.models.holidays import HolidayPackage

    q = db.query(HolidayPackage).filter(
        HolidayPackage.tenant_id == tenant_id,
        HolidayPackage.is_active == True,  # noqa: E712
    )

    if destination:
        q = q.filter(HolidayPackage.destination.ilike(f"%{destination}%"))
    if min_price is not None:
        q = q.filter(HolidayPackage.price_per_person >= min_price)
    if max_price is not None:
        q = q.filter(HolidayPackage.price_per_person <= max_price)
    if min_days is not None:
        q = q.filter(HolidayPackage.duration_days >= min_days)
    if max_days is not None:
        q = q.filter(HolidayPackage.duration_days <= max_days)
    if is_featured is not None:
        q = q.filter(HolidayPackage.is_featured == is_featured)

    return q.order_by(HolidayPackage.is_featured.desc(), HolidayPackage.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/packages/featured", response_model=List[HolidayPackageOut])
def list_featured_packages(
    limit: int     = Query(10, ge=1, le=50),
    db:    Session = Depends(get_db),
) -> List[Any]:
    """
    Public endpoint — no auth required.
    Returns featured active packages across all tenants (for public landing pages).
    """
    from app.models.holidays import HolidayPackage

    return (
        db.query(HolidayPackage)
        .filter(
            HolidayPackage.is_active == True,    # noqa: E712
            HolidayPackage.is_featured == True,  # noqa: E712
        )
        .order_by(HolidayPackage.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/packages", response_model=HolidayPackageOut, status_code=status.HTTP_201_CREATED)
def create_package(
    body:      HolidayPackageCreate,
    tenant_id: int     = Depends(require_tenant),
    db:        Session = Depends(get_db),
) -> Any:
    """Create a new holiday package."""
    from app.models.holidays import HolidayPackage

    pkg = HolidayPackage(
        tenant_id=tenant_id,
        name=body.name,
        destination=body.destination,
        duration_days=body.duration_days,
        price_per_person=body.price_per_person,
        max_pax=body.max_pax,
        inclusions=body.inclusions,
        exclusions=body.exclusions,
        images=body.images,
        tags=body.tags,
        itinerary_template_id=body.itinerary_template_id,
        is_active=body.is_active,
        is_featured=body.is_featured,
        created_at=datetime.now(timezone.utc),
    )
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    logger.info(f"Holiday package created: id={pkg.id} tenant={tenant_id} name={pkg.name!r}")
    return pkg


@router.get("/packages/{pkg_id}", response_model=HolidayPackageOut)
def get_package(
    pkg_id:    int,
    tenant_id: int     = Depends(require_tenant),
    db:        Session = Depends(get_db),
) -> Any:
    """Get a single holiday package by ID."""
    return _get_or_404(db, pkg_id, tenant_id)


@router.put("/packages/{pkg_id}", response_model=HolidayPackageOut)
def update_package(
    pkg_id:    int,
    body:      HolidayPackageUpdate,
    tenant_id: int     = Depends(require_tenant),
    db:        Session = Depends(get_db),
) -> Any:
    """Update a holiday package (partial update — only provided fields are changed)."""
    pkg = _get_or_404(db, pkg_id, tenant_id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pkg, field, value)

    pkg.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.delete("/packages/{pkg_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package(
    pkg_id:    int,
    tenant_id: int     = Depends(require_tenant),
    db:        Session = Depends(get_db),
) -> None:
    """Soft delete — sets is_active=False rather than removing from DB."""
    pkg = _get_or_404(db, pkg_id, tenant_id)
    pkg.is_active = False
    pkg.updated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info(f"Holiday package soft-deleted: id={pkg_id} tenant={tenant_id}")


@router.post("/packages/{pkg_id}/duplicate", response_model=HolidayPackageOut, status_code=status.HTTP_201_CREATED)
def duplicate_package(
    pkg_id:    int,
    tenant_id: int     = Depends(require_tenant),
    db:        Session = Depends(get_db),
) -> Any:
    """
    Clone an existing package.
    The copy is created as a DRAFT (is_active=False) with ' (Copy)' appended to the name.
    """
    from app.models.holidays import HolidayPackage

    source = _get_or_404(db, pkg_id, tenant_id)

    clone = HolidayPackage(
        tenant_id=tenant_id,
        name=f"{source.name} (Copy)",
        destination=source.destination,
        duration_days=source.duration_days,
        price_per_person=source.price_per_person,
        max_pax=source.max_pax,
        inclusions=list(source.inclusions or []),
        exclusions=list(source.exclusions or []),
        images=list(source.images or []),
        tags=list(source.tags or []),
        itinerary_template_id=source.itinerary_template_id,
        is_active=False,   # start as inactive draft
        is_featured=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    logger.info(f"Holiday package duplicated: source={pkg_id} clone={clone.id} tenant={tenant_id}")
    return clone
