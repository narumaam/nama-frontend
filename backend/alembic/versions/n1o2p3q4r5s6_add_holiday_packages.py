"""add_holiday_packages

Creates the holiday_packages table for pre-packaged group tour products.

Revision ID: n1o2p3q4r5s6
Revises: m0n1o2p3q4r5
Create Date: 2026-04-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision = 'n1o2p3q4r5s6'
down_revision = 'm0n1o2p3q4r5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "holiday_packages",
        sa.Column("id",                    sa.Integer(),     primary_key=True, autoincrement=True),
        sa.Column("tenant_id",             sa.Integer(),     sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),

        # Basic fields
        sa.Column("name",                  sa.String(255),   nullable=False),
        sa.Column("destination",           sa.String(255),   nullable=False),
        sa.Column("duration_days",         sa.Integer(),     nullable=False, server_default="1"),
        sa.Column("price_per_person",      sa.Float(),       nullable=False, server_default="0"),
        sa.Column("max_pax",               sa.Integer(),     nullable=True),

        # JSONB content columns
        sa.Column("inclusions",            JSONB(),          nullable=False, server_default="'[]'::jsonb"),
        sa.Column("exclusions",            JSONB(),          nullable=False, server_default="'[]'::jsonb"),
        sa.Column("images",                JSONB(),          nullable=False, server_default="'[]'::jsonb"),
        sa.Column("tags",                  JSONB(),          nullable=False, server_default="'[]'::jsonb"),

        # FK to itineraries — nullable so packages can exist independently
        sa.Column("itinerary_template_id", sa.Integer(),     sa.ForeignKey("itineraries.id", ondelete="SET NULL"), nullable=True),

        # State flags
        sa.Column("is_active",             sa.Boolean(),     nullable=False, server_default="true"),
        sa.Column("is_featured",           sa.Boolean(),     nullable=False, server_default="false"),

        # Timestamps
        sa.Column("created_at",            sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",            sa.DateTime(timezone=True), nullable=True),
    )

    # Indexes for common query patterns
    op.create_index(
        "ix_holiday_packages_tenant_id",
        "holiday_packages",
        ["tenant_id"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_holiday_packages_tenant_active",
        "holiday_packages",
        ["tenant_id", "is_active"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_holiday_packages_featured",
        "holiday_packages",
        ["is_active", "is_featured"],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("ix_holiday_packages_featured",      table_name="holiday_packages")
    op.drop_index("ix_holiday_packages_tenant_active", table_name="holiday_packages")
    op.drop_index("ix_holiday_packages_tenant_id",     table_name="holiday_packages")
    op.drop_table("holiday_packages")
