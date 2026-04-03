from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.beta_auth_store import (
    accept_invite,
    bulk_create_invites,
    create_invite,
    list_invites,
    normalize_invite_status,
    normalize_role,
    require_authenticated_session,
)
from app.db.session import get_db

router = APIRouter()

TenantInviteStatus = Literal["Draft", "Pending", "Accepted"]
TenantInviteSource = Literal["backend-demo", "manual", "bulk", "accepted"]


class TenantInviteRecord(BaseModel):
    id: str
    tenant_name: str
    name: str
    email: str
    role: str
    designation: str
    team: str
    reports_to: str
    responsibility: str
    status: TenantInviteStatus
    created_at: str
    invited_at: str
    accepted_at: Optional[str] = None
    invite_token: Optional[str] = None
    token_expires_at: Optional[str] = None
    token_used_at: Optional[str] = None
    source: TenantInviteSource = "backend-demo"


class TenantInvitesResponse(BaseModel):
    tenant_name: str
    source: Literal["backend-demo"]
    invites: list[TenantInviteRecord]


class CreateTenantInviteRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    role: str
    designation: str = Field(..., min_length=1)
    team: str = Field(..., min_length=1)
    reports_to: str = "Customer Admin"
    responsibility: str = "Workspace participation"
    status: TenantInviteStatus = "Pending"
    source: str = "manual"


class BulkCreateTenantInvitesRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    invites: list[CreateTenantInviteRequest] = Field(default_factory=list)


class AcceptTenantInviteRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    invite_id: str = Field(..., min_length=1)
    invite_token: str = Field(..., min_length=6)
    access_code: str = Field(..., min_length=8)


def _payload_to_invite_request(payload: dict[str, Any]) -> CreateTenantInviteRequest:
    nested = payload.get("invite") if isinstance(payload.get("invite"), dict) else None
    source = nested or payload
    tenant_name = source.get("tenant_name") or payload.get("tenant_name")
    return CreateTenantInviteRequest(
        tenant_name=tenant_name,
        name=source.get("name", ""),
        email=source.get("email", ""),
        role=source.get("role", "viewer"),
        designation=source.get("designation", "Workspace Member"),
        team=source.get("team", "Operations"),
        reports_to=source.get("reports_to", "Customer Admin"),
        responsibility=source.get("responsibility", "Workspace participation"),
        status=normalize_invite_status(source.get("status", "Pending")),
        source=source.get("source", "manual"),
    )


def _invite_payload_dict(payload: CreateTenantInviteRequest) -> dict[str, Optional[str]]:
    return {
        "tenant_name": payload.tenant_name,
        "name": payload.name,
        "email": payload.email,
        "role": normalize_role(payload.role),
        "designation": payload.designation,
        "team": payload.team,
        "reports_to": payload.reports_to,
        "responsibility": payload.responsibility,
        "status": normalize_invite_status(payload.status),
        "source": payload.source,
    }


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANT_INVITES"}


@router.get("", response_model=TenantInvitesResponse)
def list_tenant_invites(tenant_name: str = "Nair Luxury Escapes", db: Session = Depends(get_db)):
    return TenantInvitesResponse(
        tenant_name=tenant_name.strip() or "Nair Luxury Escapes",
        source="backend-demo",
        invites=list_invites(db, tenant_name),
    )


@router.post("", response_model=TenantInviteRecord)
def create_tenant_invite(payload: dict[str, Any], request: Request, db: Session = Depends(get_db)):
    request_model = _payload_to_invite_request(payload)
    if "@" not in request_model.email:
        raise HTTPException(status_code=400, detail="Valid email required for tenant invite creation")
    actor = require_authenticated_session(
        db,
        request,
        tenant_name=request_model.tenant_name,
        allowed_roles=["customer-admin", "super-admin"],
    )
    return create_invite(db, _invite_payload_dict(request_model), actor_email=actor["email"])


@router.post("/bulk", response_model=TenantInvitesResponse)
def bulk_create_tenant_invites(payload: dict[str, Any], request: Request, db: Session = Depends(get_db)):
    tenant_name = payload.get("tenant_name", "Nair Luxury Escapes")
    raw_invites = payload.get("invites", [])
    if not raw_invites:
        raise HTTPException(status_code=400, detail="At least one invite is required for bulk create")
    actor = require_authenticated_session(
        db,
        request,
        tenant_name=tenant_name,
        allowed_roles=["customer-admin", "super-admin"],
    )
    invites = [_invite_payload_dict(_payload_to_invite_request({"tenant_name": tenant_name, "invite": invite})) for invite in raw_invites]
    return TenantInvitesResponse(
        tenant_name=tenant_name,
        source="backend-demo",
        invites=bulk_create_invites(db, tenant_name, invites, actor_email=actor["email"]),
    )


@router.post("/accept")
def accept_tenant_invite(payload: AcceptTenantInviteRequest, db: Session = Depends(get_db)):
    return accept_invite(
        db,
        tenant_name=payload.tenant_name,
        invite_id=payload.invite_id,
        invite_token=payload.invite_token,
        access_code=payload.access_code,
    )


@router.get("/contract")
def get_contract_shape():
    return {
        "module": "TENANT_INVITES",
        "version": "beta-foundation",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "routes": {
            "list": "/api/v1/tenant-invites?tenant_name=<tenant>",
            "create": "/api/v1/tenant-invites",
            "bulk": "/api/v1/tenant-invites/bulk",
            "accept": "/api/v1/tenant-invites/accept",
            "health": "/api/v1/tenant-invites/health",
        },
    }
