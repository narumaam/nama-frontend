from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.demo_credentials import (
    issue_super_admin_reset_token,
    issue_tenant_reset_token,
    set_super_admin_secret,
    set_tenant_member_secret,
    verify_super_admin_reset_token,
    verify_tenant_reset_token,
)

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
def request_tenant_reset(payload: CredentialResetRequest):
    if payload.scope != "tenant":
        raise HTTPException(status_code=400, detail="Tenant credential reset scope must be tenant")
    if not payload.tenant_name:
        raise HTTPException(status_code=400, detail="tenant_name is required for tenant credential reset")

    record = issue_tenant_reset_token(payload.tenant_name, payload.email)
    if not record:
        raise HTTPException(status_code=404, detail="Tenant credential subject not found")

    return {
        "email": payload.email.strip().lower(),
        "scope": "tenant",
        "tenant_name": payload.tenant_name.strip(),
        "reset_token": record["reset_token"],
        "reset_expires_at": record["reset_expires_at"],
    }


@router.post("/tenant/confirm-reset")
def confirm_tenant_reset(payload: CredentialResetConfirmRequest):
    if payload.scope != "tenant":
        raise HTTPException(status_code=400, detail="Tenant credential reset scope must be tenant")
    if not payload.tenant_name:
        raise HTTPException(status_code=400, detail="tenant_name is required for tenant credential reset")

    record = verify_tenant_reset_token(payload.tenant_name, payload.email, payload.reset_token)
    if not record:
        raise HTTPException(status_code=401, detail="Invalid or expired tenant reset token")

    updated = set_tenant_member_secret(payload.tenant_name, payload.email, payload.access_code)
    if not updated:
        raise HTTPException(status_code=404, detail="Tenant credential subject not found")

    return {"ok": True, "email": payload.email.strip().lower(), "scope": "tenant", "tenant_name": payload.tenant_name.strip()}


@router.post("/super-admin/request-reset")
def request_super_admin_reset(payload: CredentialResetRequest):
    if payload.scope != "platform":
        raise HTTPException(status_code=400, detail="Super admin credential reset scope must be platform")

    record = issue_super_admin_reset_token(payload.email)
    if not record:
        raise HTTPException(status_code=404, detail="Super admin credential subject not found")

    return {
        "email": payload.email.strip().lower(),
        "scope": "platform",
        "tenant_name": None,
        "reset_token": record["reset_token"],
        "reset_expires_at": record["reset_expires_at"],
    }


@router.post("/super-admin/confirm-reset")
def confirm_super_admin_reset(payload: CredentialResetConfirmRequest):
    if payload.scope != "platform":
        raise HTTPException(status_code=400, detail="Super admin credential reset scope must be platform")

    record = verify_super_admin_reset_token(payload.email, payload.reset_token)
    if not record:
        raise HTTPException(status_code=401, detail="Invalid or expired Super Admin reset token")

    updated = set_super_admin_secret(payload.email, payload.access_code)
    if not updated:
        raise HTTPException(status_code=404, detail="Super admin credential subject not found")

    return {"ok": True, "email": payload.email.strip().lower(), "scope": "platform", "tenant_name": None}
