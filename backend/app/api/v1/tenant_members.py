from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class TenantMemberRecord(BaseModel):
    id: str
    tenant_name: str
    name: str
    email: str
    role: Literal["customer-admin", "sales", "finance", "operations", "viewer"]
    designation: str
    team: str
    status: Literal["Seeded", "Invited", "Active"]
    source: Literal["tenant-profile", "employee-directory", "accepted-invite", "manual", "backend-demo"]


class TenantMembersResponse(BaseModel):
    tenant_name: str
    source: Literal["backend-demo"]
    members: list[TenantMemberRecord]


class PromoteInviteRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    invite_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    role: Literal["customer-admin", "sales", "finance", "operations", "viewer"]
    designation: str = Field(..., min_length=1)
    team: str = Field(..., min_length=1)


def _default_members(tenant_name: str) -> list[TenantMemberRecord]:
    safe_tenant = tenant_name or "Nair Luxury Escapes"
    token = safe_tenant.lower().replace(" ", "")
    return [
        TenantMemberRecord(
            id=f"{token}-admin",
            tenant_name=safe_tenant,
            name="Workspace Admin",
            email=f"admin@{token}.demo",
            role="customer-admin",
            designation="Workspace Admin",
            team="Leadership",
            status="Active",
            source="backend-demo",
        ),
        TenantMemberRecord(
            id=f"{token}-sales",
            tenant_name=safe_tenant,
            name="Sales Lead",
            email=f"sales@{token}.demo",
            role="sales",
            designation="Travel Consultant",
            team="Sales Desk",
            status="Active",
            source="backend-demo",
        ),
        TenantMemberRecord(
            id=f"{token}-finance",
            tenant_name=safe_tenant,
            name="Finance Lead",
            email=f"finance@{token}.demo",
            role="finance",
            designation="Accounts Lead",
            team="Billing",
            status="Active",
            source="backend-demo",
        ),
        TenantMemberRecord(
            id=f"{token}-ops",
            tenant_name=safe_tenant,
            name="Operations Lead",
            email=f"ops@{token}.demo",
            role="operations",
            designation="Operations Lead",
            team="Fulfilment",
            status="Active",
            source="backend-demo",
        ),
    ]


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANT_MEMBERS"}


@router.get("", response_model=TenantMembersResponse)
def list_tenant_members(tenant_name: str = "Nair Luxury Escapes"):
    return TenantMembersResponse(
        tenant_name=tenant_name,
        source="backend-demo",
        members=_default_members(tenant_name),
    )


@router.post("/promote", response_model=TenantMemberRecord)
def promote_invite_to_member(payload: PromoteInviteRequest):
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Valid email required for tenant member promotion")

    normalized_name = payload.name.strip()
    token = normalized_name.lower().replace(" ", "-")
    return TenantMemberRecord(
        id=f"{payload.invite_id}-{token}",
        tenant_name=payload.tenant_name.strip(),
        name=normalized_name,
        email=payload.email.strip().lower(),
        role=payload.role,
        designation=payload.designation.strip(),
        team=payload.team.strip(),
        status="Active",
        source="accepted-invite",
    )


@router.get("/contract")
def get_contract_shape():
    return {
        "module": "TENANT_MEMBERS",
        "version": "beta-foundation",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "routes": {
            "list": "/api/v1/tenant-members?tenant_name=<tenant>",
            "promote_invite": "/api/v1/tenant-members/promote",
            "health": "/api/v1/tenant-members/health",
        },
    }
