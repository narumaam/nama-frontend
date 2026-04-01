from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from app.schemas.content import AssetType

class MediaAsset(Base):
    """
    Media Assets for the organization (M12).
    Images, videos, and documents used in itineraries and portals.
    """
    __tablename__ = "media_assets"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    url = Column(String, nullable=False)
    asset_type = Column(SQLEnum(AssetType), default=AssetType.IMAGE)
    title = Column(String, nullable=True)
    tags = Column(JSON, default=[]) # e.g. ["luxury", "beach", "bali"]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Destination(Base):
    """
    Destination library (M12).
    Stores descriptions, countries, and meta-data for travel destinations.
    """
    __tablename__ = "destinations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    country = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    cover_image_id = Column(Integer, ForeignKey("media_assets.id"), nullable=True)
    meta_tags = Column(JSON, default=[]) # e.g. ["visa-on-arrival", "safe", "best-for-couples"]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ContentBlock(Base):
    """
    Reusable content blocks for itineraries (M12).
    Standard descriptions for hotels, activities, and transfers.
    """
    __tablename__ = "content_blocks"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    title = Column(String, nullable=False, index=True)
    content = Column(String, nullable=False)
    category = Column(String, index=True) # e.g. HOTEL_DESC, ACTIVITY_DESC
    tags = Column(JSON, default=[])
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
