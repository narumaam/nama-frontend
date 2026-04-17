"""Google OAuth endpoints for NAMA."""
import os, secrets
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.beta_auth import BetaTenantMember
from app.api.v1.beta_auth_store import upsert_member, bootstrap_tenant_admin_credential, issue_tenant_session

router = APIRouter()
_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"

def _client_id() -> str:
    cid = os.environ.get("GOOGLE_CLIENT_ID", "")
    if not cid:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on this server.")
    return cid

async def _verify(id_token: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(_TOKENINFO, params={"id_token": id_token})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired Google token.")
    data = resp.json()
    if data.get("aud") != _client_id():
        raise HTTPException(status_code=401, detail="Google token not issued for this app.")
    if not data.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google account email not verified.")
    return data

class GoogleRegisterPayload(BaseModel):
    id_token: str
    tenant_name: str

class GoogleLoginPayload(BaseModel):
    id_token: str

@router.post("/google/register")
async def google_register(payload: GoogleRegisterPayload, db: Session = Depends(get_db)):
    claims = await _verify(payload.id_token)
    email: str = claims["email"]
    name: str = claims.get("name") or email.split("@")[0]
    upsert_member(db, {
        "tenant_name": payload.tenant_name, "email": email, "name": name,
        "role": "customer-admin", "designation": "Workspace Owner", "team": "Leadership",
        "status": "Active", "source": "tenant-profile", "reports_to": "Platform",
        "responsibility": "Workspace ownership, governance, and team access",
    })
    try:
        bootstrap_tenant_admin_credential(db, tenant_name=payload.tenant_name,
            email=email, access_code="GOOG-" + secrets.token_urlsafe(24))
    except HTTPException as exc:
        if exc.status_code not in (409, 400): raise
    return issue_tenant_session(db, tenant_name=payload.tenant_name, email=email,
        display_name=name, role="customer-admin")

@router.post("/google/login")
async def google_login(payload: GoogleLoginPayload, db: Session = Depends(get_db)):
    claims = await _verify(payload.id_token)
    email: str = claims["email"].lower().strip()
    name: str = claims.get("name", email)
    member = db.query(BetaTenantMember).filter(BetaTenantMember.email == email).first()
    if not member:
        raise HTTPException(status_code=404,
            detail="No NAMA workspace found for this Google account. Please register first.")
    return issue_tenant_session(db, tenant_name=member.tenant_name, email=email,
        display_name=member.name or name, role=member.role, member_id=member.member_id,
        member_status=member.status, designation=member.designation, team=member.team)
