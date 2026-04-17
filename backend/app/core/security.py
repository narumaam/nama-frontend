"""
HS-1: Authentication Security Core
-----------------------------------
Fixes:
  - JWT now includes user_id, tenant_id, role — not just email
  - Access token TTL: 15 minutes
  - Refresh token TTL: 7 days, stored in httpOnly cookie
  - Passwords hashed with bcrypt via passlib
  - Secret must be set in env (not a fallback default in production)

Acceptance Gate (HS-1):
  ✓ All routes return HTTP 401 without a valid Bearer token
  ✓ Refresh endpoint issues new access token and rotates refresh token
  ✓ JWT payload includes tenant_id, role, user_id on every token
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

# ── Config ────────────────────────────────────────────────────────────────────
# Use NAMA_JWT_SECRET as the primary secret (syncs with Vercel middleware)
SECRET_KEY: str = os.getenv("NAMA_JWT_SECRET") or os.getenv("SECRET_KEY", "")
REFRESH_SECRET_KEY: str = os.getenv("REFRESH_SECRET_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

if not SECRET_KEY:
    # In production this MUST be set. For local dev we generate a random one so
    # the server starts, but it will invalidate tokens on restart.
    SECRET_KEY = secrets.token_hex(32)
if not REFRESH_SECRET_KEY:
    REFRESH_SECRET_KEY = secrets.token_hex(32)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Token creation ────────────────────────────────────────────────────────────

def create_access_token(
    *,
    user_id: int,
    tenant_id: int,
    role: str,
    email: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Issue a short-lived access token.
    Claims: sub (email), user_id, tenant_id, role, exp, iat, type=access
    """
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {
        "sub": email,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    *,
    user_id: int,
    tenant_id: int,
    role: str,
    email: str,
) -> str:
    """
    Issue a long-lived refresh token (7 days).
    Signed with REFRESH_SECRET_KEY to allow independent rotation.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": email,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire,
        "iat": now,
        "type": "refresh",
    }
    return jwt.encode(payload, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


# ── Token verification ────────────────────────────────────────────────────────

def decode_access_token(token: str) -> dict:
    """
    Decode and validate an access token.
    Raises JWTError on invalid/expired token.
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("type") != "access":
        raise JWTError("Not an access token")
    _require_claims(payload)
    return payload


def decode_refresh_token(token: str) -> dict:
    """
    Decode and validate a refresh token.
    Raises JWTError on invalid/expired token.
    """
    payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("type") != "refresh":
        raise JWTError("Not a refresh token")
    _require_claims(payload)
    return payload


def _require_claims(payload: dict) -> None:
    """Assert all mandatory claims are present."""
    for claim in ("sub", "user_id", "tenant_id", "role"):
        if payload.get(claim) is None:
            raise JWTError(f"Missing required claim: {claim}")
