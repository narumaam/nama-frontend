from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

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
    display_name: str = Field(..., min_length=1)
    role: TenantSessionRole
    scope: TenantSessionScope
    tenant_name: Optional[str] = None
    member_id: Optional[str] = None
    member_status: Optional[str] = None
    designation: Optional[str] = None
    team: Optional[str] = None


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
    if payload.role != "super-admin" or payload.scope != "platform":
        raise HTTPException(status_code=400, detail="Super admin session requires platform scope and super-admin role")

    session = TenantSessionRecord(
        id=_session_id("platform", payload.email),
        email=payload.email.strip().lower(),
        display_name=payload.display_name.strip(),
        role="super-admin",
        scope="platform",
        granted_at=_now_iso(),
    )
    _SUPER_ADMIN_SESSION_STORE.insert(0, session)
    return session
