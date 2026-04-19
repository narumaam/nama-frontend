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
  POST   /import                → bulk CSV/Excel import
  GET    /import/template       → download blank CSV template
"""

import io
import logging
import re
from typing import List, Optional, Any, Dict

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant, RoleChecker
from app.models.auth import UserRole
from app.models.vendors import Vendor, VendorRate, VendorCategory, VendorStatus, RateVisibility

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
    markup_amount: Optional[float] = None
    # Child pricing
    cost_net_child: Optional[float] = None
    child_age_min: Optional[int] = None
    child_age_max: Optional[int] = None
    # DMC marketplace
    is_public: bool = False
    visibility_type: str = "PRIVATE"
    # Computed gross rates (read-only)
    price_gross: Optional[float] = None
    price_gross_child: Optional[float] = None
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
    is_dmc: bool = False
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
    is_dmc: bool = False
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
    is_dmc: Optional[bool] = None
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
    markup_amount: Optional[float] = None           # flat override; takes precedence over markup_pct
    # Child pricing
    cost_net_child: Optional[float] = None
    child_age_min: Optional[int] = None
    child_age_max: Optional[int] = None
    # DMC marketplace
    is_public: bool = False
    visibility_type: str = "PRIVATE"
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
        is_dmc=body.is_dmc,
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
    public_only: Optional[bool] = Query(
        None,
        description="If true, return only rates marked is_public=True (DMC marketplace view)",
    ),
    tenant_payload = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    List rate cards for a vendor.

    Pass `?public_only=true` to retrieve only rates visible in the DMC marketplace
    (is_public=True). Those responses expose the gross rate only — the raw cost_net
    is still present here for the owning tenant's internal use; the marketplace
    consumer view should apply its own filtering if needed.
    """
    tenant_id = tenant_payload["tenant_id"]
    _get_vendor_or_404(vendor_id, tenant_id, db)
    q = db.query(VendorRate).filter(
        VendorRate.vendor_id == vendor_id,
        VendorRate.tenant_id == tenant_id,
    )
    if public_only:
        q = q.filter(VendorRate.is_public == True)  # noqa: E712
    rates = q.all()
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

    try:
        vis_enum = RateVisibility(body.visibility_type)
    except ValueError:
        vis_enum = RateVisibility.PRIVATE

    rate = VendorRate(
        vendor_id=vendor_id,
        tenant_id=tenant_id,
        season=body.season,
        description=body.description,
        category=cat_enum,
        cost_net=body.cost_net,
        currency=body.currency,
        markup_pct=body.markup_pct,
        markup_amount=body.markup_amount,
        cost_net_child=body.cost_net_child,
        child_age_min=body.child_age_min,
        child_age_max=body.child_age_max,
        is_public=body.is_public,
        visibility_type=vis_enum,
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


# ── Bulk Import ───────────────────────────────────────────────────────────────

# Column alias maps: each key is the canonical field name, values are accepted CSV headers.
_COLUMN_ALIASES: Dict[str, List[str]] = {
    "hotel_name":   ["hotel_name", "vendor_name", "property", "supplier_name", "name"],
    "description":  ["room_type", "description", "category_desc", "room_category", "product_desc"],
    "category":     ["category", "vendor_type", "supplier_type", "type"],
    "season":       ["season", "season_type", "rate_season"],
    "cost_net":     ["net_rate", "cost_net", "rate", "price", "net_price", "cost"],
    "currency":     ["currency", "cur", "ccy"],
    "valid_from":   ["valid_from", "start_date", "from", "effective_from", "date_from"],
    "valid_until":  ["valid_until", "end_date", "to", "effective_until", "date_to"],
    "markup_pct":   ["markup_pct", "markup", "markup_%", "margin_pct"],
    "markup_amount":["markup_amount", "flat_markup", "markup_flat"],
    "cost_net_child":["child_rate", "net_rate_child", "cost_net_child", "child_cost"],
    "child_age_min":["child_min_age", "child_age_min", "min_child_age"],
    "child_age_max":["child_max_age", "child_age_max", "max_child_age"],
    "country":      ["country", "vendor_country"],
    "city":         ["city", "vendor_city", "location"],
}


def _normalize_columns(df: pd.DataFrame) -> Dict[str, str]:
    """
    Build a mapping of {canonical_name: actual_df_column} by matching
    DataFrame columns (lowercased/stripped) against alias lists.
    Returns only found mappings.
    """
    # Normalise the actual column names in the df
    norm_map: Dict[str, str] = {}  # normalised_label → original column
    for col in df.columns:
        norm_map[col.lower().strip().replace(" ", "_")] = col

    canonical_to_df: Dict[str, str] = {}
    for canonical, aliases in _COLUMN_ALIASES.items():
        for alias in aliases:
            alias_norm = alias.lower().strip().replace(" ", "_")
            if alias_norm in norm_map:
                canonical_to_df[canonical] = norm_map[alias_norm]
                break  # first match wins

    return canonical_to_df


def _parse_date(value: Any) -> Optional[Any]:
    """Parse a single date value flexibly; return None on failure."""
    if value is None:
        return None
    if isinstance(value, str) and value.strip().lower() in ("nan", "none", ""):
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    try:
        parsed = pd.to_datetime(value, dayfirst=True, errors="raise")
        return parsed.to_pydatetime() if not pd.isna(parsed) else None
    except Exception:
        return None


def _safe_float(value: Any) -> Optional[float]:
    """Convert to float, stripping currency symbols; return None on failure."""
    if pd.isna(value):
        return None
    try:
        cleaned = re.sub(r"[^\d.\-]", "", str(value))
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None


def _safe_int(value: Any) -> Optional[int]:
    f = _safe_float(value)
    return int(f) if f is not None else None


def _get_or_create_vendor(
    name: str,
    tenant_id: int,
    country: Optional[str],
    city: Optional[str],
    db: Session,
    vendor_cache: Dict[str, Vendor],
) -> tuple[Vendor, bool]:
    """Return (vendor, was_created). Uses an in-memory cache to avoid repeated DB hits."""
    key = name.strip().lower()
    if key in vendor_cache:
        return vendor_cache[key], False

    vendor = db.query(Vendor).filter(
        Vendor.tenant_id == tenant_id,
        Vendor.name == name.strip(),
    ).first()

    if vendor:
        vendor_cache[key] = vendor
        return vendor, False

    # Generate a unique vendor_code (slugified name + short hash)
    slug = re.sub(r"[^a-z0-9]", "", name.lower())[:12]
    import hashlib
    suffix = hashlib.md5(f"{tenant_id}:{name}".encode()).hexdigest()[:6].upper()
    vendor_code = f"{slug.upper()}-{suffix}" if slug else f"V-{suffix}"

    vendor = Vendor(
        tenant_id=tenant_id,
        vendor_code=vendor_code,
        name=name.strip(),
        category=VendorCategory.HOTEL,
        status=VendorStatus.ACTIVE,
        country=country,
        city=city,
        tags=[],
    )
    db.add(vendor)
    db.flush()  # get vendor.id without committing yet
    vendor_cache[key] = vendor
    return vendor, True


@router.post("/import", summary="Bulk import vendor rates from CSV or Excel")
async def import_vendor_rates(
    file: UploadFile = File(...),
    tenant_payload=Depends(require_tenant),
    db: Session = Depends(get_db),
    _role=Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
):
    """
    Upload a CSV or Excel (.xlsx) file to bulk-create vendor rate cards.

    Flexible column matching: accepts common DMC export column names.
    Returns a summary of vendors found/created, rates inserted, and any
    rows that were skipped with reasons.
    """
    tenant_id = tenant_payload["tenant_id"]

    # ── 1. Read file into DataFrame ────────────────────────────────────────────
    content = await file.read()
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    try:
        if filename.endswith(".xlsx") or "spreadsheet" in content_type or "excel" in content_type:
            df = pd.read_excel(io.BytesIO(content), dtype=str)
        else:
            # Default: CSV (also handles .csv explicit ext)
            df = pd.read_csv(io.BytesIO(content), dtype=str)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse file: {exc}",
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty or has no rows.",
        )

    # ── 2. Normalise columns ───────────────────────────────────────────────────
    col_map = _normalize_columns(df)

    if "cost_net" not in col_map:
        detected = list(df.columns)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"No net rate column found. Accepted names: net_rate, cost_net, rate, price. "
                f"Columns detected in your file: {detected}"
            ),
        )

    if "hotel_name" not in col_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No vendor name column found. Accepted names: hotel_name, vendor_name, property. "
                f"Columns detected: {list(df.columns)}"
            ),
        )

    # ── 3. Process rows ────────────────────────────────────────────────────────
    vendors_created = 0
    vendors_found = 0
    rates_created = 0
    rows_skipped = 0
    errors: List[str] = []
    vendors_affected: List[str] = []
    vendor_cache: Dict[str, Any] = {}

    def _get(row: pd.Series, canonical: str, default: Any = None) -> Any:
        col = col_map.get(canonical)
        if col is None:
            return default
        val = row.get(col)
        if val is None:
            return default
        try:
            if pd.isna(val):
                return default
        except (TypeError, ValueError):
            pass
        # pandas with dtype=str can produce the literal string "nan"
        if isinstance(val, str) and val.strip().lower() in ("nan", "none", ""):
            return default
        return val

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # 1-indexed, +1 for header row

        # Vendor name (required)
        vendor_name = _get(row, "hotel_name")
        if not vendor_name or str(vendor_name).strip() == "":
            errors.append(f"Row {row_num}: vendor name missing — row skipped")
            rows_skipped += 1
            continue

        # Net rate (required)
        raw_cost_net = _get(row, "cost_net")
        cost_net = _safe_float(raw_cost_net)
        if cost_net is None:
            errors.append(f"Row {row_num}: net_rate missing or invalid ('{raw_cost_net}') — row skipped")
            rows_skipped += 1
            continue

        # Optional vendor location fields
        country = _get(row, "country") or None
        city = _get(row, "city") or None
        if country:
            country = str(country).strip()
        if city:
            city = str(city).strip()

        # Find or create vendor
        try:
            vendor, created = _get_or_create_vendor(
                name=str(vendor_name).strip(),
                tenant_id=tenant_id,
                country=country,
                city=city,
                db=db,
                vendor_cache=vendor_cache,
            )
        except Exception as exc:
            errors.append(f"Row {row_num}: could not create vendor '{vendor_name}' — {exc}")
            rows_skipped += 1
            continue

        if created:
            vendors_created += 1
        else:
            if vendor.name not in vendors_affected:
                vendors_found += 1

        if vendor.name not in vendors_affected:
            vendors_affected.append(vendor.name)

        # Category
        raw_cat = _get(row, "category", "HOTEL")
        try:
            cat_enum = VendorCategory(str(raw_cat).strip().upper())
        except ValueError:
            cat_enum = VendorCategory.HOTEL

        # Season
        season = str(_get(row, "season", "STANDARD")).strip().upper() or "STANDARD"

        # Description
        raw_desc = _get(row, "description")
        description = str(raw_desc).strip() if raw_desc else None

        # Currency
        currency = str(_get(row, "currency", "INR")).strip().upper() or "INR"

        # Dates
        valid_from = _parse_date(_get(row, "valid_from"))
        valid_until = _parse_date(_get(row, "valid_until"))

        raw_valid_from = _get(row, "valid_from")
        raw_valid_until = _get(row, "valid_until")
        if raw_valid_from and valid_from is None:
            errors.append(f"Row {row_num}: could not parse valid_from '{raw_valid_from}' — rate still imported")
        if raw_valid_until and valid_until is None:
            errors.append(f"Row {row_num}: could not parse valid_until '{raw_valid_until}' — rate still imported")

        # Markup
        markup_pct = _safe_float(_get(row, "markup_pct")) or 0.0
        markup_amount = _safe_float(_get(row, "markup_amount"))

        # Child pricing
        cost_net_child = _safe_float(_get(row, "cost_net_child"))
        child_age_min = _safe_int(_get(row, "child_age_min"))
        child_age_max = _safe_int(_get(row, "child_age_max"))

        rate = VendorRate(
            vendor_id=vendor.id,
            tenant_id=tenant_id,
            season=season,
            description=description,
            category=cat_enum,
            cost_net=cost_net,
            currency=currency,
            markup_pct=markup_pct,
            markup_amount=markup_amount,
            cost_net_child=cost_net_child,
            child_age_min=child_age_min,
            child_age_max=child_age_max,
            is_public=False,
            visibility_type=RateVisibility.PRIVATE,
            valid_from=valid_from,
            valid_until=valid_until,
        )
        db.add(rate)
        rates_created += 1

    # ── 4. Commit everything in one shot ──────────────────────────────────────
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Import commit failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during import: {exc}",
        )

    logger.info(
        f"Import complete: tenant={tenant_id} vendors_created={vendors_created} "
        f"vendors_found={vendors_found} rates={rates_created} skipped={rows_skipped}"
    )

    return {
        "summary": {
            "vendors_created": vendors_created,
            "vendors_found": vendors_found,
            "rates_created": rates_created,
            "rows_skipped": rows_skipped,
            "errors": errors,
        },
        "vendors_affected": vendors_affected,
    }


_TEMPLATE_CSV = """\
hotel_name,room_type,category,season,net_rate,currency,valid_from,valid_until,markup_pct,markup_amount,child_rate,child_min_age,child_max_age,country,city
Soneva Fushi,Water Villa with Pool,HOTEL,HIGH,45000,USD,01/01/2025,31/03/2025,15,,22500,5,11,Maldives,North Male Atoll
The Layar Villa,Two-Bedroom Pool Villa,HOTEL,LOW,28000,USD,01/05/2025,30/09/2025,12,,,,,Indonesia,Seminyak
Indigo Airlines,Economy Class,AIRLINE,STANDARD,8500,INR,01/01/2025,31/12/2025,10,,,,,,
"""


@router.get("/import/template", summary="Download blank CSV import template")
def get_import_template():
    """
    Returns a ready-to-fill CSV file showing the accepted column names
    and example rows so DMC operators know exactly what format to use.
    """
    return StreamingResponse(
        io.BytesIO(_TEMPLATE_CSV.encode("utf-8")),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=nama_rate_card_template.csv",
        },
    )


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
