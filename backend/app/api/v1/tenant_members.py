from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.beta_auth_store import (
    bulk_upsert_members,
    list_members,
    normalize_member_status,
    normalize_role,
    now_iso,
    require_authenticated_session,
    upsert_member,
)
from app.db.session import get_db

router = APIRouter()

TenantMemberRole = Literal["customer-admin", "sales", "finance", "operations", "viewer"]
TenantMemberStatus = Literal["Seeded", "Invited", "Active"]
TenantMemberSource = Literal["tenant-profile", "employee-directory", "accepted-invite", "manual", "backend-demo"]


class TenantMemberRecord(BaseModel):
    id: str
    tenant_name: str
    name: str
    email: str
    role: TenantMemberRole
    designation: str
    team: str
    status: TenantMemberStatus
    source: TenantMemberSource
    reports_to: str = "Customer Admin"
    responsibility: str = "Workspace participation"
    invite_id: Optional[str] = None
    invited_at: Optional[str] = None
    accepted_at: Optional[str] = None


class TenantMembersResponse(BaseModel):
    tenant_name: str
    source: Literal["backend-demo"]
    members: list[TenantMemberRecord]


class TenantMemberUpsertRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    id: Optional[str] = None
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    role: str
    designation: str = Field(..., min_length=1)
    team: str = Field(..., min_length=1)
    status: str = "Seeded"
    source: str = "manual"
    reports_to: str = "Customer Admin"
    responsibility: str = "Workspace participation"
    invite_id: Optional[str] = None
    invited_at: Optional[str] = None
    accepted_at: Optional[str] = None


class TenantMemberBulkUpsertRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    members: list[TenantMemberUpsertRequest] = Field(default_factory=list)


class PromoteInviteRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    invite_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    role: str
    designation: str = Field(..., min_length=1)
    team: str = Field(..., min_length=1)
    reports_to: str = "Customer Admin"
    responsibility: str = "Workspace participation"
    accepted_at: Optional[str] = None
    invited_at: Optional[str] = None


def _payload_to_member_request(payload: dict[str, Any]) -> TenantMemberUpsertRequest:
    nested = payload.get("member") if isinstance(payload.get("member"), dict) else None
    source = nested or payload
    tenant_name = source.get("tenant_name") or payload.get("tenant_name")
    return TenantMemberUpsertRequest(
        tenant_name=tenant_name,
        id=source.get("id"),
        name=source.get("name", ""),
        email=source.get("email", ""),
        role=source.get("role", "viewer"),
        designation=source.get("designation", "Workspace Member"),
        team=source.get("team", "Operations"),
        status=source.get("status", "Seeded"),
        source=source.get("source", "manual"),
        reports_to=source.get("reports_to", "Customer Admin"),
        responsibility=source.get("responsibility", "Workspace participation"),
        invite_id=source.get("invite_id"),
        invited_at=source.get("invited_at"),
        accepted_at=source.get("accepted_at"),
    )


def _member_payload_dict(payload: TenantMemberUpsertRequest) -> dict[str, Optional[str]]:
    return {
        "tenant_name": payload.tenant_name,
        "id": payload.id,
        "name": payload.name,
        "email": payload.email,
        "role": normalize_role(payload.role),
        "designation": payload.designation,
        "team": payload.team,
        "status": normalize_member_status(payload.status),
        "source": payload.source,
        "reports_to": payload.reports_to,
        "responsibility": payload.responsibility,
        "invite_id": payload.invite_id,
        "invited_at": payload.invited_at,
        "accepted_at": payload.accepted_at,
    }


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANT_MEMBERS"}


@router.get("", response_model=TenantMembersResponse)
def list_tenant_members(tenant_name: str = "Nair Luxury Escapes", db: Session = Depends(get_db)):
    return TenantMembersResponse(
        tenant_name=tenant_name.strip() or "Nair Luxury Escapes",
        source="backend-demo",
        members=list_members(db, tenant_name),
    )


@router.post("/upsert", response_model=TenantMemberRecord)
def upsert_tenant_member(payload: dict[str, Any], request: Request, db: Session = Depends(get_db)):
    request_model = _payload_to_member_request(payload)
    if "@" not in request_model.email:
        raise HTTPException(status_code=400, detail="Valid email required for tenant member upsert")
    is_bootstrap_admin = request_model.role in {"customer-admin", "customer admin"} and request_model.source == "tenant-profile"
    actor_email = None
    if not is_bootstrap_admin:
        actor = require_authenticated_session(
            db,
            request,
            tenant_name=request_model.tenant_name,
            allowed_roles=["customer-admin", "super-admin"],
        )
        actor_email = actor["email"]
    return upsert_member(db, _member_payload_dict(request_model), actor_email=actor_email)


@router.post("/bulk", response_model=TenantMembersResponse)
def bulk_upsert_tenant_members(payload: dict[str, Any], request: Request, db: Session = Depends(get_db)):
    tenant_name = payload.get("tenant_name", "Nair Luxury Escapes")
    raw_members = payload.get("members", [])
    if not raw_members:
        raise HTTPException(status_code=400, detail="At least one member is required for bulk upsert")
    actor = require_authenticated_session(
        db,
        request,
        tenant_name=tenant_name,
        allowed_roles=["customer-admin", "super-admin"],
    )
    members = [_member_payload_dict(_payload_to_member_request({"tenant_name": tenant_name, "member": member})) for member in raw_members]
    return TenantMembersResponse(
        tenant_name=tenant_name,
        source="backend-demo",
        members=bulk_upsert_members(db, tenant_name, members, actor_email=actor["email"]),
    )


@router.post("/promote", response_model=TenantMemberRecord)
def promote_invite_to_member(payload: PromoteInviteRequest, request: Request, db: Session = Depends(get_db)):
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Valid email required for tenant member promotion")
    actor = require_authenticated_session(
        db,
        request,
        tenant_name=payload.tenant_name,
        allowed_roles=["customer-admin", "super-admin"],
    )
    return upsert_member(
        db,
        {
            "tenant_name": payload.tenant_name,
            "id": payload.invite_id,
            "name": payload.name,
            "email": payload.email,
            "role": payload.role,
            "designation": payload.designation,
            "team": payload.team,
            "status": "Active",
            "source": "accepted-invite",
            "reports_to": payload.reports_to,
            "responsibility": payload.responsibility,
            "invite_id": payload.invite_id,
            "invited_at": payload.invited_at,
            "accepted_at": payload.accepted_at or now_iso(),
        },
        actor_email=actor["email"],
    )


@router.post("/bulk-upsert", response_model=TenantMembersResponse)
def bulk_upsert_alias(payload: TenantMemberBulkUpsertRequest, request: Request, db: Session = Depends(get_db)):
    return bulk_upsert_tenant_members(payload.model_dump(), request, db)


@router.get("/contract")
def get_contract_shape():
    return {
        "module": "TENANT_MEMBERS",
        "version": "beta-foundation",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "routes": {
            "list": "/api/v1/tenant-members?tenant_name=<tenant>",
            "upsert": "/api/v1/tenant-members/upsert",
            "bulk_upsert": "/api/v1/tenant-members/bulk",
            "promote_invite": "/api/v1/tenant-members/promote",
            "health": "/api/v1/tenant-members/health",
        },
    }
