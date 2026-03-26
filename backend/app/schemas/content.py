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
    created_at: datetime
    
    class Config:
        from_attributes = True

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
    created_at: datetime
    
    class Config:
        from_attributes = True
