from datetime import datetime, timezone
from hashlib import sha256
from typing import Literal, Optional, TypedDict


TenantCredentialRole = Literal["customer-admin", "sales", "finance", "operations", "viewer"]


class CredentialRecord(TypedDict):
    subject_email: str
    secret_hash: str
    preview_code: str
    issued_at: str
    updated_at: str


_TENANT_CREDENTIAL_STORE: dict[str, dict[str, CredentialRecord]] = {}
_SUPER_ADMIN_CREDENTIAL_STORE: dict[str, CredentialRecord] = {}
SUPER_ADMIN_EMAIL = "control@nama.internal"
SUPER_ADMIN_ACCESS_CODE = "NAMA-ALPHA"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def create_record(email: str, preview_code: str) -> CredentialRecord:
    now = now_iso()
    return {
        "subject_email": normalize_email(email),
        "secret_hash": hash_secret(preview_code),
        "preview_code": preview_code,
        "issued_at": now,
        "updated_at": now,
    }


def ensure_super_admin_credentials() -> dict[str, CredentialRecord]:
    email = normalize_email(SUPER_ADMIN_EMAIL)
    if email not in _SUPER_ADMIN_CREDENTIAL_STORE:
        _SUPER_ADMIN_CREDENTIAL_STORE[email] = create_record(email, SUPER_ADMIN_ACCESS_CODE)
    return _SUPER_ADMIN_CREDENTIAL_STORE


def ensure_tenant_member_credential(tenant_name: str, email: str, role: TenantCredentialRole) -> CredentialRecord:
    normalized_tenant = tenant_name.strip() or "NAMA Demo"
    normalized_email = normalize_email(email)
    tenant_store = _TENANT_CREDENTIAL_STORE.setdefault(normalized_tenant, {})
    if normalized_email not in tenant_store:
        tenant_store[normalized_email] = create_record(normalized_email, tenant_access_code(normalized_tenant, role))
    return tenant_store[normalized_email]


def verify_tenant_member_credential(tenant_name: str, email: str, secret: str) -> Optional[CredentialRecord]:
    tenant_store = _TENANT_CREDENTIAL_STORE.setdefault(tenant_name.strip() or "NAMA Demo", {})
    record = tenant_store.get(normalize_email(email))
    if not record:
        return None
    return record if record["secret_hash"] == hash_secret(secret) else None


def verify_super_admin_credential(email: str, secret: str) -> Optional[CredentialRecord]:
    records = ensure_super_admin_credentials()
    record = records.get(normalize_email(email))
    if not record:
        return None
    return record if record["secret_hash"] == hash_secret(secret) else None
