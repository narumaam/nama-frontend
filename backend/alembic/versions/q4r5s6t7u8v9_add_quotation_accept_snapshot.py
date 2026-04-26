"""add quotation accept snapshot fields — Tier 8C

Revision ID: q4r5s6t7u8v9
Revises: p3q4r5s6t7u8
Create Date: 2026-04-26

Tier 8C snapshots the quotation total at customer-accept time so subsequent
edits to base_price / margin_pct don't retroactively change "what the customer
agreed to pay". Three nullable columns added; backfill is unnecessary because
historical rows are pre-feature.
"""

from alembic import op
import sqlalchemy as sa


revision = 'q4r5s6t7u8v9'
down_revision = 'p3q4r5s6t7u8'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = {c['name'] for c in inspector.get_columns('quotations')}

    if 'accepted_at' not in existing_cols:
        op.add_column('quotations', sa.Column('accepted_at', sa.DateTime(), nullable=True))
    if 'accepted_total' not in existing_cols:
        op.add_column('quotations', sa.Column('accepted_total', sa.Numeric(12, 2), nullable=True))
    if 'accepted_currency' not in existing_cols:
        op.add_column('quotations', sa.Column('accepted_currency', sa.String(3), nullable=True))


def downgrade():
    op.drop_column('quotations', 'accepted_currency')
    op.drop_column('quotations', 'accepted_total')
    op.drop_column('quotations', 'accepted_at')
