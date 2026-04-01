from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Dict, List, Any

class PortalBranding(BaseModel):
    primary_color: str = "#0F172A" # Midnight Blue
    accent_color: str = "#14B8A6"  # Electric Teal
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    custom_css: Optional[str] = None

class PortalConfig(BaseModel):
    id: Optional[int] = None
    tenant_id: int
    custom_domain: Optional[str] = None # e.g. portal.dmc-bali.com
    is_active: bool = True
    branding: PortalBranding
    features_enabled: List[str] = ["ITINERARY_VIEW", "BOOKING_HISTORY", "PAYMENTS"]
    contact_email: Optional[str] = None

class PortalPublicInfo(BaseModel):
    """Data served to unauthenticated users visiting the portal."""
    name: str
    branding: PortalBranding
    support_contact: str
