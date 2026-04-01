from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import TenantCreate, Tenant as TenantSchema
from app.models.auth import Tenant, TenantType
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole

router = APIRouter()

@router.post("/register-org", response_model=TenantSchema)
def create_tenant(tenant_in: TenantCreate, db: Session = Depends(get_db)):
    """
    Register a new Organization (L3, L4, or L5).
    """
    db_tenant = db.query(Tenant).filter(Tenant.org_code == tenant_in.org_code).first()
    if db_tenant:
        raise HTTPException(
            status_code=400,
            detail="Organization code already exists.",
        )
    
    new_tenant = Tenant(
        name=tenant_in.name,
        type=tenant_in.type,
        org_code=tenant_in.org_code,
        base_currency=tenant_in.base_currency,
        parent_id=tenant_in.parent_id,
        status="ACTIVE",
        settings={}
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

@router.get("/me/org", response_model=TenantSchema)
def get_my_org(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get the organization details for the currently logged-in user.
    """
    return current_user.tenant


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANTS"}
