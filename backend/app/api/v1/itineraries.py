from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timezone
from typing import List, Optional

from app.db.session import get_db
from app.schemas.itinerary import ItineraryCreateRequest, ItineraryResponse
from app.models.itineraries import Itinerary, ItineraryStatus
from app.models.leads import Lead
from app.models.vendors import VendorRate, VendorCategory
from app.agents.itinerary import ItineraryAgent
from app.api.v1.deps import get_current_user, require_tenant
from app.core.rls import get_or_404, tenant_query
from app.core.redis_cache import distributed_cache

router = APIRouter()
itinerary_agent = ItineraryAgent()


@router.get("/rate-lookup")
async def rate_lookup(
    vendor_id: int = Query(..., description="Vendor ID to look up rates for"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format"),
    category: Optional[str] = Query(None, description="Optional vendor category filter"),
    tenant_id: int = Depends(require_tenant),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Look up the best matching VendorRate for a given vendor + date.

    Returns price_gross (not cost_net) to preserve margin masking.
    Prefers the narrowest (most specific) date range when multiple rates match.
    Returns found=false when no rate is on file.
    """
    # Parse the requested date
    try:
        lookup_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be in YYYY-MM-DD format")

    # Build the base query — tenant-scoped, vendor-scoped
    q = db.query(VendorRate).filter(
        VendorRate.vendor_id == vendor_id,
        VendorRate.tenant_id == tenant_id,
    )

    # Filter by category when provided
    if category:
        try:
            cat_enum = VendorCategory[category.upper()]
            q = q.filter(VendorRate.category == cat_enum)
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Unknown category: {category}")

    # Date range filter: include rates where valid_from <= date <= valid_until
    # Null valid_from / valid_until means "open-ended" (always valid)
    q = q.filter(
        or_(VendorRate.valid_from == None, VendorRate.valid_from <= lookup_date),  # noqa: E711
        or_(VendorRate.valid_until == None, VendorRate.valid_until >= lookup_date),  # noqa: E711
    )

    rates = q.all()

    if not rates:
        return {
            "found": False,
            "message": "No rate found for this vendor/date",
        }

    # Prefer the narrowest date range (most specific rate)
    # Rates with both bounds set are more specific than open-ended ones.
    # Score: 2 if both bounds present, 1 if one is present, 0 if neither.
    def specificity(r: VendorRate) -> int:
        score = 0
        if r.valid_from is not None:
            score += 1
        if r.valid_until is not None:
            score += 1
        return score

    best = max(rates, key=specificity)

    return {
        "found": True,
        "rate_id": best.id,
        "vendor_id": best.vendor_id,
        "description": best.description,
        "season": best.season,
        "price_gross": best.price_gross,
        "price_gross_child": best.price_gross_child,
        "child_age_min": best.child_age_min,
        "child_age_max": best.child_age_max,
        "currency": best.currency,
        "valid_from": best.valid_from.isoformat() if best.valid_from else None,
        "valid_until": best.valid_until.isoformat() if best.valid_until else None,
    }


class ItineraryOut(ItineraryResponse):
    """Itinerary response schema with DB fields."""
    id: int
    tenant_id: int
    lead_id: int
    status: str
    version: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("/generate", response_model=ItineraryOut, status_code=status.HTTP_201_CREATED)
async def generate_itinerary(
    request: ItineraryCreateRequest,
    tenant_id: int = Depends(require_tenant),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate an AI-powered itinerary for a lead and persist to database.
    This triggers the Itinerary Intelligence Agent (M8).

    Returns 201 Created with the full itinerary record.
    """
    # 1. Validate lead exists in same tenant
    lead = get_or_404(db, Lead, request.lead_id, tenant_id, "Lead not found")

    # 2. Generate the Itinerary via AI agent
    try:
        response = await itinerary_agent.generate_itinerary(
            request, tenant_id=tenant_id, db=db
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Itinerary generation failed: {str(e)}")

    # 3. Persist to database
    itinerary = Itinerary(
        tenant_id=tenant_id,
        lead_id=request.lead_id,
        created_by_user=current_user.id,
        title=response.title,
        destination=request.destination,
        duration_days=request.duration_days,
        traveler_count=request.traveler_count,
        travel_style=request.style,
        days_json=[day.model_dump() for day in response.days],
        total_price=response.total_price,
        currency=response.currency,
        status=ItineraryStatus.DRAFT,
        version=1,
        agent_reasoning=response.agent_reasoning,
        social_caption=response.social_post.caption if response.social_post else None,
        social_hooks=response.social_post.hooks if response.social_post else [],
        social_image_suggestions=response.social_post.image_suggestions if response.social_post else [],
    )

    db.add(itinerary)
    db.commit()
    db.refresh(itinerary)

    # Invalidate itineraries list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"itineraries:{tenant_id}:*")

    # 4. Return persisted itinerary
    return ItineraryOut(
        id=itinerary.id,
        tenant_id=itinerary.tenant_id,
        lead_id=itinerary.lead_id,
        title=itinerary.title,
        destination=itinerary.destination,
        duration_days=itinerary.duration_days,
        status=itinerary.status.value,
        version=itinerary.version,
        total_price=itinerary.total_price,
        currency=itinerary.currency,
        days_json=itinerary.days_json,
        social_caption=itinerary.social_caption,
        social_hooks=itinerary.social_hooks,
        agent_reasoning=itinerary.agent_reasoning,
        created_at=itinerary.created_at,
        updated_at=itinerary.updated_at,
        days=[],  # Return as parsed response
        social_post=ItineraryResponse(
            title=itinerary.title,
            days=[],
            total_price=itinerary.total_price,
            currency=itinerary.currency,
            agent_reasoning=itinerary.agent_reasoning,
            social_post=None,
        ).social_post if itinerary.social_caption else None,
    )


@router.get("/", response_model=List[ItineraryOut])
async def list_itineraries(
    tenant_id: int = Depends(require_tenant),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    List all itineraries for the current tenant (paginated) with 15-second TTL.
    """
    # Build cache key
    cache_key = f"itineraries:{tenant_id}:s{skip}:l{limit}"

    # Try cache hit
    cached = distributed_cache.get(cache_key)
    if cached is not None:
        return cached

    # Cache miss: execute query
    itineraries = (
        tenant_query(db, Itinerary, tenant_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = [
        ItineraryOut(
            id=it.id,
            tenant_id=it.tenant_id,
            lead_id=it.lead_id,
            title=it.title,
            destination=it.destination,
            duration_days=it.duration_days,
            status=it.status.value,
            version=it.version,
            total_price=it.total_price,
            currency=it.currency,
            days_json=it.days_json,
            social_caption=it.social_caption,
            social_hooks=it.social_hooks,
            agent_reasoning=it.agent_reasoning,
            created_at=it.created_at,
            updated_at=it.updated_at,
            days=[],
            social_post=None,
        )
        for it in itineraries
    ]

    # Cache the response with 15-second TTL
    distributed_cache.set(cache_key, result, ttl_seconds=15)
    return result


@router.get("/{itinerary_id}", response_model=ItineraryOut)
async def get_itinerary(
    itinerary_id: int,
    tenant_id: int = Depends(require_tenant),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch a single itinerary by ID (tenant-scoped).
    """
    itinerary = get_or_404(db, Itinerary, itinerary_id, tenant_id, "Itinerary not found")

    return ItineraryOut(
        id=itinerary.id,
        tenant_id=itinerary.tenant_id,
        lead_id=itinerary.lead_id,
        title=itinerary.title,
        destination=itinerary.destination,
        duration_days=itinerary.duration_days,
        status=itinerary.status.value,
        version=itinerary.version,
        total_price=itinerary.total_price,
        currency=itinerary.currency,
        days_json=itinerary.days_json,
        social_caption=itinerary.social_caption,
        social_hooks=itinerary.social_hooks,
        agent_reasoning=itinerary.agent_reasoning,
        created_at=itinerary.created_at,
        updated_at=itinerary.updated_at,
        days=[],
        social_post=None,
    )


@router.patch("/{itinerary_id}", response_model=ItineraryOut)
async def update_itinerary_status(
    itinerary_id: int,
    status: str,
    tenant_id: int = Depends(require_tenant),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update itinerary status (e.g., DRAFT -> SENT, SENT -> ACCEPTED).
    """
    itinerary = get_or_404(db, Itinerary, itinerary_id, tenant_id, "Itinerary not found")

    # Validate status
    try:
        new_status = ItineraryStatus[status.upper()]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {[s.value for s in ItineraryStatus]}",
        )

    # Update status and timestamp
    itinerary.status = new_status
    if new_status == ItineraryStatus.SENT:
        itinerary.sent_at = datetime.now(timezone.utc)
    elif new_status == ItineraryStatus.ACCEPTED:
        itinerary.accepted_at = datetime.now(timezone.utc)
    elif new_status == ItineraryStatus.REJECTED:
        itinerary.rejected_at = datetime.now(timezone.utc)
    elif new_status == ItineraryStatus.EXPIRED:
        itinerary.expires_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(itinerary)

    # Invalidate itineraries list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"itineraries:{tenant_id}:*")

    return ItineraryOut(
        id=itinerary.id,
        tenant_id=itinerary.tenant_id,
        lead_id=itinerary.lead_id,
        title=itinerary.title,
        destination=itinerary.destination,
        duration_days=itinerary.duration_days,
        status=itinerary.status.value,
        version=itinerary.version,
        total_price=itinerary.total_price,
        currency=itinerary.currency,
        days_json=itinerary.days_json,
        social_caption=itinerary.social_caption,
        social_hooks=itinerary.social_hooks,
        agent_reasoning=itinerary.agent_reasoning,
        created_at=itinerary.created_at,
        updated_at=itinerary.updated_at,
        days=[],
        social_post=None,
    )


@router.delete("/{itinerary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_itinerary(
    itinerary_id: int,
    tenant_id: int = Depends(require_tenant),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Soft-delete an itinerary (sets status=EXPIRED).
    """
    itinerary = get_or_404(db, Itinerary, itinerary_id, tenant_id, "Itinerary not found")

    itinerary.status = ItineraryStatus.EXPIRED
    itinerary.expires_at = datetime.now(timezone.utc)

    db.commit()

    # Invalidate itineraries list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"itineraries:{tenant_id}:*")

    return None
