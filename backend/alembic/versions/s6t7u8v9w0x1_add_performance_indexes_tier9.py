"""add performance indexes — Tier 9C

Revision ID: s6t7u8v9w0x1
Revises: r5s6t7u8v9w0
Create Date: 2026-04-26

Adds indexes to support hot read paths:
- (tenant_id, phone) on leads — for lead deduplication on POST /leads/
- (tenant_id, email) on leads — same
- (tenant_id, status, created_at desc) on leads — kanban pipeline view
- (booking_id) + (tenant_id, created_at desc) on ledger_entries — finance views

All idempotent via checkfirst.
"""

from alembic import op
import sqlalchemy as sa


revision = 's6t7u8v9w0x1'
down_revision = 'r5s6t7u8v9w0'
branch_labels = None
depends_on = None


def _index_exists(bind, table: str, name: str) -> bool:
    inspector = sa.inspect(bind)
    if table not in inspector.get_table_names():
        return False
    return any(ix["name"] == name for ix in inspector.get_indexes(table))


def upgrade():
    bind = op.get_bind()

    # Lead dedup: phone + email scoped by tenant
    if not _index_exists(bind, "leads", "ix_leads_tenant_phone"):
        op.create_index("ix_leads_tenant_phone", "leads", ["tenant_id", "phone"])
    if not _index_exists(bind, "leads", "ix_leads_tenant_email"):
        op.create_index("ix_leads_tenant_email", "leads", ["tenant_id", "email"])

    # Pipeline kanban: leads grouped by status, newest first
    if not _index_exists(bind, "leads", "ix_leads_tenant_status_created"):
        op.create_index(
            "ix_leads_tenant_status_created",
            "leads",
            ["tenant_id", "status", sa.text("created_at DESC")],
        )

    # Finance: ledger by booking
    if not _index_exists(bind, "ledger_entries", "ix_ledger_booking_id"):
        try:
            op.create_index("ix_ledger_booking_id", "ledger_entries", ["booking_id"])
        except Exception:
            pass  # column may not exist on older deployments

    # Finance: ledger newest-first per tenant
    if not _index_exists(bind, "ledger_entries", "ix_ledger_tenant_created"):
        try:
            op.create_index(
                "ix_ledger_tenant_created",
                "ledger_entries",
                ["tenant_id", sa.text("created_at DESC")],
            )
        except Exception:
            pass


def downgrade():
    for table, name in [
        ("ledger_entries", "ix_ledger_tenant_created"),
        ("ledger_entries", "ix_ledger_booking_id"),
        ("leads", "ix_leads_tenant_status_created"),
        ("leads", "ix_leads_tenant_email"),
        ("leads", "ix_leads_tenant_phone"),
    ]:
        try:
            op.drop_index(name, table_name=table)
        except Exception:
            pass
