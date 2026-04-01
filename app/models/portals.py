from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

class Portal(Base):
    """
    White-Label Portal configurations for DMCs and Sub-Agents (M10).
    Enables CNAME support and custom branding.
    """
    __tablename__ = "portals"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True, index=True)
    custom_domain = Column(String, unique=True, index=True, nullable=True) # e.g. travel.client.com
    is_active = Column(Boolean, default=True)
    
    # Store branding, colors, features in a flexible JSONB column
    # For high-performance read, we can move this to dedicated columns later.
    config = Column(JSON, default={
        "branding": {
            "primary_color": "#0F172A",
            "accent_color": "#14B8A6",
            "logo_url": None
        },
        "features_enabled": ["ITINERARY_VIEW", "BOOKINGS"],
        "contact_email": None
    })

    tenant = relationship("Tenant")
