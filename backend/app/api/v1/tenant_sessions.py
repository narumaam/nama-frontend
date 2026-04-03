from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.beta_auth_store import (
    issue_super_admin_session as issue_super_admin_session_record,
    issue_tenant_session as issue_tenant_session_record,
    list_sessions,
    require_authenticated_session,
    revoke_session,
)
from app.db.session import get_db

router = APIRouter()

TenantSessionRole = Literal["super-admin", "customer-admin", "sales", "finance", "operations", "viewer"]
TenantSessionScope = Literal["platform", "tenant"]


class TenantSessionRecord(BaseModel):
    id: str
    email: str
    display_name: str
    role: TenantSessionRole
    scope: TenantSessionScope
    tenant_name: Optional[str] = None
    member_id: Optional[str] = None
    member_status: Optional[str] = None
    designation: Optional[str] = None
    team: Optional[str] = None
    source: Literal["backend-demo"] = "backend-demo"
    granted_at: str


class TenantSessionCreateRequest(BaseModel):
    email: str = Field(..., min_length=3)
    display_name: Optional[str] = None
    role: Optional[TenantSessionRole] = None
    scope: TenantSessionScope
    tenant_name: Optional[str] = None
    member_id: Optional[str] = None
    member_status: Optional[str] = None
    designation: Optional[str] = None
    team: Optional[str] = None
    access_code: Optional[str] = None


class TenantSessionRevokeRequest(BaseModel):
    session_id: str = Field(..., min_length=6)
    tenant_name: Optional[str] = None
    scope: TenantSessionScope


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANT_SESSIONS"}


@router.get("/tenant")
def list_tenant_sessions(request: Request, tenant_name: str = "NAMA Demo", db: Session = Depends(get_db)):
    require_authenticated_session(db, request, tenant_name=tenant_name, allowed_roles=["customer-admin", "super-admin"])
    return {
        "tenant_name": tenant_name.strip() or "NAMA Demo",
        "sessions": list_sessions(db, scope="tenant", tenant_name=tenant_name),
    }


@router.post("/tenant", response_model=TenantSessionRecord)
def issue_tenant_session(payload: TenantSessionCreateRequest, db: Session = Depends(get_db)):
    if payload.scope != "tenant":
        raise HTTPException(status_code=400, detail="Tenant session scope must be tenant")
    if payload.role == "super-admin":
        raise HTTPException(status_code=400, detail="Use super-admin session route for super-admin issuance")
    return issue_tenant_session_record(
        db,
        tenant_name=payload.tenant_name or "NAMA Demo",
        email=payload.email,
        access_code=payload.access_code,
        display_name=payload.display_name,
        role=payload.role,
        member_id=payload.member_id,
        member_status=payload.member_status,
        designation=payload.designation,
        team=payload.team,
    )


@router.post("/tenant/revoke")
def revoke_tenant_session(payload: TenantSessionRevokeRequest, request: Request, db: Session = Depends(get_db)):
    actor = require_authenticated_session(
        db,
        request,
        tenant_name=payload.tenant_name,
        allowed_roles=["customer-admin", "super-admin"],
    )
    return revoke_session(db, session_id=payload.session_id, actor_email=actor["email"])


@router.get("/super-admin")
def list_super_admin_sessions(request: Request, db: Session = Depends(get_db)):
    require_authenticated_session(db, request, tenant_name=None, allowed_roles=["super-admin"])
    return {
        "sessions": list_sessions(db, scope="platform"),
    }


@router.post("/super-admin", response_model=TenantSessionRecord)
def issue_super_admin_session(payload: TenantSessionCreateRequest, db: Session = Depends(get_db)):
    if payload.scope != "platform":
        raise HTTPException(status_code=400, detail="Super admin session requires platform scope")
    return issue_super_admin_session_record(
        db,
        email=payload.email,
        access_code=payload.access_code,
        display_name=payload.display_name,
    )


@router.post("/super-admin/revoke")
def revoke_super_admin_session(payload: TenantSessionRevokeRequest, request: Request, db: Session = Depends(get_db)):
    actor = require_authenticated_session(db, request, tenant_name=None, allowed_roles=["super-admin"])
    return revoke_session(db, session_id=payload.session_id, actor_email=actor["email"])


@router.get("/contract")
def get_contract_shape():
    return {
        "module": "TENANT_SESSIONS",
        "version": "beta-foundation",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "routes": {
            "tenant_issue": "/api/v1/sessions/tenant",
            "tenant_list": "/api/v1/sessions/tenant?tenant_name=<tenant>",
            "tenant_revoke": "/api/v1/sessions/tenant/revoke",
            "super_admin_issue": "/api/v1/sessions/super-admin",
            "super_admin_list": "/api/v1/sessions/super-admin",
            "super_admin_revoke": "/api/v1/sessions/super-admin/revoke",
            "health": "/api/v1/sessions/health",
        },
    }
