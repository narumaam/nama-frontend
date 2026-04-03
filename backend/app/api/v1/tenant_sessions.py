from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.demo_credentials import ensure_super_admin_credentials, verify_super_admin_credential, verify_tenant_member_credential
from app.api.v1.tenant_members import _seed_if_needed

router = APIRouter()

TenantSessionRole = Literal["super-admin", "customer-admin", "sales", "finance", "operations", "viewer"]
TenantSessionScope = Literal["platform", "tenant"]

_TENANT_SESSION_STORE: dict[str, list["TenantSessionRecord"]] = {}
_SUPER_ADMIN_SESSION_STORE: list["TenantSessionRecord"] = []


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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tenant_key(tenant_name: Optional[str]) -> str:
    return (tenant_name or "NAMA Demo").strip() or "NAMA Demo"


def _session_id(scope: TenantSessionScope, email: str) -> str:
    token = email.strip().lower().replace("@", "-").replace(".", "-")
    return f"{scope}-{token}-{int(datetime.now(timezone.utc).timestamp())}"


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "TENANT_SESSIONS"}


@router.get("/tenant")
def list_tenant_sessions(tenant_name: str = "NAMA Demo"):
    return {
        "tenant_name": _tenant_key(tenant_name),
        "sessions": _TENANT_SESSION_STORE.get(_tenant_key(tenant_name), []),
    }


@router.post("/tenant", response_model=TenantSessionRecord)
def issue_tenant_session(payload: TenantSessionCreateRequest):
    if payload.scope != "tenant":
        raise HTTPException(status_code=400, detail="Tenant session scope must be tenant")
    if payload.role == "super-admin":
        raise HTTPException(status_code=400, detail="Use super-admin session route for super-admin issuance")

    tenant_key = _tenant_key(payload.tenant_name)
    if payload.access_code:
        member = next(
            (item for item in _seed_if_needed(tenant_key) if item.email == payload.email.strip().lower()),
            None,
        )
        if not member:
            raise HTTPException(status_code=404, detail="Tenant member not found for that email")
        if not verify_tenant_member_credential(member.tenant_name, member.email, payload.access_code):
            raise HTTPException(status_code=401, detail="Invalid tenant member credentials")

        session = TenantSessionRecord(
            id=_session_id("tenant", member.email),
            email=member.email,
            display_name=member.name,
            role=member.role,
            scope="tenant",
            tenant_name=member.tenant_name,
            member_id=member.id,
            member_status=member.status,
            designation=member.designation,
            team=member.team,
            granted_at=_now_iso(),
        )
        _TENANT_SESSION_STORE.setdefault(tenant_key, []).insert(0, session)
        return session

    if not payload.display_name or not payload.role:
        raise HTTPException(status_code=400, detail="display_name and role are required when access_code is not provided")

    session = TenantSessionRecord(
        id=_session_id("tenant", payload.email),
        email=payload.email.strip().lower(),
        display_name=payload.display_name.strip(),
        role=payload.role,
        scope="tenant",
        tenant_name=tenant_key,
        member_id=payload.member_id,
        member_status=payload.member_status,
        designation=payload.designation,
        team=payload.team,
        granted_at=_now_iso(),
    )
    _TENANT_SESSION_STORE.setdefault(tenant_key, []).insert(0, session)
    return session


@router.get("/super-admin")
def list_super_admin_sessions():
    return {
        "sessions": _SUPER_ADMIN_SESSION_STORE,
    }


@router.post("/super-admin", response_model=TenantSessionRecord)
def issue_super_admin_session(payload: TenantSessionCreateRequest):
    if payload.scope != "platform":
        raise HTTPException(status_code=400, detail="Super admin session requires platform scope")
    if payload.access_code:
        ensure_super_admin_credentials()
        if not verify_super_admin_credential(payload.email, payload.access_code):
            raise HTTPException(status_code=401, detail="Invalid Super Admin credentials")
    elif payload.role != "super-admin":
        raise HTTPException(status_code=400, detail="Super admin session requires platform scope and super-admin role")

    session = TenantSessionRecord(
        id=_session_id("platform", payload.email),
        email=payload.email.strip().lower(),
        display_name=(payload.display_name or "NAMA Super Admin").strip(),
        role="super-admin",
        scope="platform",
        granted_at=_now_iso(),
    )
    _SUPER_ADMIN_SESSION_STORE.insert(0, session)
    return session
