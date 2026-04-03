"""add beta auth tables"""

from alembic import op
import sqlalchemy as sa


revision = "20260404_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "beta_tenant_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("member_id", sa.String(), nullable=False),
        sa.Column("tenant_name", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("designation", sa.String(), nullable=False),
        sa.Column("team", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("reports_to", sa.String(), nullable=False),
        sa.Column("responsibility", sa.Text(), nullable=False),
        sa.Column("invite_id", sa.String(), nullable=True),
        sa.Column("invited_at", sa.String(), nullable=True),
        sa.Column("accepted_at", sa.String(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("member_id"),
        sa.UniqueConstraint("tenant_name", "email", name="uq_beta_tenant_member_email"),
    )
    op.create_index(op.f("ix_beta_tenant_members_id"), "beta_tenant_members", ["id"], unique=False)
    op.create_index(op.f("ix_beta_tenant_members_member_id"), "beta_tenant_members", ["member_id"], unique=True)
    op.create_index(op.f("ix_beta_tenant_members_tenant_name"), "beta_tenant_members", ["tenant_name"], unique=False)

    op.create_table(
        "beta_tenant_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invite_id", sa.String(), nullable=False),
        sa.Column("tenant_name", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("designation", sa.String(), nullable=False),
        sa.Column("team", sa.String(), nullable=False),
        sa.Column("reports_to", sa.String(), nullable=False),
        sa.Column("responsibility", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("invited_at", sa.String(), nullable=False),
        sa.Column("accepted_at", sa.String(), nullable=True),
        sa.Column("invite_token", sa.String(), nullable=True),
        sa.Column("token_expires_at", sa.String(), nullable=True),
        sa.Column("token_used_at", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invite_id"),
        sa.UniqueConstraint("tenant_name", "email", name="uq_beta_tenant_invite_email"),
    )
    op.create_index(op.f("ix_beta_tenant_invites_id"), "beta_tenant_invites", ["id"], unique=False)
    op.create_index(op.f("ix_beta_tenant_invites_invite_id"), "beta_tenant_invites", ["invite_id"], unique=True)
    op.create_index(op.f("ix_beta_tenant_invites_tenant_name"), "beta_tenant_invites", ["tenant_name"], unique=False)

    op.create_table(
        "beta_credentials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(), nullable=False),
        sa.Column("tenant_name", sa.String(), nullable=True),
        sa.Column("subject_email", sa.String(), nullable=False),
        sa.Column("subject_role", sa.String(), nullable=True),
        sa.Column("secret_hash", sa.Text(), nullable=False),
        sa.Column("preview_code", sa.String(), nullable=True),
        sa.Column("reset_token_hash", sa.Text(), nullable=True),
        sa.Column("reset_expires_at", sa.String(), nullable=True),
        sa.Column("rotation_required", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.Column("last_rotated_at", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scope", "tenant_name", "subject_email", name="uq_beta_credential_subject"),
    )
    op.create_index(op.f("ix_beta_credentials_id"), "beta_credentials", ["id"], unique=False)
    op.create_index(op.f("ix_beta_credentials_scope"), "beta_credentials", ["scope"], unique=False)
    op.create_index(op.f("ix_beta_credentials_tenant_name"), "beta_credentials", ["tenant_name"], unique=False)

    op.create_table(
        "beta_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("scope", sa.String(), nullable=False),
        sa.Column("tenant_name", sa.String(), nullable=True),
        sa.Column("member_id", sa.String(), nullable=True),
        sa.Column("member_status", sa.String(), nullable=True),
        sa.Column("designation", sa.String(), nullable=True),
        sa.Column("team", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("granted_at", sa.String(), nullable=False),
        sa.Column("expires_at", sa.String(), nullable=False),
        sa.Column("revoked_at", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id"),
    )
    op.create_index(op.f("ix_beta_sessions_email"), "beta_sessions", ["email"], unique=False)
    op.create_index(op.f("ix_beta_sessions_id"), "beta_sessions", ["id"], unique=False)
    op.create_index(op.f("ix_beta_sessions_session_id"), "beta_sessions", ["session_id"], unique=True)
    op.create_index(op.f("ix_beta_sessions_tenant_name"), "beta_sessions", ["tenant_name"], unique=False)

    op.create_table(
        "beta_auth_audit_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("tenant_name", sa.String(), nullable=True),
        sa.Column("actor_email", sa.String(), nullable=True),
        sa.Column("subject_email", sa.String(), nullable=True),
        sa.Column("scope", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index(op.f("ix_beta_auth_audit_events_event_id"), "beta_auth_audit_events", ["event_id"], unique=True)
    op.create_index(op.f("ix_beta_auth_audit_events_id"), "beta_auth_audit_events", ["id"], unique=False)
    op.create_index(op.f("ix_beta_auth_audit_events_tenant_name"), "beta_auth_audit_events", ["tenant_name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_beta_auth_audit_events_tenant_name"), table_name="beta_auth_audit_events")
    op.drop_index(op.f("ix_beta_auth_audit_events_id"), table_name="beta_auth_audit_events")
    op.drop_index(op.f("ix_beta_auth_audit_events_event_id"), table_name="beta_auth_audit_events")
    op.drop_table("beta_auth_audit_events")

    op.drop_index(op.f("ix_beta_sessions_tenant_name"), table_name="beta_sessions")
    op.drop_index(op.f("ix_beta_sessions_session_id"), table_name="beta_sessions")
    op.drop_index(op.f("ix_beta_sessions_id"), table_name="beta_sessions")
    op.drop_index(op.f("ix_beta_sessions_email"), table_name="beta_sessions")
    op.drop_table("beta_sessions")

    op.drop_index(op.f("ix_beta_credentials_tenant_name"), table_name="beta_credentials")
    op.drop_index(op.f("ix_beta_credentials_scope"), table_name="beta_credentials")
    op.drop_index(op.f("ix_beta_credentials_id"), table_name="beta_credentials")
    op.drop_table("beta_credentials")

    op.drop_index(op.f("ix_beta_tenant_invites_tenant_name"), table_name="beta_tenant_invites")
    op.drop_index(op.f("ix_beta_tenant_invites_invite_id"), table_name="beta_tenant_invites")
    op.drop_index(op.f("ix_beta_tenant_invites_id"), table_name="beta_tenant_invites")
    op.drop_table("beta_tenant_invites")

    op.drop_index(op.f("ix_beta_tenant_members_tenant_name"), table_name="beta_tenant_members")
    op.drop_index(op.f("ix_beta_tenant_members_member_id"), table_name="beta_tenant_members")
    op.drop_index(op.f("ix_beta_tenant_members_id"), table_name="beta_tenant_members")
    op.drop_table("beta_tenant_members")
