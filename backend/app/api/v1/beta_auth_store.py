from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import pbkdf2_hmac, sha256
import os
import secrets
from typing import Iterable, Literal, Optional

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.models.beta_auth import (
    BetaAuthAuditEvent,
    BetaCredential,
    BetaSession,
    BetaTenantInvite,
    BetaTenantMember,
)


TenantRole = Literal["customer-admin", "sales", "finance", "operations", "viewer"]
TenantScope = Literal["tenant", "platform"]

SUPER_ADMIN_EMAIL = "control@nama.internal"
SUPER_ADMIN_BOOTSTRAP_CODE = "NAMA-ALPHA"
SESSION_TTL_HOURS = 8
RESET_TTL_MINUTES = 30
INVITE_TTL_DAYS = 7


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_tenant_name(tenant_name: Optional[str]) -> str:
    return (tenant_name or "NAMA Demo").strip() or "NAMA Demo"


def tenant_key(tenant_name: str) -> str:
    return "".join(character for character in normalize_tenant_name(tenant_name).lower() if character.isalnum()) or "tenant"


def normalize_role(role: str) -> TenantRole:
    normalized = role.strip().lower()
    if normalized in {"customer admin", "customer-admin"}:
        return "customer-admin"
    if normalized == "sales":
        return "sales"
    if normalized == "finance":
        return "finance"
    if normalized in {"operations", "ops"}:
        return "operations"
    return "viewer"


def normalize_member_status(status: Optional[str]) -> str:
    normalized = (status or "Seeded").strip().lower()
    if normalized == "active":
        return "Active"
    if normalized == "invited":
        return "Invited"
    return "Seeded"


def normalize_invite_status(status: Optional[str]) -> str:
    normalized = (status or "Pending").strip().lower()
    if normalized == "draft":
        return "Draft"
    if normalized == "accepted":
        return "Accepted"
    return "Pending"


def tenant_access_code(tenant_name: str, role: TenantRole) -> str:
    tenant_token = tenant_key(tenant_name)[:8].upper() or "TENANT"
    role_token = "ADMIN" if role == "customer-admin" else role.upper()
    return f"NAMA-{tenant_token}-{role_token}"


def password_meets_policy(secret: str) -> bool:
    if len(secret.strip()) < 8:
        return False
    has_alpha = any(character.isalpha() for character in secret)
    has_digit = any(character.isdigit() for character in secret)
    return has_alpha and has_digit


def _password_error() -> HTTPException:
    return HTTPException(
        status_code=400,
        detail="Access code must be at least 8 characters and include both letters and numbers",
    )


def hash_secret(secret: str, salt: Optional[str] = None) -> str:
    resolved_salt = salt or secrets.token_hex(16)
    iterations = 120000
    derived = pbkdf2_hmac("sha256", secret.encode("utf-8"), resolved_salt.encode("utf-8"), iterations).hex()
    return f"pbkdf2_sha256${iterations}${resolved_salt}${derived}"


def verify_secret(secret: str, stored_hash: str) -> bool:
    try:
        algorithm, iteration_text, salt, digest = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        recalculated = hash_secret(secret, salt)
        return secrets.compare_digest(recalculated, stored_hash)
    except ValueError:
        return False


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def _session_id(scope: TenantScope, email: str) -> str:
    token = normalize_email(email).replace("@", "-").replace(".", "-")
    return f"{scope}-{token}-{int(now_utc().timestamp() * 1000)}-{secrets.token_hex(3)}"


def _invite_id(tenant_name: str, email: str) -> str:
    return f"{tenant_key(tenant_name)}-{normalize_email(email).replace('@', '-').replace('.', '-')}-{int(now_utc().timestamp())}"


def _member_id(tenant_name: str, email: str) -> str:
    return f"{tenant_key(tenant_name)}-{normalize_email(email).replace('@', '-').replace('.', '-')}"


def _invite_expiry() -> str:
    return (now_utc() + timedelta(days=INVITE_TTL_DAYS)).isoformat()


def _reset_expiry() -> str:
    return (now_utc() + timedelta(minutes=RESET_TTL_MINUTES)).isoformat()


def _session_expiry() -> str:
    return (now_utc() + timedelta(hours=SESSION_TTL_HOURS)).isoformat()


def _is_expired(timestamp: Optional[str]) -> bool:
    if not timestamp:
        return True
    try:
        return datetime.fromisoformat(timestamp) < now_utc()
    except ValueError:
        return True


def record_audit_event(
    db: Session,
    *,
    tenant_name: Optional[str],
    actor_email: Optional[str],
    subject_email: Optional[str],
    scope: TenantScope,
    category: str,
    action: str,
    detail: str,
) -> BetaAuthAuditEvent:
    event = BetaAuthAuditEvent(
        event_id=f"audit-{int(now_utc().timestamp() * 1000)}-{secrets.token_hex(4)}",
        tenant_name=normalize_tenant_name(tenant_name) if tenant_name else None,
        actor_email=normalize_email(actor_email) if actor_email else None,
        subject_email=normalize_email(subject_email) if subject_email else None,
        scope=scope,
        category=category,
        action=action,
        detail=detail,
        created_at=now_iso(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def ensure_super_admin_credential(db: Session) -> BetaCredential:
    record = (
        db.query(BetaCredential)
        .filter(BetaCredential.scope == "platform", BetaCredential.subject_email == SUPER_ADMIN_EMAIL)
        .first()
    )
    if record:
        return record

    current = now_iso()
    record = BetaCredential(
        scope="platform",
        tenant_name=None,
        subject_email=SUPER_ADMIN_EMAIL,
        subject_role="super-admin",
        secret_hash=hash_secret(SUPER_ADMIN_BOOTSTRAP_CODE),
        preview_code=SUPER_ADMIN_BOOTSTRAP_CODE,
        rotation_required=False,
        created_at=current,
        updated_at=current,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def ensure_tenant_member_credential(
    db: Session,
    *,
    tenant_name: str,
    email: str,
    role: TenantRole,
    secret: Optional[str] = None,
    rotation_required: bool = True,
) -> BetaCredential:
    tenant = normalize_tenant_name(tenant_name)
    subject_email = normalize_email(email)
    record = (
        db.query(BetaCredential)
        .filter(
            BetaCredential.scope == "tenant",
            BetaCredential.tenant_name == tenant,
            BetaCredential.subject_email == subject_email,
        )
        .first()
    )
    if record:
        return record

    preview_code = None if secret else tenant_access_code(tenant, role)
    resolved_secret = secret or preview_code
    current = now_iso()
    record = BetaCredential(
        scope="tenant",
        tenant_name=tenant,
        subject_email=subject_email,
        subject_role=role,
        secret_hash=hash_secret(resolved_secret),
        preview_code=preview_code,
        rotation_required=rotation_required if secret is None else False,
        created_at=current,
        updated_at=current,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def seed_tenant_defaults(db: Session, tenant_name: str) -> None:
    tenant = normalize_tenant_name(tenant_name)
    if db.query(BetaTenantMember).filter(BetaTenantMember.tenant_name == tenant).first():
        return

    token = tenant_key(tenant)
    current = now_iso()
    members = [
        {
            "member_id": f"{token}-admin",
            "name": "Workspace Admin",
            "email": f"admin@{token}.demo",
            "role": "customer-admin",
            "designation": "Workspace Admin",
            "team": "Leadership",
            "status": "Active",
            "source": "backend-demo",
            "reports_to": "Platform",
            "responsibility": "Workspace ownership, governance, and team access",
        },
        {
            "member_id": f"{token}-sales",
            "name": "Sales Lead",
            "email": f"sales@{token}.demo",
            "role": "sales",
            "designation": "Travel Consultant",
            "team": "Sales Desk",
            "status": "Active",
            "source": "backend-demo",
            "reports_to": "Workspace Admin",
            "responsibility": "Lead conversion, follow-up, and quote management",
        },
        {
            "member_id": f"{token}-finance",
            "name": "Finance Lead",
            "email": f"finance@{token}.demo",
            "role": "finance",
            "designation": "Accounts Lead",
            "team": "Billing",
            "status": "Active",
            "source": "backend-demo",
            "reports_to": "Workspace Admin",
            "responsibility": "Deposits, invoices, and settlement controls",
        },
        {
            "member_id": f"{token}-ops",
            "name": "Operations Lead",
            "email": f"ops@{token}.demo",
            "role": "operations",
            "designation": "Operations Lead",
            "team": "Fulfilment",
            "status": "Active",
            "source": "backend-demo",
            "reports_to": "Workspace Admin",
            "responsibility": "Bookings, traveler packs, and execution handoff",
        },
    ]
    for entry in members:
        db.add(
            BetaTenantMember(
                tenant_name=tenant,
                created_at=current,
                updated_at=current,
                invite_id=None,
                invited_at=None,
                accepted_at=None,
                **entry,
            )
        )
    db.commit()

    for entry in members:
        ensure_tenant_member_credential(db, tenant_name=tenant, email=entry["email"], role=normalize_role(entry["role"]))

    invites = [
        {
            "invite_id": f"{token}-invite-sales",
            "name": "Aisha Khan",
            "email": "aisha@demoagency.in",
            "role": "sales",
            "designation": "Senior Executive",
            "team": "Inbound Desk",
            "reports_to": "Sales Manager",
            "responsibility": "Lead qualification, quoting, and follow-up",
            "status": "Pending",
            "created_at": current,
            "invited_at": current,
            "accepted_at": None,
            "invite_token": secrets.token_urlsafe(16),
            "token_expires_at": _invite_expiry(),
            "token_used_at": None,
            "source": "backend-demo",
        },
        {
            "invite_id": f"{token}-invite-ops",
            "name": "Rohan Iyer",
            "email": "rohan@demoagency.in",
            "role": "operations",
            "designation": "Operations Lead",
            "team": "Luxury Desk",
            "reports_to": "Customer Admin",
            "responsibility": "Execution, booking release, and traveler handoff",
            "status": "Accepted",
            "created_at": current,
            "invited_at": current,
            "accepted_at": current,
            "invite_token": secrets.token_urlsafe(16),
            "token_expires_at": _invite_expiry(),
            "token_used_at": current,
            "source": "accepted",
        },
        {
            "invite_id": f"{token}-invite-finance",
            "name": "Meera Shah",
            "email": "meera@demoagency.in",
            "role": "finance",
            "designation": "Accounts Lead",
            "team": "Billing",
            "reports_to": "Finance Lead",
            "responsibility": "Billing, payouts, and reconciliation",
            "status": "Draft",
            "created_at": current,
            "invited_at": "Not sent yet",
            "accepted_at": None,
            "invite_token": secrets.token_urlsafe(16),
            "token_expires_at": _invite_expiry(),
            "token_used_at": None,
            "source": "manual",
        },
    ]
    for invite in invites:
        db.add(BetaTenantInvite(tenant_name=tenant, **invite))
    db.commit()


def member_to_contract(member: BetaTenantMember) -> dict[str, Optional[str]]:
    return {
        "id": member.member_id,
        "tenant_name": member.tenant_name,
        "name": member.name,
        "email": member.email,
        "role": member.role,
        "designation": member.designation,
        "team": member.team,
        "status": member.status,
        "source": member.source,
        "reports_to": member.reports_to,
        "responsibility": member.responsibility,
        "invite_id": member.invite_id,
        "invited_at": member.invited_at,
        "accepted_at": member.accepted_at,
    }


def invite_to_contract(invite: BetaTenantInvite) -> dict[str, Optional[str]]:
    return {
        "id": invite.invite_id,
        "tenant_name": invite.tenant_name,
        "name": invite.name,
        "email": invite.email,
        "role": invite.role,
        "designation": invite.designation,
        "team": invite.team,
        "reports_to": invite.reports_to,
        "responsibility": invite.responsibility,
        "status": invite.status,
        "created_at": invite.created_at,
        "invited_at": invite.invited_at,
        "accepted_at": invite.accepted_at,
        "invite_token": invite.invite_token,
        "token_expires_at": invite.token_expires_at,
        "token_used_at": invite.token_used_at,
        "source": invite.source,
    }


def session_to_contract(session: BetaSession) -> dict[str, Optional[str]]:
    return {
        "id": session.session_id,
        "email": session.email,
        "display_name": session.display_name,
        "role": session.role,
        "scope": session.scope,
        "tenant_name": session.tenant_name,
        "member_id": session.member_id,
        "member_status": session.member_status,
        "designation": session.designation,
        "team": session.team,
        "source": "backend-demo",
        "granted_at": session.granted_at,
    }


def audit_to_contract(event: BetaAuthAuditEvent) -> dict[str, Optional[str]]:
    return {
        "id": event.event_id,
        "tenant_name": event.tenant_name,
        "actor_email": event.actor_email,
        "subject_email": event.subject_email,
        "scope": event.scope,
        "category": event.category,
        "action": event.action,
        "detail": event.detail,
        "created_at": event.created_at,
    }


def list_members(db: Session, tenant_name: str) -> list[dict[str, Optional[str]]]:
    seed_tenant_defaults(db, tenant_name)
    tenant = normalize_tenant_name(tenant_name)
    members = (
        db.query(BetaTenantMember)
        .filter(BetaTenantMember.tenant_name == tenant)
        .order_by(BetaTenantMember.updated_at.desc(), BetaTenantMember.name.asc())
        .all()
    )
    return [member_to_contract(member) for member in members]


def upsert_member(db: Session, payload: dict[str, Optional[str]], actor_email: Optional[str] = None) -> dict[str, Optional[str]]:
    tenant = normalize_tenant_name(payload["tenant_name"])
    seed_tenant_defaults(db, tenant)
    email = normalize_email(payload["email"])
    role = normalize_role(payload["role"] or "viewer")
    current = now_iso()

    member = (
        db.query(BetaTenantMember)
        .filter(BetaTenantMember.tenant_name == tenant, BetaTenantMember.email == email)
        .first()
    )
    if not member:
        member = BetaTenantMember(
            member_id=(payload.get("id") or _member_id(tenant, email)),
            tenant_name=tenant,
            email=email,
            created_at=current,
            updated_at=current,
            name=payload["name"].strip(),
            role=role,
            designation=payload["designation"].strip(),
            team=payload["team"].strip(),
            status=normalize_member_status(payload.get("status")),
            source=(payload.get("source") or "manual").strip(),
            reports_to=(payload.get("reports_to") or "Customer Admin").strip(),
            responsibility=(payload.get("responsibility") or "Workspace participation").strip(),
            invite_id=payload.get("invite_id"),
            invited_at=payload.get("invited_at"),
            accepted_at=payload.get("accepted_at"),
        )
        db.add(member)
    else:
        member.member_id = payload.get("id") or member.member_id
        member.name = payload["name"].strip()
        member.role = role
        member.designation = payload["designation"].strip()
        member.team = payload["team"].strip()
        member.status = normalize_member_status(payload.get("status"))
        member.source = (payload.get("source") or member.source).strip()
        member.reports_to = (payload.get("reports_to") or member.reports_to).strip()
        member.responsibility = (payload.get("responsibility") or member.responsibility).strip()
        member.invite_id = payload.get("invite_id")
        member.invited_at = payload.get("invited_at")
        member.accepted_at = payload.get("accepted_at")
        member.updated_at = current

    db.commit()
    db.refresh(member)
    ensure_tenant_member_credential(db, tenant_name=tenant, email=email, role=role)
    record_audit_event(
        db,
        tenant_name=tenant,
        actor_email=actor_email,
        subject_email=email,
        scope="tenant",
        category="member",
        action="upserted",
        detail=f"{member.name} was saved as {member.role} for {tenant}.",
    )
    return member_to_contract(member)


def bulk_upsert_members(db: Session, tenant_name: str, members: Iterable[dict[str, Optional[str]]], actor_email: Optional[str] = None) -> list[dict[str, Optional[str]]]:
    results = []
    for payload in members:
        next_payload = dict(payload)
        next_payload["tenant_name"] = tenant_name
        results.append(upsert_member(db, next_payload, actor_email=actor_email))
    return list_members(db, tenant_name)


def list_invites(db: Session, tenant_name: str) -> list[dict[str, Optional[str]]]:
    seed_tenant_defaults(db, tenant_name)
    tenant = normalize_tenant_name(tenant_name)
    invites = (
        db.query(BetaTenantInvite)
        .filter(BetaTenantInvite.tenant_name == tenant)
        .order_by(BetaTenantInvite.created_at.desc(), BetaTenantInvite.name.asc())
        .all()
    )
    return [invite_to_contract(invite) for invite in invites]


def create_invite(db: Session, payload: dict[str, Optional[str]], actor_email: Optional[str] = None) -> dict[str, Optional[str]]:
    tenant = normalize_tenant_name(payload["tenant_name"])
    seed_tenant_defaults(db, tenant)
    email = normalize_email(payload["email"])
    current = now_iso()
    invite = (
        db.query(BetaTenantInvite)
        .filter(BetaTenantInvite.tenant_name == tenant, BetaTenantInvite.email == email)
        .first()
    )
    if not invite:
        invite = BetaTenantInvite(
            invite_id=payload.get("id") or _invite_id(tenant, email),
            tenant_name=tenant,
            name=payload["name"].strip(),
            email=email,
            role=normalize_role(payload["role"] or "viewer"),
            designation=payload["designation"].strip(),
            team=payload["team"].strip(),
            reports_to=(payload.get("reports_to") or "Customer Admin").strip(),
            responsibility=(payload.get("responsibility") or "Workspace participation").strip(),
            status=normalize_invite_status(payload.get("status")),
            created_at=payload.get("created_at") or current,
            invited_at="Not sent yet" if normalize_invite_status(payload.get("status")) == "Draft" else (payload.get("invited_at") or current),
            accepted_at=payload.get("accepted_at"),
            invite_token=payload.get("invite_token") or secrets.token_urlsafe(16),
            token_expires_at=payload.get("token_expires_at") or _invite_expiry(),
            token_used_at=payload.get("token_used_at"),
            source=(payload.get("source") or "manual").strip(),
        )
        db.add(invite)
    else:
        invite.name = payload["name"].strip()
        invite.role = normalize_role(payload["role"] or invite.role)
        invite.designation = payload["designation"].strip()
        invite.team = payload["team"].strip()
        invite.reports_to = (payload.get("reports_to") or invite.reports_to).strip()
        invite.responsibility = (payload.get("responsibility") or invite.responsibility).strip()
        invite.status = normalize_invite_status(payload.get("status"))
        invite.invited_at = "Not sent yet" if invite.status == "Draft" else (payload.get("invited_at") or invite.invited_at or current)
        invite.source = (payload.get("source") or invite.source).strip()
        invite.token_expires_at = invite.token_expires_at or _invite_expiry()
        invite.invite_token = invite.invite_token or secrets.token_urlsafe(16)
    db.commit()
    db.refresh(invite)
    record_audit_event(
        db,
        tenant_name=tenant,
        actor_email=actor_email,
        subject_email=email,
        scope="tenant",
        category="invite",
        action="sent" if invite.status != "Draft" else "drafted",
        detail=f"Invite for {invite.name} was { 'sent' if invite.status != 'Draft' else 'saved as draft' }.",
    )
    return invite_to_contract(invite)


def bulk_create_invites(db: Session, tenant_name: str, invites: Iterable[dict[str, Optional[str]]], actor_email: Optional[str] = None) -> list[dict[str, Optional[str]]]:
    for payload in invites:
        next_payload = dict(payload)
        next_payload["tenant_name"] = tenant_name
        create_invite(db, next_payload, actor_email=actor_email)
    return list_invites(db, tenant_name)


def set_credential_secret(
    db: Session,
    *,
    scope: TenantScope,
    email: str,
    access_code: str,
    tenant_name: Optional[str] = None,
) -> BetaCredential:
    if not password_meets_policy(access_code):
        raise _password_error()
    tenant = normalize_tenant_name(tenant_name) if tenant_name else None
    record = (
        db.query(BetaCredential)
        .filter(BetaCredential.scope == scope, BetaCredential.tenant_name == tenant, BetaCredential.subject_email == normalize_email(email))
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Credential subject not found")
    current = now_iso()
    record.secret_hash = hash_secret(access_code)
    record.preview_code = None
    record.reset_token_hash = None
    record.reset_expires_at = None
    record.rotation_required = False
    record.updated_at = current
    record.last_rotated_at = current
    db.commit()
    db.refresh(record)
    return record


def accept_invite(
    db: Session,
    *,
    tenant_name: str,
    invite_id: str,
    invite_token: str,
    access_code: str,
) -> dict[str, object]:
    if not password_meets_policy(access_code):
        raise _password_error()
    tenant = normalize_tenant_name(tenant_name)
    seed_tenant_defaults(db, tenant)
    invite = (
        db.query(BetaTenantInvite)
        .filter(BetaTenantInvite.tenant_name == tenant, BetaTenantInvite.invite_id == invite_id)
        .first()
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Tenant invite not found")
    if invite.token_used_at or invite.status == "Accepted":
        raise HTTPException(status_code=409, detail="Invite token already used")
    if invite.invite_token != invite_token:
        raise HTTPException(status_code=401, detail="Invalid invite token")
    if _is_expired(invite.token_expires_at):
        raise HTTPException(status_code=410, detail="Invite token expired")

    accepted_at = now_iso()
    invite.status = "Accepted"
    invite.accepted_at = accepted_at
    invite.token_used_at = accepted_at
    invite.source = "accepted"
    db.commit()
    db.refresh(invite)

    member = upsert_member(
        db,
        {
            "tenant_name": tenant,
            "id": invite.invite_id,
            "name": invite.name,
            "email": invite.email,
            "role": invite.role,
            "designation": invite.designation,
            "team": invite.team,
            "status": "Active",
            "source": "accepted-invite",
            "reports_to": invite.reports_to,
            "responsibility": invite.responsibility,
            "invite_id": invite.invite_id,
            "invited_at": invite.invited_at,
            "accepted_at": accepted_at,
        },
    )
    set_credential_secret(db, scope="tenant", email=invite.email, tenant_name=tenant, access_code=access_code)
    record_audit_event(
        db,
        tenant_name=tenant,
        actor_email=invite.email,
        subject_email=invite.email,
        scope="tenant",
        category="invite",
        action="accepted",
        detail=f"{invite.name} accepted the workspace invite.",
    )
    refreshed_invite = (
        db.query(BetaTenantInvite)
        .filter(BetaTenantInvite.tenant_name == tenant, BetaTenantInvite.invite_id == invite_id)
        .first()
    )
    return {
        "tenant_name": tenant,
        "invite": invite_to_contract(refreshed_invite),
        "member": member,
        "credential_access_code": access_code,
    }


def verify_tenant_member_credential(db: Session, tenant_name: str, email: str, secret: str) -> Optional[BetaCredential]:
    tenant = normalize_tenant_name(tenant_name)
    record = (
        db.query(BetaCredential)
        .filter(
            BetaCredential.scope == "tenant",
            BetaCredential.tenant_name == tenant,
            BetaCredential.subject_email == normalize_email(email),
        )
        .first()
    )
    if not record or not verify_secret(secret, record.secret_hash):
        return None
    return record


def verify_super_admin_credential(db: Session, email: str, secret: str) -> Optional[BetaCredential]:
    record = ensure_super_admin_credential(db)
    if normalize_email(email) != record.subject_email or not verify_secret(secret, record.secret_hash):
        return None
    return record


def issue_tenant_session(db: Session, *, tenant_name: str, email: str, access_code: Optional[str] = None, display_name: Optional[str] = None, role: Optional[str] = None, member_id: Optional[str] = None, member_status: Optional[str] = None, designation: Optional[str] = None, team: Optional[str] = None) -> dict[str, Optional[str]]:
    tenant = normalize_tenant_name(tenant_name)
    seed_tenant_defaults(db, tenant)
    if access_code:
        member = (
            db.query(BetaTenantMember)
            .filter(BetaTenantMember.tenant_name == tenant, BetaTenantMember.email == normalize_email(email))
            .first()
        )
        if not member:
            raise HTTPException(status_code=404, detail="Tenant member not found for that email")
        if not verify_tenant_member_credential(db, tenant, member.email, access_code):
            raise HTTPException(status_code=401, detail="Invalid tenant member credentials")
        session = BetaSession(
            session_id=_session_id("tenant", member.email),
            email=member.email,
            display_name=member.name,
            role=member.role,
            scope="tenant",
            tenant_name=member.tenant_name,
            member_id=member.member_id,
            member_status=member.status,
            designation=member.designation,
            team=member.team,
            source="backend-demo",
            granted_at=now_iso(),
            expires_at=_session_expiry(),
            revoked_at=None,
        )
    else:
        if not display_name or not role:
            raise HTTPException(status_code=400, detail="display_name and role are required when access_code is not provided")
        session = BetaSession(
            session_id=_session_id("tenant", email),
            email=normalize_email(email),
            display_name=display_name.strip(),
            role=normalize_role(role),
            scope="tenant",
            tenant_name=tenant,
            member_id=member_id,
            member_status=member_status,
            designation=designation,
            team=team,
            source="backend-demo",
            granted_at=now_iso(),
            expires_at=_session_expiry(),
            revoked_at=None,
        )
    db.add(session)
    db.commit()
    db.refresh(session)
    record_audit_event(
        db,
        tenant_name=session.tenant_name,
        actor_email=session.email,
        subject_email=session.email,
        scope="tenant",
        category="session",
        action="issued",
        detail=f"Tenant session issued for {session.display_name}.",
    )
    return session_to_contract(session)


def issue_super_admin_session(db: Session, *, email: str, access_code: Optional[str] = None, display_name: Optional[str] = None) -> dict[str, Optional[str]]:
    ensure_super_admin_credential(db)
    if access_code:
        if not verify_super_admin_credential(db, email, access_code):
            raise HTTPException(status_code=401, detail="Invalid Super Admin credentials")
    elif not display_name:
        raise HTTPException(status_code=400, detail="display_name is required when access_code is not provided")
    session = BetaSession(
        session_id=_session_id("platform", email),
        email=normalize_email(email),
        display_name=(display_name or "NAMA Super Admin").strip(),
        role="super-admin",
        scope="platform",
        tenant_name=None,
        member_id=None,
        member_status=None,
        designation=None,
        team=None,
        source="backend-demo",
        granted_at=now_iso(),
        expires_at=_session_expiry(),
        revoked_at=None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    record_audit_event(
        db,
        tenant_name=None,
        actor_email=session.email,
        subject_email=session.email,
        scope="platform",
        category="session",
        action="issued",
        detail="Super Admin session issued.",
    )
    return session_to_contract(session)


def list_sessions(db: Session, *, scope: TenantScope, tenant_name: Optional[str] = None) -> list[dict[str, Optional[str]]]:
    query = db.query(BetaSession).filter(BetaSession.scope == scope, BetaSession.revoked_at.is_(None))
    if scope == "tenant":
        query = query.filter(BetaSession.tenant_name == normalize_tenant_name(tenant_name))
    sessions = query.order_by(BetaSession.granted_at.desc()).all()
    return [session_to_contract(session) for session in sessions if not _is_expired(session.expires_at)]


def authorize_session(
    db: Session,
    *,
    session_id: str,
    tenant_name: Optional[str] = None,
    allowed_roles: Optional[Iterable[str]] = None,
) -> dict[str, Optional[str]]:
    session = (
        db.query(BetaSession)
        .filter(BetaSession.session_id == session_id, BetaSession.revoked_at.is_(None))
        .first()
    )
    if not session or _is_expired(session.expires_at):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if tenant_name and session.scope == "tenant" and session.tenant_name != normalize_tenant_name(tenant_name):
        raise HTTPException(status_code=403, detail="Session does not match tenant context")
    if allowed_roles and session.role not in set(allowed_roles):
        raise HTTPException(status_code=403, detail="Session does not have permission for this action")
    return session_to_contract(session)


def require_authenticated_session(
    db: Session,
    request: Request,
    *,
    tenant_name: Optional[str],
    allowed_roles: Iterable[str],
) -> dict[str, Optional[str]]:
    session_id = request.headers.get("x-nama-session-id", "").strip()
    if not session_id:
        raise HTTPException(status_code=401, detail="Session header required")
    return authorize_session(db, session_id=session_id, tenant_name=tenant_name, allowed_roles=allowed_roles)


def revoke_session(db: Session, *, session_id: str, actor_email: Optional[str]) -> dict[str, bool]:
    session = (
        db.query(BetaSession)
        .filter(BetaSession.session_id == session_id, BetaSession.revoked_at.is_(None))
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.revoked_at = now_iso()
    db.commit()
    record_audit_event(
        db,
        tenant_name=session.tenant_name,
        actor_email=actor_email,
        subject_email=session.email,
        scope="platform" if session.scope == "platform" else "tenant",
        category="session",
        action="revoked",
        detail=f"Session for {session.display_name} was revoked.",
    )
    return {"ok": True}


def issue_reset_token(db: Session, *, scope: TenantScope, email: str, tenant_name: Optional[str] = None) -> dict[str, Optional[str]]:
    if scope == "platform":
        record = ensure_super_admin_credential(db)
        if record.subject_email != normalize_email(email):
            raise HTTPException(status_code=404, detail="Super admin credential subject not found")
    else:
        tenant = normalize_tenant_name(tenant_name)
        seed_tenant_defaults(db, tenant)
        record = (
            db.query(BetaCredential)
            .filter(BetaCredential.scope == "tenant", BetaCredential.tenant_name == tenant, BetaCredential.subject_email == normalize_email(email))
            .first()
        )
        if not record:
            raise HTTPException(status_code=404, detail="Tenant credential subject not found")

    raw_token = secrets.token_urlsafe(18)
    record.reset_token_hash = hash_token(raw_token)
    record.reset_expires_at = _reset_expiry()
    record.updated_at = now_iso()
    db.commit()
    db.refresh(record)
    record_audit_event(
        db,
        tenant_name=tenant_name,
        actor_email=normalize_email(email),
        subject_email=normalize_email(email),
        scope=scope,
        category="credential",
        action="reset_requested",
        detail=f"Credential reset requested for {normalize_email(email)}.",
    )
    return {
        "email": normalize_email(email),
        "scope": scope,
        "tenant_name": normalize_tenant_name(tenant_name) if tenant_name else None,
        "reset_token": raw_token,
        "reset_expires_at": record.reset_expires_at,
    }


def confirm_reset_token(db: Session, *, scope: TenantScope, email: str, access_code: str, reset_token: str, tenant_name: Optional[str] = None) -> dict[str, object]:
    if scope == "platform":
        record = ensure_super_admin_credential(db)
        if record.subject_email != normalize_email(email):
            raise HTTPException(status_code=404, detail="Super admin credential subject not found")
    else:
        tenant = normalize_tenant_name(tenant_name)
        record = (
            db.query(BetaCredential)
            .filter(BetaCredential.scope == "tenant", BetaCredential.tenant_name == tenant, BetaCredential.subject_email == normalize_email(email))
            .first()
        )
        if not record:
            raise HTTPException(status_code=404, detail="Tenant credential subject not found")

    if record.reset_token_hash != hash_token(reset_token) or _is_expired(record.reset_expires_at):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Super Admin reset token" if scope == "platform" else "Invalid or expired tenant reset token",
        )
    set_credential_secret(db, scope=scope, email=email, access_code=access_code, tenant_name=tenant_name)
    record_audit_event(
        db,
        tenant_name=tenant_name,
        actor_email=normalize_email(email),
        subject_email=normalize_email(email),
        scope=scope,
        category="credential",
        action="rotated",
        detail=f"Credential rotated for {normalize_email(email)}.",
    )
    return {
        "ok": True,
        "email": normalize_email(email),
        "scope": scope,
        "tenant_name": normalize_tenant_name(tenant_name) if tenant_name else None,
    }


def list_audit_events(db: Session, *, tenant_name: Optional[str], scope: TenantScope) -> list[dict[str, Optional[str]]]:
    query = db.query(BetaAuthAuditEvent).filter(BetaAuthAuditEvent.scope == scope)
    if tenant_name:
        query = query.filter(BetaAuthAuditEvent.tenant_name == normalize_tenant_name(tenant_name))
    events = query.order_by(BetaAuthAuditEvent.created_at.desc()).limit(100).all()
    return [audit_to_contract(event) for event in events]
