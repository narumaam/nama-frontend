from types import SimpleNamespace
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.api.v1.beta_auth_store import authorize_session
from app.db.session import get_db
from app.models.auth import User, UserRole
import os

ALGORITHM = "HS256"
APP_ENV = os.getenv("NAMA_ENV", os.getenv("ENV", "development")).lower()
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY and APP_ENV != "development":
    raise RuntimeError("SECRET_KEY must be configured outside development.")
SECRET_KEY = SECRET_KEY or "dev-only-secret-key"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login", auto_error=False)


def _legacy_role_for_session(session: dict[str, Optional[str]]) -> UserRole:
    role = (session.get("role") or "").strip().lower()
    if role == "super-admin":
        return UserRole.R1_SUPER_ADMIN
    if role == "customer-admin":
        return UserRole.R2_ORG_ADMIN
    if role == "sales":
        return UserRole.R3_SALES_MANAGER
    if role == "operations":
        return UserRole.R4_OPS_EXECUTIVE
    if role == "finance":
        return UserRole.R5_FINANCE_ADMIN
    return UserRole.R6_SUB_AGENT


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    session_id = request.headers.get("x-nama-session-id", "").strip()
    if session_id:
        session = authorize_session(db, session_id=session_id, tenant_name=None, allowed_roles=None)
        tenant_name = session.get("tenant_name") or ""
        tenant_id = sum(ord(character) for character in tenant_name) % 10_000 if tenant_name else 0
        return SimpleNamespace(
            id=0,
            email=session["email"],
            full_name=session["display_name"],
            role=_legacy_role_for_session(session),
            tenant_id=tenant_id or 1,
            is_active=True,
            auth_scope=session["scope"],
            tenant_name=session.get("tenant_name"),
            member_id=session.get("member_id"),
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_tenant_context(user: User = Depends(get_current_user)):
    """
    Returns the tenant_id from the current user.
    Used for simulating Row Level Security (RLS).
    """
    return user.tenant_id

class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges",
            )
        return user
