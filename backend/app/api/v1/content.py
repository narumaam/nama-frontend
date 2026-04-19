from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.schemas.content import (
    MediaAsset, MediaAssetCreate,
    Destination, DestinationCreate, DestinationWithOwnership,
    ContentBlock, ContentBlockCreate, ContentBlockWithOwnership,
    ImageSearchResponse, PexelsPhoto, ImageSaveRequest,
)
from app.models.content import MediaAsset as MediaAssetModel
from app.models.content import Destination as DestinationModel
from app.models.content import ContentBlock as ContentBlockModel
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import List, Optional
from app.core.redis_cache import distributed_cache
import os
import logging
import httpx

log = logging.getLogger(__name__)

router = APIRouter()

# ── Fallback travel images from Unsplash ─────────────────────────────────────
_UNSPLASH_FALLBACKS: List[PexelsPhoto] = [
    PexelsPhoto(id=i, url_medium=url + "?w=400", url_large=url + "?w=1200",
                photographer="Unsplash", photographer_url="https://unsplash.com",
                alt=alt)
    for i, (url, alt) in enumerate([
        ("https://images.unsplash.com/photo-1537996194471-e657df975ab4", "Bali temple reflection"),
        ("https://images.unsplash.com/photo-1514282401047-d79a71a590e8", "Maldives overwater bungalow"),
        ("https://images.unsplash.com/photo-1512453979798-5ea266f8880c", "Dubai skyline at sunset"),
        ("https://images.unsplash.com/photo-1528360983277-13d401cdc186", "Thailand beach"),
        ("https://images.unsplash.com/photo-1552465011-b4e21bf6e79a", "Sri Lanka tea plantations"),
        ("https://images.unsplash.com/photo-1528127269322-539801943592", "Vietnam Ha Long Bay"),
        ("https://images.unsplash.com/photo-1525625293386-3f8f99389edd", "Singapore skyline"),
        ("https://images.unsplash.com/photo-1523805009345-7448845a9e53", "Kenya savanna safari"),
        ("https://images.unsplash.com/photo-1506905925346-21bda4d32df4", "Switzerland alpine village"),
        ("https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e", "Japan cherry blossoms"),
        ("https://images.unsplash.com/photo-1548013146-72479768bada", "Taj Mahal India"),
        ("https://images.unsplash.com/photo-1502602898657-3e91760cbb34", "Paris Eiffel Tower"),
        ("https://images.unsplash.com/photo-1555400038-63f5ba517a47", "Santorini Greece"),
        ("https://images.unsplash.com/photo-1560472354-b33ff0c44a43", "Morocco desert dunes"),
        ("https://images.unsplash.com/photo-1570168007204-dfb528c6958f", "Peru Machu Picchu"),
        ("https://images.unsplash.com/photo-1541701494587-cb58502866ab", "Abstract travel light"),
        ("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1", "Mountain lake reflection"),
        ("https://images.unsplash.com/photo-1507525428034-b723cf961d3e", "Tropical beach"),
        ("https://images.unsplash.com/photo-1469474968028-56623f02e42e", "Lush forest waterfall"),
        ("https://images.unsplash.com/photo-1500534314209-a25ddb2bd429", "Road through nature"),
    ], 1)
]


# ── Media Assets ──────────────────────────────────────────────────────────────

@router.post("/assets", response_model=MediaAsset)
def create_asset(
    asset_in: MediaAssetCreate,
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
    db: Session = Depends(get_db)
):
    """
    Create a new media asset for the organization (M12).
    """
    db_asset = MediaAssetModel(**asset_in.model_dump())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.get("/assets", response_model=List[MediaAsset])
def list_assets(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all media assets for the current tenant.
    """
    return db.query(MediaAssetModel).filter(MediaAssetModel.tenant_id == current_user.tenant_id).all()


# ── Destinations ──────────────────────────────────────────────────────────────

@router.post("/destinations", response_model=Destination)
def create_destination(
    dest_in: DestinationCreate,
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Add a new destination to the organization's library (M12).
    """
    db_dest = DestinationModel(**dest_in.model_dump())
    db.add(db_dest)
    db.commit()
    db.refresh(db_dest)

    # Invalidate destinations list cache for this tenant on write
    distributed_cache.invalidate_pattern(f"destinations:{current_user.tenant_id}:*")
    return db_dest

@router.get("/destinations", response_model=List[DestinationWithOwnership])
def list_destinations(
    include_shared: bool = Query(False, description="When true, include NAMA master library destinations"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List destinations for the current tenant.
    When `include_shared=true`, also returns all is_shared=True destinations from other tenants,
    each annotated with is_own=False so the frontend can distinguish them.
    Results are cached for 300 seconds per tenant + shared combination.
    """
    cache_key = f"destinations:{current_user.tenant_id}:{'shared' if include_shared else 'own'}"

    cached = distributed_cache.get(cache_key)
    if cached is not None:
        return cached

    # Always fetch own destinations
    own_rows = (
        db.query(DestinationModel)
        .filter(DestinationModel.tenant_id == current_user.tenant_id)
        .all()
    )
    results: List[dict] = []
    for row in own_rows:
        d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
        d["is_own"] = True
        results.append(d)

    if include_shared:
        shared_rows = (
            db.query(DestinationModel)
            .filter(
                DestinationModel.is_shared == True,
                DestinationModel.tenant_id != current_user.tenant_id,
            )
            .all()
        )
        for row in shared_rows:
            d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
            d["is_own"] = False
            results.append(d)

    distributed_cache.set(cache_key, results, ttl_seconds=300)
    return results


# ── Content Blocks ────────────────────────────────────────────────────────────

@router.post("/blocks", response_model=ContentBlock)
def create_content_block(
    block_in: ContentBlockCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a reusable content block (M12).
    """
    db_block = ContentBlockModel(**block_in.model_dump())
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block

@router.get("/blocks", response_model=List[ContentBlockWithOwnership])
def list_content_blocks(
    category: Optional[str] = None,
    include_shared: bool = Query(False, description="When true, include NAMA master library content blocks"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List reusable content blocks, optionally filtered by category.
    When `include_shared=true`, also returns all is_shared=True blocks from other tenants,
    each annotated with is_own=False so the frontend can distinguish them.
    """
    # Own blocks
    own_query = db.query(ContentBlockModel).filter(ContentBlockModel.tenant_id == current_user.tenant_id)
    if category:
        own_query = own_query.filter(ContentBlockModel.category == category)
    own_rows = own_query.all()

    results: List[dict] = []
    for row in own_rows:
        d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
        d["is_own"] = True
        results.append(d)

    if include_shared:
        shared_query = (
            db.query(ContentBlockModel)
            .filter(
                ContentBlockModel.is_shared == True,
                ContentBlockModel.tenant_id != current_user.tenant_id,
            )
        )
        if category:
            shared_query = shared_query.filter(ContentBlockModel.category == category)
        for row in shared_query.all():
            d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
            d["is_own"] = False
            results.append(d)

    return results


# ── Pexels Image Search ───────────────────────────────────────────────────────

PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
PEXELS_BASE_URL = "https://api.pexels.com/v1/search"


@router.get("/image-search", response_model=ImageSearchResponse)
def image_search(
    q: str = Query(..., description="Search term, e.g. 'bali temple'"),
    per_page: int = Query(15, ge=1, le=30, description="Number of results (max 30)"),
    current_user = Depends(get_current_user),
):
    """
    Search for travel images via the Pexels API.
    Returns simplified photo objects with medium and large URLs.
    Results are cached in Redis for 1 hour (key: pexels:{q}:{per_page}).
    Falls back to 20 curated Unsplash travel images when PEXELS_API_KEY is not set.
    """
    cache_key = f"pexels:{q}:{per_page}"

    cached = distributed_cache.get(cache_key)
    if cached is not None:
        return cached

    if not PEXELS_API_KEY:
        log.info("PEXELS_API_KEY not set — returning Unsplash fallback images")
        response = {"photos": [p.model_dump() for p in _UNSPLASH_FALLBACKS[:per_page]]}
        distributed_cache.set(cache_key, response, ttl_seconds=3600)
        return response

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                PEXELS_BASE_URL,
                params={"query": q, "per_page": per_page},
                headers={"Authorization": PEXELS_API_KEY},
            )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as exc:
        log.warning("Pexels API returned %s — falling back to Unsplash", exc.response.status_code)
        return {"photos": [p.model_dump() for p in _UNSPLASH_FALLBACKS[:per_page]]}
    except Exception as exc:
        log.warning("Pexels API error (%s) — falling back to Unsplash", exc)
        return {"photos": [p.model_dump() for p in _UNSPLASH_FALLBACKS[:per_page]]}

    photos = []
    for photo in data.get("photos", []):
        src = photo.get("src", {})
        photos.append({
            "id": photo["id"],
            "url_medium": src.get("medium", ""),
            "url_large": src.get("large2x", src.get("large", "")),
            "photographer": photo.get("photographer", ""),
            "photographer_url": photo.get("photographer_url", ""),
            "alt": photo.get("alt", ""),
        })

    response = {"photos": photos}
    distributed_cache.set(cache_key, response, ttl_seconds=3600)
    return response


@router.post("/image-search/save", response_model=MediaAsset)
def save_image_from_search(
    body: ImageSaveRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save a selected Pexels/Unsplash image as a MediaAsset for the calling tenant.
    The saved asset includes the photographer credit in the tags list.
    """
    from app.schemas.content import AssetType

    tags = list(body.tags)
    if body.photographer and f"photo-by:{body.photographer}" not in tags:
        tags.append(f"photo-by:{body.photographer}")

    db_asset = MediaAssetModel(
        tenant_id=current_user.tenant_id,
        url=body.url,
        asset_type=AssetType.IMAGE,
        title=body.title,
        tags=tags,
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset


# ── NAMA Master Library Seed ──────────────────────────────────────────────────

_MASTER_DESTINATIONS = [
    {
        "name": "Bali",
        "country": "Indonesia",
        "description": (
            "A jewel of the Indonesian archipelago, Bali enchants visitors with its terraced rice paddies, "
            "ancient Hindu temples, and vibrant arts scene. From the cultural heart of Ubud to the surf-lapped "
            "shores of Seminyak, every corner rewards exploration."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200",
        "meta_tags": ["visa-on-arrival", "beach", "culture", "honeymoon", "best-for-couples"],
    },
    {
        "name": "Maldives",
        "country": "Maldives",
        "description": (
            "An archipelago of 1,200 coral islands scattered across the Indian Ocean, the Maldives is "
            "synonymous with overwater bungalows, crystalline lagoons, and world-class snorkelling. "
            "It remains the definitive luxury escape for honeymooners and divers alike."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200",
        "meta_tags": ["luxury", "beach", "diving", "honeymoon", "overwater-villa"],
    },
    {
        "name": "Dubai",
        "country": "United Arab Emirates",
        "description": (
            "A city of superlatives, Dubai blends futuristic architecture with ancient desert traditions. "
            "Visitors can ski indoors in the morning, dune-bash by afternoon, and dine above the clouds at night — "
            "all within the same 24 hours."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200",
        "meta_tags": ["luxury", "shopping", "desert", "family", "visa-on-arrival"],
    },
    {
        "name": "Thailand",
        "country": "Thailand",
        "description": (
            "Thailand offers an irresistible blend of ornate temples, tropical islands, and street-food culture. "
            "Bangkok pulses with energy while Chiang Mai's misty mountains and Phuket's Andaman coastline "
            "provide the perfect contrast."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
        "meta_tags": ["visa-on-arrival", "beach", "culture", "budget-friendly", "street-food"],
    },
    {
        "name": "Sri Lanka",
        "country": "Sri Lanka",
        "description": (
            "Sri Lanka packs an astonishing variety of experiences into a small island: misty tea-clad highlands, "
            "ancient rock fortresses, blue-whale watching, and some of Asia's best surf. "
            "Its warmth, history, and affordability make it one of the subcontinent's rising stars."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200",
        "meta_tags": ["culture", "wildlife", "adventure", "budget-friendly", "family"],
    },
    {
        "name": "Vietnam",
        "country": "Vietnam",
        "description": (
            "From the emerald karst seascape of Ha Long Bay to the ancient lanes of Hoi An and the buzzing "
            "streets of Ho Chi Minh City, Vietnam rewards travellers with incredible diversity. "
            "The cuisine alone — pho, banh mi, fresh spring rolls — justifies the journey."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1528127269322-539801943592?w=1200",
        "meta_tags": ["culture", "adventure", "street-food", "budget-friendly", "history"],
    },
    {
        "name": "Singapore",
        "country": "Singapore",
        "description": (
            "A gleaming city-state where colonial shophouses stand next to gravity-defying supertrees, Singapore "
            "excels as both a stopover hub and a destination in its own right. World-class food, impeccable "
            "infrastructure, and a kaleidoscope of cultures make it endlessly entertaining."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200",
        "meta_tags": ["family", "luxury", "shopping", "food", "stopover"],
    },
    {
        "name": "Kenya",
        "country": "Kenya",
        "description": (
            "Home to the Maasai Mara, Amboseli's elephant herds, and the Great Rift Valley, Kenya is the "
            "birthplace of the classic African safari. Witness the Great Migration, track the Big Five, "
            "and end each day as the acacia-framed sun dips below the horizon."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1200",
        "meta_tags": ["safari", "wildlife", "adventure", "luxury", "bucket-list"],
    },
    {
        "name": "Switzerland",
        "country": "Switzerland",
        "description": (
            "Switzerland distils Europe's finest mountain scenery into one compact country. Cogwheel trains "
            "climb to Jungfraujoch, picture-book villages dot Lake Geneva's shores, and alpine meadows burst "
            "into colour each summer — a destination that exceeds every expectation, year-round."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
        "meta_tags": ["luxury", "adventure", "family", "skiing", "honeymoon"],
    },
    {
        "name": "Japan",
        "country": "Japan",
        "description": (
            "Japan seamlessly weaves ultramodern technology with centuries-old tradition. Cherry blossoms frame "
            "ancient temples in Kyoto, bullet trains streak past Mount Fuji, and Tokyo's neon canyons yield "
            "to serene Zen gardens around every corner."
        ),
        "cover_image_url": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200",
        "meta_tags": ["culture", "food", "luxury", "family", "bucket-list"],
    },
]


def seed_master_destinations(db: Session) -> List[DestinationModel]:
    """
    Idempotently seeds 10 NAMA-curated master destinations (tenant_id=1).
    Each destination is marked is_shared=True and is_master=True.
    A cover MediaAsset is created automatically from the Unsplash URL.
    Call this manually or via an admin endpoint — it is NOT invoked on startup.
    """
    seeded: List[DestinationModel] = []

    for data in _MASTER_DESTINATIONS:
        # Check idempotency: skip if already present for tenant 1
        existing = (
            db.query(DestinationModel)
            .filter(
                DestinationModel.tenant_id == 1,
                DestinationModel.name == data["name"],
                DestinationModel.is_master == True,
            )
            .first()
        )
        if existing:
            seeded.append(existing)
            continue

        # Create a MediaAsset for the cover image
        cover_asset = MediaAssetModel(
            tenant_id=1,
            url=data["cover_image_url"],
            asset_type="IMAGE",
            title=f"{data['name']} — cover",
            tags=["master-library", data["name"].lower()],
        )
        db.add(cover_asset)
        db.flush()  # get cover_asset.id

        dest = DestinationModel(
            tenant_id=1,
            name=data["name"],
            country=data["country"],
            description=data["description"],
            cover_image_id=cover_asset.id,
            meta_tags=data["meta_tags"],
            is_shared=True,
            is_master=True,
            source_tenant_id=None,  # NAMA platform
        )
        db.add(dest)
        seeded.append(dest)

    db.commit()
    for dest in seeded:
        try:
            db.refresh(dest)
        except Exception:
            pass  # already detached if it was skipped

    log.info("seed_master_destinations: %d destinations processed", len(seeded))
    return seeded
