"""content shared library — is_shared, is_master, source_tenant_id

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-04-19 00:00:00.000000

Adds shared/master-library columns to destinations and content_blocks:
  - is_shared        BOOLEAN NOT NULL DEFAULT FALSE
  - is_master        BOOLEAN NOT NULL DEFAULT FALSE
  - source_tenant_id INTEGER NULLABLE  (NULL = NAMA platform itself)

All columns are nullable-safe or have server defaults so existing rows are
unaffected.  Railway runs `alembic upgrade head` on every deploy — the
idempotent inspector.get_columns() guard makes re-running safe.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f3a4b5c6d7e8'
down_revision: Union[str, Sequence[str], None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # ── destinations ───────────────────────────────────────────────────────────
    existing_dest_cols = {c["name"] for c in inspector.get_columns("destinations")}

    if "is_shared" not in existing_dest_cols:
        op.add_column(
            "destinations",
            sa.Column(
                "is_shared",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if "is_master" not in existing_dest_cols:
        op.add_column(
            "destinations",
            sa.Column(
                "is_master",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if "source_tenant_id" not in existing_dest_cols:
        op.add_column(
            "destinations",
            sa.Column("source_tenant_id", sa.Integer(), nullable=True),
        )

    # ── content_blocks ─────────────────────────────────────────────────────────
    existing_block_cols = {c["name"] for c in inspector.get_columns("content_blocks")}

    if "is_shared" not in existing_block_cols:
        op.add_column(
            "content_blocks",
            sa.Column(
                "is_shared",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if "is_master" not in existing_block_cols:
        op.add_column(
            "content_blocks",
            sa.Column(
                "is_master",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if "source_tenant_id" not in existing_block_cols:
        op.add_column(
            "content_blocks",
            sa.Column("source_tenant_id", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    # content_blocks first, then destinations (reverse of upgrade)
    op.drop_column("content_blocks", "source_tenant_id")
    op.drop_column("content_blocks", "is_master")
    op.drop_column("content_blocks", "is_shared")

    op.drop_column("destinations", "source_tenant_id")
    op.drop_column("destinations", "is_master")
    op.drop_column("destinations", "is_shared")
