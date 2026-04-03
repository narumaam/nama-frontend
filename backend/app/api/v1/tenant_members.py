from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

TenantMemberRole = Literal["customer-admin", "sales", "finance", "operations", "viewer"]
TenantMemberStatus = Literal["Seeded", "Invited", "Active"]
TenantMemberSource = Literal["tenant-profile", "employee-directory", "accepted-invite", "manual", "backend-demo"]

_MEMBER_STORE: dict[str, list["TenantMemberRecord"]] = {}


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


def _normalize_tenant_name(tenant_name: str) -> str:
    return tenant_name.strip() or "Nair Luxury Escapes"


def _normalize_role(role: str) -> TenantMemberRole:
    normalized = role.strip().lower()
    if normalized in {"customer-admin", "customer admin"}:
        return "customer-admin"
    if normalized == "sales":
        return "sales"
    if normalized in {"operations", "ops"}:
        return "operations"
    if normalized == "finance":
        return "finance"
    return "viewer"


def _normalize_status(status: Optional[str]) -> TenantMemberStatus:
    normalized = (status or "Seeded").strip().lower()
    if normalized == "active":
        return "Active"
    if normalized == "invited":
        return "Invited"
    return "Seeded"


def _now_label() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_members(tenant_name: str) -> list[TenantMemberRecord]:
    safe_tenant = _normalize_tenant_name(tenant_name)
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
            reports_to="Platform",
            responsibility="Workspace ownership, governance, and team access",
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
            reports_to="Workspace Admin",
            responsibility="Lead conversion, follow-up, and quote management",
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
            reports_to="Workspace Admin",
            responsibility="Deposits, invoices, and settlement controls",
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
            reports_to="Workspace Admin",
            responsibility="Bookings, traveler packs, and execution handoff",
        ),
    ]


def _seed_if_needed(tenant_name: str) -> list[TenantMemberRecord]:
    tenant_key = _normalize_tenant_name(tenant_name)
    if tenant_key not in _MEMBER_STORE:
        _MEMBER_STORE[tenant_key] = _default_members(tenant_key)
    return _MEMBER_STORE[tenant_key]


def _member_key(member: TenantMemberRecord) -> str:
    return member.email.strip().lower()


def _upsert_member(member: TenantMemberRecord) -> TenantMemberRecord:
    tenant_key = _normalize_tenant_name(member.tenant_name)
    existing_members = list(_seed_if_needed(tenant_key))
    next_member = member.model_copy(update={"tenant_name": tenant_key})
    next_members = [item for item in existing_members if _member_key(item) != _member_key(next_member) and item.id != next_member.id]
    next_members.insert(0, next_member)
    _MEMBER_STORE[tenant_key] = next_members
    return next_member


def _member_from_payload(payload: Any) -> TenantMemberRecord:
    return TenantMemberRecord(
        id=payload.id if isinstance(payload, TenantMemberUpsertRequest) and payload.id else f"{payload.tenant_name.strip()}-{payload.email.strip().lower().replace('@', '-')}-{payload.name.strip().lower().replace(' ', '-')}",
        tenant_name=_normalize_tenant_name(payload.tenant_name),
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        role=_normalize_role(payload.role),
        designation=payload.designation.strip(),
        team=payload.team.strip(),
        status=_normalize_status(payload.status if isinstance(payload, TenantMemberUpsertRequest) else "Active"),
        source=payload.source if isinstance(payload, TenantMemberUpsertRequest) else "accepted-invite",
        reports_to=payload.reports_to.strip() if hasattr(payload, "reports_to") else "Customer Admin",
        responsibility=payload.responsibility.strip() if hasattr(payload, "responsibility") else "Workspace participation",
        invite_id=getattr(payload, "invite_id", None),
        invited_at=getattr(payload, "invited_at", None),
        accepted_at=getattr(payload, "accepted_at", None),
    )


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANT_MEMBERS"}


@router.get("", response_model=TenantMembersResponse)
def list_tenant_members(tenant_name: str = "Nair Luxury Escapes"):
    tenant_key = _normalize_tenant_name(tenant_name)
    return TenantMembersResponse(
        tenant_name=tenant_key,
        source="backend-demo",
        members=list(_seed_if_needed(tenant_key)),
    )


@router.post("/upsert", response_model=TenantMemberRecord)
def upsert_tenant_member(payload: TenantMemberUpsertRequest):
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Valid email required for tenant member upsert")
    return _upsert_member(_member_from_payload(payload))


@router.post("/bulk", response_model=TenantMembersResponse)
def bulk_upsert_tenant_members(payload: TenantMemberBulkUpsertRequest):
    if not payload.members:
        raise HTTPException(status_code=400, detail="At least one member is required for bulk upsert")

    normalized_members = [_member_from_payload(member) for member in payload.members]
    for member in normalized_members:
        _upsert_member(member)

    tenant_key = _normalize_tenant_name(payload.tenant_name)
    return TenantMembersResponse(
        tenant_name=tenant_key,
        source="backend-demo",
        members=list(_seed_if_needed(tenant_key)),
    )


@router.post("/promote", response_model=TenantMemberRecord)
def promote_invite_to_member(payload: PromoteInviteRequest):
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Valid email required for tenant member promotion")

    promoted = _member_from_payload(payload)
    return _upsert_member(promoted.model_copy(update={"status": "Active", "source": "accepted-invite", "accepted_at": payload.accepted_at or _now_label()}))


@router.post("/bulk-upsert", response_model=TenantMembersResponse)
def bulk_upsert_alias(payload: TenantMemberBulkUpsertRequest):
    return bulk_upsert_tenant_members(payload)


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
