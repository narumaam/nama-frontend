from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.tenant_members import TenantMemberUpsertRequest, upsert_tenant_member

router = APIRouter()

TenantInviteStatus = Literal["Draft", "Pending", "Accepted"]
TenantInviteSource = Literal["backend-demo", "manual", "bulk", "accepted"]

_INVITE_STORE: dict[str, list["TenantInviteRecord"]] = {}


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


class BulkCreateTenantInvitesRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    invites: list[CreateTenantInviteRequest] = Field(default_factory=list)


class AcceptTenantInviteRequest(BaseModel):
    tenant_name: str = Field(..., min_length=1)
    invite_id: str = Field(..., min_length=1)
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    designation: Optional[str] = None
    team: Optional[str] = None
    reports_to: Optional[str] = None
    responsibility: Optional[str] = None


def _normalize_tenant_name(tenant_name: str) -> str:
    return tenant_name.strip() or "Nair Luxury Escapes"


def _now_label() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_invites(tenant_name: str) -> list[TenantInviteRecord]:
    safe_tenant = _normalize_tenant_name(tenant_name)
    token = safe_tenant.lower().replace(" ", "")
    return [
        TenantInviteRecord(
            id=f"{token}-invite-sales",
            tenant_name=safe_tenant,
            name="Aisha Khan",
            email="aisha@demoagency.in",
            role="sales",
            designation="Senior Executive",
            team="Inbound Desk",
            reports_to="Sales Manager",
            responsibility="Lead qualification, quoting, and follow-up",
            status="Pending",
            created_at="03 Apr 2026 · 10:15",
            invited_at="03 Apr 2026 · 10:30",
            source="backend-demo",
        ),
        TenantInviteRecord(
            id=f"{token}-invite-ops",
            tenant_name=safe_tenant,
            name="Rohan Iyer",
            email="rohan@demoagency.in",
            role="operations",
            designation="Operations Lead",
            team="Luxury Desk",
            reports_to="Customer Admin",
            responsibility="Execution, booking release, and traveler handoff",
            status="Accepted",
            created_at="02 Apr 2026 · 16:05",
            invited_at="02 Apr 2026 · 16:15",
            accepted_at="02 Apr 2026 · 18:40",
            source="backend-demo",
        ),
        TenantInviteRecord(
            id=f"{token}-invite-finance",
            tenant_name=safe_tenant,
            name="Meera Shah",
            email="meera@demoagency.in",
            role="finance",
            designation="Accounts Lead",
            team="Billing",
            reports_to="Finance Lead",
            responsibility="Billing, payouts, and reconciliation",
            status="Draft",
            created_at="03 Apr 2026 · 11:10",
            invited_at="Not sent yet",
            source="backend-demo",
        ),
    ]


def _seed_if_needed(tenant_name: str) -> list[TenantInviteRecord]:
    tenant_key = _normalize_tenant_name(tenant_name)
    if tenant_key not in _INVITE_STORE:
        _INVITE_STORE[tenant_key] = _default_invites(tenant_key)
    return _INVITE_STORE[tenant_key]


def _invite_key(invite: TenantInviteRecord) -> str:
    return invite.email.strip().lower()


def _normalize_status(status: Optional[str]) -> TenantInviteStatus:
    normalized = (status or "Pending").strip().lower()
    if normalized == "draft":
        return "Draft"
    if normalized == "accepted":
        return "Accepted"
    return "Pending"


def _upsert_invite(invite: TenantInviteRecord) -> TenantInviteRecord:
    tenant_key = _normalize_tenant_name(invite.tenant_name)
    existing_invites = list(_seed_if_needed(tenant_key))
    next_invite = invite.model_copy(update={"tenant_name": tenant_key})
    next_invites = [item for item in existing_invites if _invite_key(item) != _invite_key(next_invite) and item.id != next_invite.id]
    next_invites.insert(0, next_invite)
    _INVITE_STORE[tenant_key] = next_invites
    return next_invite


def _invite_from_payload(payload: CreateTenantInviteRequest, invite_id: Optional[str] = None, accepted_at: Optional[str] = None) -> TenantInviteRecord:
    normalized_tenant = _normalize_tenant_name(payload.tenant_name)
    normalized_name = payload.name.strip()
    normalized_email = payload.email.strip().lower()
    return TenantInviteRecord(
        id=invite_id or f"{normalized_name.lower().replace(' ', '-')}-{normalized_email.replace('@', '-')}",
        tenant_name=normalized_tenant,
        name=normalized_name,
        email=normalized_email,
        role=payload.role.strip(),
        designation=payload.designation.strip(),
        team=payload.team.strip(),
        reports_to=payload.reports_to.strip(),
        responsibility=payload.responsibility.strip(),
        status=_normalize_status(payload.status),
        created_at=_now_label(),
        invited_at="Not sent yet" if payload.status == "Draft" else _now_label(),
        accepted_at=accepted_at,
        source="manual" if payload.status == "Draft" else "backend-demo",
    )


def _accept_invite(invite: TenantInviteRecord, payload: AcceptTenantInviteRequest) -> TenantInviteRecord:
    updated_invite = invite.model_copy(
        update={
            "status": "Accepted",
            "accepted_at": _now_label(),
            "name": (payload.name or invite.name).strip(),
            "email": (payload.email or invite.email).strip().lower(),
            "role": (payload.role or invite.role).strip(),
            "designation": (payload.designation or invite.designation).strip(),
            "team": (payload.team or invite.team).strip(),
            "reports_to": (payload.reports_to or invite.reports_to).strip(),
            "responsibility": (payload.responsibility or invite.responsibility).strip(),
            "source": "accepted",
        }
    )
    upsert_tenant_member(
        TenantMemberUpsertRequest(
            tenant_name=updated_invite.tenant_name,
            id=updated_invite.id,
            name=updated_invite.name,
            email=updated_invite.email,
            role=updated_invite.role,
            designation=updated_invite.designation,
            team=updated_invite.team,
            status="Active",
            source="accepted-invite",
            reports_to=updated_invite.reports_to,
            responsibility=updated_invite.responsibility,
            invite_id=updated_invite.id,
            invited_at=updated_invite.invited_at,
            accepted_at=updated_invite.accepted_at,
        )
    )
    return updated_invite


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANT_INVITES"}


@router.get("", response_model=TenantInvitesResponse)
def list_tenant_invites(tenant_name: str = "Nair Luxury Escapes"):
    tenant_key = _normalize_tenant_name(tenant_name)
    return TenantInvitesResponse(
        tenant_name=tenant_key,
        source="backend-demo",
        invites=list(_seed_if_needed(tenant_key)),
    )


@router.post("", response_model=TenantInviteRecord)
def create_tenant_invite(payload: CreateTenantInviteRequest):
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Valid email required for tenant invite creation")
    invite = _invite_from_payload(payload)
    return _upsert_invite(invite)


@router.post("/bulk", response_model=TenantInvitesResponse)
def bulk_create_tenant_invites(payload: BulkCreateTenantInvitesRequest):
    if not payload.invites:
        raise HTTPException(status_code=400, detail="At least one invite is required for bulk create")

    created_invites = [_invite_from_payload(invite, accepted_at=None) for invite in payload.invites]
    for invite in created_invites:
        _upsert_invite(invite)

    tenant_key = _normalize_tenant_name(payload.tenant_name)
    return TenantInvitesResponse(
        tenant_name=tenant_key,
        source="backend-demo",
        invites=list(_seed_if_needed(tenant_key)),
    )


@router.post("/accept", response_model=TenantInviteRecord)
def accept_tenant_invite(payload: AcceptTenantInviteRequest):
    tenant_key = _normalize_tenant_name(payload.tenant_name)
    invites = _seed_if_needed(tenant_key)
    invite = next((item for item in invites if item.id == payload.invite_id), None)
    if not invite:
        raise HTTPException(status_code=404, detail="Tenant invite not found")
    accepted_invite = _accept_invite(invite, payload)
    _upsert_invite(accepted_invite)
    return accepted_invite


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
