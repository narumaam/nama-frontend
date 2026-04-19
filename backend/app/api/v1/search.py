"""Global search endpoint — cross-module ILIKE search."""
from typing import List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import require_tenant
from app.models.leads import Lead
from app.models.itineraries import Itinerary
from app.models.vendors import Vendor
from app.models.bookings import Booking

router = APIRouter()


class SearchResult(BaseModel):
    module: str
    id: int
    label: str
    subtitle: str
    url: str


class SearchResponse(BaseModel):
    leads: List[SearchResult] = []
    itineraries: List[SearchResult] = []
    vendors: List[SearchResult] = []
    bookings: List[SearchResult] = []
    quotations: List[SearchResult] = []
    total: int = 0


@router.get("/search", response_model=SearchResponse)
def global_search(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(5, le=10),
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """
    Cross-module full-text search using case-insensitive ILIKE.
    Returns up to `limit` results per module grouped by type.
    """
    pattern = f"%{q}%"
    results = SearchResponse()

    # Leads — search name, destination, email
    try:
        leads = db.query(Lead).filter(
            Lead.tenant_id == tenant_id,
            (
                Lead.full_name.ilike(pattern)
                | Lead.destination.ilike(pattern)
                | Lead.email.ilike(pattern)
            ),
        ).limit(limit).all()
        results.leads = [
            SearchResult(
                module="leads",
                id=l.id,
                label=l.full_name or f"Lead #{l.id}",
                subtitle=l.destination or "",
                url="/dashboard/leads",
            )
            for l in leads
        ]
    except Exception:
        pass

    # Itineraries — search title, destination
    try:
        itins = db.query(Itinerary).filter(
            Itinerary.tenant_id == tenant_id,
            (
                Itinerary.title.ilike(pattern)
                | Itinerary.destination.ilike(pattern)
            ),
        ).limit(limit).all()
        results.itineraries = [
            SearchResult(
                module="itineraries",
                id=i.id,
                label=i.title or f"Itinerary #{i.id}",
                subtitle=i.destination or "",
                url="/dashboard/itineraries",
            )
            for i in itins
        ]
    except Exception:
        pass

    # Vendors — search name, city
    try:
        vendors = db.query(Vendor).filter(
            Vendor.tenant_id == tenant_id,
            (
                Vendor.name.ilike(pattern)
                | Vendor.city.ilike(pattern)
            ),
        ).limit(limit).all()
        results.vendors = [
            SearchResult(
                module="vendors",
                id=v.id,
                label=v.name,
                subtitle=str(v.category) if v.category else "",
                url="/dashboard/vendors",
            )
            for v in vendors
        ]
    except Exception:
        pass

    # Bookings — flexible field matching since Booking model may vary
    try:
        bookings = db.query(Booking).filter(
            Booking.tenant_id == tenant_id,
        ).limit(limit * 4).all()
        filtered_bookings = [
            b for b in bookings
            if q.lower() in (getattr(b, "lead_name", "") or "").lower()
            or q.lower() in (getattr(b, "destination", "") or "").lower()
            or q.lower() in (getattr(b, "booking_ref", "") or "").lower()
        ][:limit]
        results.bookings = [
            SearchResult(
                module="bookings",
                id=b.id,
                label=getattr(b, "lead_name", None) or f"Booking #{b.id}",
                subtitle=getattr(b, "destination", "") or "",
                url="/dashboard/bookings",
            )
            for b in filtered_bookings
        ]
    except Exception:
        pass

    results.total = sum([
        len(results.leads),
        len(results.itineraries),
        len(results.vendors),
        len(results.bookings),
        len(results.quotations),
    ])
    return results
