from sqlalchemy import Boolean, Column, Integer, String, Text, UniqueConstraint

from app.db.session import Base


class BetaTenantMember(Base):
    __tablename__ = "beta_tenant_members"
    __table_args__ = (UniqueConstraint("tenant_name", "email", name="uq_beta_tenant_member_email"),)

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(String, unique=True, index=True, nullable=False)
    tenant_name = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    team = Column(String, nullable=False)
    status = Column(String, nullable=False)
    source = Column(String, nullable=False)
    reports_to = Column(String, nullable=False)
    responsibility = Column(Text, nullable=False)
    invite_id = Column(String, nullable=True)
    invited_at = Column(String, nullable=True)
    accepted_at = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)


class BetaTenantInvite(Base):
    __tablename__ = "beta_tenant_invites"
    __table_args__ = (UniqueConstraint("tenant_name", "email", name="uq_beta_tenant_invite_email"),)

    id = Column(Integer, primary_key=True, index=True)
    invite_id = Column(String, unique=True, index=True, nullable=False)
    tenant_name = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    team = Column(String, nullable=False)
    reports_to = Column(String, nullable=False)
    responsibility = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    invited_at = Column(String, nullable=False)
    accepted_at = Column(String, nullable=True)
    invite_token = Column(String, nullable=True)
    token_expires_at = Column(String, nullable=True)
    token_used_at = Column(String, nullable=True)
    source = Column(String, nullable=False)


class BetaCredential(Base):
    __tablename__ = "beta_credentials"
    __table_args__ = (UniqueConstraint("scope", "tenant_name", "subject_email", name="uq_beta_credential_subject"),)

    id = Column(Integer, primary_key=True, index=True)
    scope = Column(String, index=True, nullable=False)
    tenant_name = Column(String, index=True, nullable=True)
    subject_email = Column(String, nullable=False)
    subject_role = Column(String, nullable=True)
    secret_hash = Column(Text, nullable=False)
    preview_code = Column(String, nullable=True)
    reset_token_hash = Column(Text, nullable=True)
    reset_expires_at = Column(String, nullable=True)
    rotation_required = Column(Boolean, default=False, nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    last_rotated_at = Column(String, nullable=True)


class BetaSession(Base):
    __tablename__ = "beta_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    scope = Column(String, nullable=False)
    tenant_name = Column(String, index=True, nullable=True)
    member_id = Column(String, nullable=True)
    member_status = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    team = Column(String, nullable=True)
    source = Column(String, nullable=False)
    granted_at = Column(String, nullable=False)
    expires_at = Column(String, nullable=False)
    revoked_at = Column(String, nullable=True)


class BetaAuthAuditEvent(Base):
    __tablename__ = "beta_auth_audit_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, unique=True, index=True, nullable=False)
    tenant_name = Column(String, index=True, nullable=True)
    actor_email = Column(String, nullable=True)
    subject_email = Column(String, nullable=True)
    scope = Column(String, nullable=False)
    category = Column(String, nullable=False)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)
