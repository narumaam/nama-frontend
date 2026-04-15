from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.portals import PortalConfig, PortalBranding, PortalPublicInfo
from app.models.portals import Portal
from app.models.auth import Tenant
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import Optional, List

router = APIRouter()

@router.post("/configure", response_model=PortalConfig)
def configure_portal(
    config_in: PortalConfig,
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Configure a white-label portal for the organization (M10).
    Allows custom branding, features, and CNAME domains.
    """
    db_portal = db.query(Portal).filter(Portal.tenant_id == current_user.tenant_id).first()
    
    # Store settings in a structured JSON
    portal_data = config_in.model_dump()
    
    if db_portal:
        db_portal.config = portal_data["branding"]
        db_portal.custom_domain = portal_data["custom_domain"]
        db_portal.is_active = portal_data["is_active"]
    else:
        db_portal = Portal(
            tenant_id=current_user.tenant_id,
            custom_domain=portal_data["custom_domain"],
            config=portal_data["branding"],
            is_active=portal_data["is_active"]
        )
        db.add(db_portal)
    
    db.commit()
    db.refresh(db_portal)
    
    return PortalConfig(
        id=db_portal.id,
        tenant_id=db_portal.tenant_id,
        custom_domain=db_portal.custom_domain,
        is_active=db_portal.is_active,
        branding=PortalBranding(**db_portal.config) if isinstance(db_portal.config, dict) else PortalBranding(),
        features_enabled=["ITINERARY_VIEW", "BOOKINGS"]
    )

@router.get("/lookup", response_model=PortalPublicInfo)
def lookup_portal_by_domain(
    request: Request,
    domain: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Public lookup for portal branding based on the visiting hostname (CNAME Support).
    This endpoint is used by the Next.js middleware to render correct branding.
    """
    host = domain or request.headers.get("host")
    
    # Logic to find the portal by custom_domain or internal org_code
    db_portal = db.query(Portal).filter(Portal.custom_domain == host).first()
    
    if not db_portal:
        # Fallback for internal subdomains like {org_code}.nama.travel
        org_code = host.split(".")[0]
        db_tenant = db.query(Tenant).filter(Tenant.org_code == org_code).first()
        if db_tenant:
            db_portal = db.query(Portal).filter(Portal.tenant_id == db_tenant.id).first()
    
    if not db_portal:
        raise HTTPException(status_code=404, detail="Portal not found.")
    
    return PortalPublicInfo(
        name=db_portal.tenant.name,
        branding=PortalBranding(**db_portal.config) if isinstance(db_portal.config, dict) else PortalBranding(),
        support_contact=db_portal.config.get("contact_email", "support@nama.travel")
    )
