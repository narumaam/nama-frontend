from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.v1.beta_auth_store import list_audit_events, require_authenticated_session
from app.db.session import get_db

router = APIRouter()


@router.get("/tenant")
def list_tenant_auth_audit(tenant_name: str, request: Request, db: Session = Depends(get_db)):
    require_authenticated_session(db, request, tenant_name=tenant_name, allowed_roles=["customer-admin", "super-admin"])
    return {
        "tenant_name": tenant_name.strip() or "NAMA Demo",
        "events": list_audit_events(db, tenant_name=tenant_name, scope="tenant"),
    }


@router.get("/platform")
def list_platform_auth_audit(request: Request, db: Session = Depends(get_db)):
    require_authenticated_session(db, request, tenant_name=None, allowed_roles=["super-admin"])
    return {
        "events": list_audit_events(db, tenant_name=None, scope="platform"),
    }
