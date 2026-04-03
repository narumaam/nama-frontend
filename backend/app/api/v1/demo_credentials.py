from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets
from typing import Literal, Optional, TypedDict


TenantCredentialRole = Literal["customer-admin", "sales", "finance", "operations", "viewer"]


class CredentialRecord(TypedDict):
    subject_email: str
    secret_hash: str
    preview_code: Optional[str]
    issued_at: str
    updated_at: str
    reset_token: Optional[str]
    reset_expires_at: Optional[str]
    rotation_required: bool


_TENANT_CREDENTIAL_STORE: dict[str, dict[str, CredentialRecord]] = {}
_SUPER_ADMIN_CREDENTIAL_STORE: dict[str, CredentialRecord] = {}
SUPER_ADMIN_EMAIL = "control@nama.internal"
SUPER_ADMIN_ACCESS_CODE = "NAMA-ALPHA"
RESET_TTL_MINUTES = 30


def now() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now().isoformat()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def tenant_key(tenant_name: str) -> str:
    return "".join(character for character in tenant_name.strip().lower() if character.isalnum()) or "tenant"


def tenant_access_code(tenant_name: str, role: TenantCredentialRole) -> str:
    tenant_token = tenant_key(tenant_name)[:8].upper() or "TENANT"
    role_token = "ADMIN" if role == "customer-admin" else role.upper()
    return f"NAMA-{tenant_token}-{role_token}"


def hash_secret(secret: str) -> str:
    return sha256(secret.encode("utf-8")).hexdigest()


def _reset_expiry_iso() -> str:
    return (now() + timedelta(minutes=RESET_TTL_MINUTES)).isoformat()


def _is_expired(timestamp: Optional[str]) -> bool:
    if not timestamp:
        return True
    try:
        return datetime.fromisoformat(timestamp) < now()
    except ValueError:
        return True


def create_record(email: str, secret: str, preview_code: Optional[str], rotation_required: bool) -> CredentialRecord:
    current = now_iso()
    return {
        "subject_email": normalize_email(email),
        "secret_hash": hash_secret(secret),
        "preview_code": preview_code,
        "issued_at": current,
        "updated_at": current,
        "reset_token": None,
        "reset_expires_at": None,
        "rotation_required": rotation_required,
    }


def ensure_super_admin_credentials() -> dict[str, CredentialRecord]:
    email = normalize_email(SUPER_ADMIN_EMAIL)
    if email not in _SUPER_ADMIN_CREDENTIAL_STORE:
        _SUPER_ADMIN_CREDENTIAL_STORE[email] = create_record(
            email=email,
            secret=SUPER_ADMIN_ACCESS_CODE,
            preview_code=SUPER_ADMIN_ACCESS_CODE,
            rotation_required=False,
        )
    return _SUPER_ADMIN_CREDENTIAL_STORE


def ensure_tenant_member_credential(
    tenant_name: str,
    email: str,
    role: TenantCredentialRole,
    *,
    secret: Optional[str] = None,
    rotation_required: bool = True,
) -> CredentialRecord:
    normalized_tenant = tenant_name.strip() or "NAMA Demo"
    normalized_email = normalize_email(email)
    tenant_store = _TENANT_CREDENTIAL_STORE.setdefault(normalized_tenant, {})
    if normalized_email not in tenant_store:
        fallback_secret = secret or tenant_access_code(normalized_tenant, role)
        tenant_store[normalized_email] = create_record(
            email=normalized_email,
            secret=fallback_secret,
            preview_code=fallback_secret if secret is None else None,
            rotation_required=rotation_required if secret is None else False,
        )
    return tenant_store[normalized_email]


def verify_tenant_member_credential(tenant_name: str, email: str, secret: str) -> Optional[CredentialRecord]:
    tenant_store = _TENANT_CREDENTIAL_STORE.setdefault(tenant_name.strip() or "NAMA Demo", {})
    record = tenant_store.get(normalize_email(email))
    if not record:
        return None
    if record["secret_hash"] != hash_secret(secret):
        return None
    return record


def verify_super_admin_credential(email: str, secret: str) -> Optional[CredentialRecord]:
    records = ensure_super_admin_credentials()
    record = records.get(normalize_email(email))
    if not record:
        return None
    if record["secret_hash"] != hash_secret(secret):
        return None
    return record


def set_tenant_member_secret(tenant_name: str, email: str, secret: str) -> Optional[CredentialRecord]:
    tenant_store = _TENANT_CREDENTIAL_STORE.setdefault(tenant_name.strip() or "NAMA Demo", {})
    record = tenant_store.get(normalize_email(email))
    if not record:
        return None
    record["secret_hash"] = hash_secret(secret)
    record["preview_code"] = None
    record["updated_at"] = now_iso()
    record["rotation_required"] = False
    record["reset_token"] = None
    record["reset_expires_at"] = None
    return record


def set_super_admin_secret(email: str, secret: str) -> Optional[CredentialRecord]:
    records = ensure_super_admin_credentials()
    record = records.get(normalize_email(email))
    if not record:
        return None
    record["secret_hash"] = hash_secret(secret)
    record["preview_code"] = None
    record["updated_at"] = now_iso()
    record["rotation_required"] = False
    record["reset_token"] = None
    record["reset_expires_at"] = None
    return record


def issue_tenant_reset_token(tenant_name: str, email: str) -> Optional[CredentialRecord]:
    tenant_store = _TENANT_CREDENTIAL_STORE.setdefault(tenant_name.strip() or "NAMA Demo", {})
    record = tenant_store.get(normalize_email(email))
    if not record:
        return None
    record["reset_token"] = secrets.token_urlsafe(18)
    record["reset_expires_at"] = _reset_expiry_iso()
    record["updated_at"] = now_iso()
    return record


def issue_super_admin_reset_token(email: str) -> Optional[CredentialRecord]:
    records = ensure_super_admin_credentials()
    record = records.get(normalize_email(email))
    if not record:
        return None
    record["reset_token"] = secrets.token_urlsafe(18)
    record["reset_expires_at"] = _reset_expiry_iso()
    record["updated_at"] = now_iso()
    return record


def verify_tenant_reset_token(tenant_name: str, email: str, reset_token: str) -> Optional[CredentialRecord]:
    tenant_store = _TENANT_CREDENTIAL_STORE.setdefault(tenant_name.strip() or "NAMA Demo", {})
    record = tenant_store.get(normalize_email(email))
    if not record:
        return None
    if record["reset_token"] != reset_token or _is_expired(record["reset_expires_at"]):
        return None
    return record


def verify_super_admin_reset_token(email: str, reset_token: str) -> Optional[CredentialRecord]:
    records = ensure_super_admin_credentials()
    record = records.get(normalize_email(email))
    if not record:
        return None
    if record["reset_token"] != reset_token or _is_expired(record["reset_expires_at"]):
        return None
    return record
