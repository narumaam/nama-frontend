"""add_tenant_email_config

Revision ID: j7k8l9m0n1o2
Revises: i6j7k8l9m0n1
Create Date: 2026-04-19 00:00:00.000000

Creates the tenant_email_configs table for per-tenant SMTP + IMAP credentials.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'j7k8l9m0n1o2'
down_revision = 'i6j7k8l9m0n1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenant_email_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),

        # SMTP
        sa.Column("smtp_host", sa.String(255), nullable=True),
        sa.Column("smtp_port", sa.Integer(), nullable=False, server_default="587"),
        sa.Column("smtp_username", sa.String(255), nullable=True),
        sa.Column("smtp_password_encrypted", sa.Text(), nullable=True),
        sa.Column("smtp_from_name", sa.String(200), nullable=True),
        sa.Column("smtp_from_email", sa.String(255), nullable=True),
        sa.Column("smtp_use_tls", sa.Boolean(), nullable=False, server_default="true"),

        # IMAP
        sa.Column("imap_host", sa.String(255), nullable=True),
        sa.Column("imap_port", sa.Integer(), nullable=False, server_default="993"),
        sa.Column("imap_username", sa.String(255), nullable=True),
        sa.Column("imap_password_encrypted", sa.Text(), nullable=True),
        sa.Column("imap_use_ssl", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("imap_folder", sa.String(100), nullable=False, server_default="INBOX"),

        # State
        sa.Column("smtp_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("imap_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_imap_poll", sa.DateTime(), nullable=True),

        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),

        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", name="uq_tenant_email_config_tenant_id"),
        checkfirst=True,
    )

    # Index on tenant_id for fast per-tenant lookups
    op.create_index(
        "ix_tenant_email_configs_tenant_id",
        "tenant_email_configs",
        ["tenant_id"],
        unique=True,
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("ix_tenant_email_configs_tenant_id", table_name="tenant_email_configs")
    op.drop_table("tenant_email_configs")
