from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.content import (
    MediaAsset, MediaAssetCreate,
    Destination, DestinationCreate,
    ContentBlock, ContentBlockCreate
)
from app.models.content import MediaAsset as MediaAssetModel
from app.models.content import Destination as DestinationModel
from app.models.content import ContentBlock as ContentBlockModel
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import List, Optional
from app.core.redis_cache import distributed_cache

router = APIRouter()

# --- Media Assets ---
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

# --- Destinations ---
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

@router.get("/destinations", response_model=List[Destination])
def list_destinations(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all destinations in the library for the current tenant with 300-second TTL.
    Destinations rarely change, so caching helps reduce read load significantly.
    """
    # Build cache key
    cache_key = f"destinations:{current_user.tenant_id}:all"

    # Try cache hit
    cached = distributed_cache.get(cache_key)
    if cached is not None:
        return cached

    # Cache miss: execute query
    result = db.query(DestinationModel).filter(DestinationModel.tenant_id == current_user.tenant_id).all()

    # Cache the response with 300-second (5-minute) TTL
    distributed_cache.set(cache_key, result, ttl_seconds=300)
    return result

# --- Content Blocks ---
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

@router.get("/blocks", response_model=List[ContentBlock])
def list_content_blocks(
    category: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List reusable content blocks, optionally filtered by category.
    """
    query = db.query(ContentBlockModel).filter(ContentBlockModel.tenant_id == current_user.tenant_id)
    if category:
        query = query.filter(ContentBlockModel.category == category)
    return query.all()
