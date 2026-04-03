from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.beta_auth_store import confirm_reset_token, issue_reset_token
from app.db.session import get_db

router = APIRouter()


class CredentialResetRequest(BaseModel):
    email: str = Field(..., min_length=3)
    scope: str = Field(..., min_length=1)
    tenant_name: Optional[str] = None


class CredentialResetConfirmRequest(BaseModel):
    email: str = Field(..., min_length=3)
    scope: str = Field(..., min_length=1)
    tenant_name: Optional[str] = None
    reset_token: str = Field(..., min_length=6)
    access_code: str = Field(..., min_length=8)


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANT_CREDENTIALS"}


@router.post("/tenant/request-reset")
def request_tenant_reset(payload: CredentialResetRequest, db: Session = Depends(get_db)):
    if payload.scope != "tenant":
        raise HTTPException(status_code=400, detail="Tenant credential reset scope must be tenant")
    if not payload.tenant_name:
        raise HTTPException(status_code=400, detail="tenant_name is required for tenant credential reset")
    return issue_reset_token(db, scope="tenant", email=payload.email, tenant_name=payload.tenant_name)


@router.post("/tenant/confirm-reset")
def confirm_tenant_reset(payload: CredentialResetConfirmRequest, db: Session = Depends(get_db)):
    if payload.scope != "tenant":
        raise HTTPException(status_code=400, detail="Tenant credential reset scope must be tenant")
    if not payload.tenant_name:
        raise HTTPException(status_code=400, detail="tenant_name is required for tenant credential reset")
    return confirm_reset_token(
        db,
        scope="tenant",
        email=payload.email,
        reset_token=payload.reset_token,
        access_code=payload.access_code,
        tenant_name=payload.tenant_name,
    )


@router.post("/super-admin/request-reset")
def request_super_admin_reset(payload: CredentialResetRequest, db: Session = Depends(get_db)):
    if payload.scope != "platform":
        raise HTTPException(status_code=400, detail="Super admin credential reset scope must be platform")
    return issue_reset_token(db, scope="platform", email=payload.email)


@router.post("/super-admin/confirm-reset")
def confirm_super_admin_reset(payload: CredentialResetConfirmRequest, db: Session = Depends(get_db)):
    if payload.scope != "platform":
        raise HTTPException(status_code=400, detail="Super admin credential reset scope must be platform")
    return confirm_reset_token(
        db,
        scope="platform",
        email=payload.email,
        reset_token=payload.reset_token,
        access_code=payload.access_code,
    )
