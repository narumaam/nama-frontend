from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class AssetType(str, Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    DOCUMENT = "DOCUMENT"

class MediaAssetBase(BaseModel):
    url: str
    asset_type: AssetType
    title: Optional[str] = None
    tags: List[str] = []

class MediaAssetCreate(MediaAssetBase):
    tenant_id: int

class MediaAsset(MediaAssetBase):
    id: int
    tenant_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DestinationBase(BaseModel):
    name: str
    country: str
    description: Optional[str] = None
    meta_tags: List[str] = []

class DestinationCreate(DestinationBase):
    tenant_id: int

class Destination(DestinationBase):
    id: int
    tenant_id: int
    cover_image_id: Optional[int] = None
    is_shared: bool = False
    is_master: bool = False
    source_tenant_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DestinationWithOwnership(Destination):
    """Extended destination response that includes ownership context."""
    is_own: bool = True

class ContentBlockBase(BaseModel):
    title: str
    content: str
    category: str # e.g. HOTEL_DESC, ACTIVITY_DESC, TRANSFER_INFO
    tags: List[str] = []

class ContentBlockCreate(ContentBlockBase):
    tenant_id: int

class ContentBlock(ContentBlockBase):
    id: int
    tenant_id: int
    is_shared: bool = False
    is_master: bool = False
    source_tenant_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ContentBlockWithOwnership(ContentBlock):
    """Extended content block response that includes ownership context."""
    is_own: bool = True

# ── Pexels image search ────────────────────────────────────────────────────────

class PexelsPhoto(BaseModel):
    id: int
    url_medium: str
    url_large: str
    photographer: str
    photographer_url: str
    alt: str

class ImageSearchResponse(BaseModel):
    photos: List[PexelsPhoto]

class ImageSaveRequest(BaseModel):
    url: str
    title: str
    photographer: str
    tags: List[str] = []

class PexelsVideoFile(BaseModel):
    quality: Optional[str] = None
    file_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    link: str

class PexelsVideo(BaseModel):
    id: int
    image: str
    duration: int
    user_name: str
    user_url: str
    video_files: List[PexelsVideoFile]

class VideoSearchResponse(BaseModel):
    videos: List[PexelsVideo]
