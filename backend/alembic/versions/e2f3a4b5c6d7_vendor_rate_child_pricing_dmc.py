"""vendor_rate child pricing + DMC marketplace fields

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-04-19 00:00:00.000000

Adds new columns to vendor_rates and vendors for:
  - Child pricing:    markup_amount, cost_net_child, child_age_min, child_age_max
  - DMC marketplace:  is_public, visibility_type (on vendor_rates)
  - DMC flag:         is_dmc (on vendors)

All new columns are nullable / have server defaults so existing rows are
unaffected.  Railway runs `alembic upgrade head` on every deploy.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # ── vendor_rates ───────────────────────────────────────────────────────────
    existing_rate_cols = {c["name"] for c in inspector.get_columns("vendor_rates")}

    if "markup_amount" not in existing_rate_cols:
        op.add_column(
            "vendor_rates",
            sa.Column("markup_amount", sa.Float(), nullable=True),
        )

    if "cost_net_child" not in existing_rate_cols:
        op.add_column(
            "vendor_rates",
            sa.Column("cost_net_child", sa.Float(), nullable=True),
        )

    if "child_age_min" not in existing_rate_cols:
        op.add_column(
            "vendor_rates",
            sa.Column("child_age_min", sa.Integer(), nullable=True),
        )

    if "child_age_max" not in existing_rate_cols:
        op.add_column(
            "vendor_rates",
            sa.Column("child_age_max", sa.Integer(), nullable=True),
        )

    if "is_public" not in existing_rate_cols:
        op.add_column(
            "vendor_rates",
            sa.Column(
                "is_public",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if "visibility_type" not in existing_rate_cols:
        # Create the enum type first (idempotent via checkfirst)
        rate_visibility = sa.Enum(
            "PRIVATE", "PUBLIC", "INVITE_ONLY",
            name="ratevisibility",
        )
        rate_visibility.create(conn, checkfirst=True)

        op.add_column(
            "vendor_rates",
            sa.Column(
                "visibility_type",
                sa.Enum("PRIVATE", "PUBLIC", "INVITE_ONLY", name="ratevisibility"),
                nullable=False,
                server_default="PRIVATE",
            ),
        )

    # ── vendors ────────────────────────────────────────────────────────────────
    existing_vendor_cols = {c["name"] for c in inspector.get_columns("vendors")}

    if "is_dmc" not in existing_vendor_cols:
        op.add_column(
            "vendors",
            sa.Column(
                "is_dmc",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    # Drop in reverse order — vendor_rates first, then vendors
    op.drop_column("vendor_rates", "visibility_type")
    op.drop_column("vendor_rates", "is_public")
    op.drop_column("vendor_rates", "child_age_max")
    op.drop_column("vendor_rates", "child_age_min")
    op.drop_column("vendor_rates", "cost_net_child")
    op.drop_column("vendor_rates", "markup_amount")
    op.drop_column("vendors", "is_dmc")

    # Drop the enum type (PostgreSQL-specific)
    conn = op.get_bind()
    conn.execute(sa.text("DROP TYPE IF EXISTS ratevisibility"))
