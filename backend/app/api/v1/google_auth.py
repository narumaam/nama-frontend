"""
Google OAuth endpoints for NAMA.
POST /api/v1/auth/google/register  — verify Google ID token → create Tenant + User → JWT
POST /api/v1/auth/google/login     — verify Google ID token → find User → JWT
Requires GOOGLE_CLIENT_ID env var on Railway.
"""
import os, re, secrets
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.auth import User, Tenant, TenantType, UserRole
from app.core.security import hash_password, create_access_token, create_refresh_token

router = APIRouter()
_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"
COOKIE_NAME = "nama_refresh_token"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60

def _client_id() -> str:
    cid = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    if not cid:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on this server.")
    return cid

async def _verify_google_token(id_token: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(_TOKENINFO, params={"id_token": id_token})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired Google token.")
    data = resp.json()
    if data.get("aud") != _client_id():
        raise HTTPException(status_code=401, detail="Google token not issued for this app.")
    if str(data.get("email_verified", "")).lower() not in ("true", "1"):
        raise HTTPException(status_code=401, detail="Google account email not verified.")
    return data

def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower().strip()).strip("-")
    return slug[:24] if slug else "org"

def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(key=COOKIE_NAME, value=refresh_token,
        httponly=True, secure=True, samesite="lax",
        max_age=COOKIE_MAX_AGE, path="/api/v1/refresh")

class GoogleRegisterPayload(BaseModel):
    id_token: str
    tenant_name: str = ""

class GoogleLoginPayload(BaseModel):
    id_token: str

@router.post("/google/register")
async def google_register(payload: GoogleRegisterPayload, response: Response, db: Session = Depends(get_db)):
    claims = await _verify_google_token(payload.id_token)
    email = claims["email"].lower().strip()
    name = claims.get("name") or email.split("@")[0].replace(".", " ").title()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this Google email already exists. Please sign in instead.")
    tenant_name = (payload.tenant_name or name + "'s Workspace").strip()
    org_code = _slugify(tenant_name) + "-" + secrets.token_hex(3)
    new_tenant = Tenant(name=tenant_name, type=TenantType.L3_TRAVEL_CO, org_code=org_code,
        base_currency="INR", status="ACTIVE", settings={})
    db.add(new_tenant); db.flush()
    new_user = User(email=email, hashed_password=hash_password(secrets.token_urlsafe(32)),
        full_name=name, tenant_id=new_tenant.id, role=UserRole.R2_ORG_ADMIN,
        is_active=True, profile_data={"google_signin": True, "picture": claims.get("picture", "")})
    db.add(new_user); db.commit()
    db.refresh(new_user); db.refresh(new_tenant)
    role_str = UserRole.R2_ORG_ADMIN.value
    access_token = create_access_token(user_id=new_user.id, tenant_id=new_tenant.id, role=role_str, email=email)
    refresh_token = create_refresh_token(user_id=new_user.id, tenant_id=new_tenant.id, role=role_str, email=email)
    _set_refresh_cookie(response, refresh_token)
    return {"id": str(new_user.id), "email": email, "display_name": name,
        "role": role_str, "tenant_name": tenant_name,
        "access_token": access_token, "user_id": new_user.id, "tenant_id": new_tenant.id}

@router.post("/google/login")
async def google_login(payload: GoogleLoginPayload, response: Response, db: Session = Depends(get_db)):
    claims = await _verify_google_token(payload.id_token)
    email = claims["email"].lower().strip()
    name = claims.get("name") or email.split("@")[0].replace(".", " ").title()
    user: Optional[User] = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No NAMA account found for this Google email. Please register first.")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is deactivated.")
    tenant: Optional[Tenant] = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token = create_access_token(user_id=user.id, tenant_id=user.tenant_id, role=role_str, email=email)
    refresh_token = create_refresh_token(user_id=user.id, tenant_id=user.tenant_id, role=role_str, email=email)
    _set_refresh_cookie(response, refresh_token)
    return {"id": str(user.id), "email": email, "display_name": user.full_name or name,
        "role": role_str, "tenant_name": tenant.name if tenant else "",
        "access_token": access_token, "user_id": user.id, "tenant_id": user.tenant_id}
