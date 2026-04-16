"""add quotations table

Revision ID: a1b2c3d4e5f6
Revises: f5d48c026bb1
Create Date: 2026-04-16 00:00:00.000000

M3 — Quotations table for travel proposals/pricing.
Chain: f5d48c026bb0 → f5d48c026bb1 → a1b2c3d4e5f6 → b2c3d4e5f6a7
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f5d48c026bb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'quotations' in set(inspector.get_table_names()):
        return  # Already exists — idempotent

    op.create_table(
        'quotations',
        sa.Column('id',           sa.Integer(),     nullable=False),
        sa.Column('tenant_id',    sa.Integer(),     nullable=False),
        sa.Column('lead_id',      sa.Integer(),     nullable=True),
        sa.Column('itinerary_id', sa.Integer(),     nullable=True),
        sa.Column('lead_name',    sa.String(200),   nullable=False),
        sa.Column('destination',  sa.String(200),   nullable=False),
        sa.Column('base_price',   sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('margin_pct',   sa.Numeric(5, 2),  nullable=False, server_default='15'),
        sa.Column('total_price',  sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('currency',     sa.String(3),      nullable=False, server_default='INR'),
        sa.Column('status',       sa.String(20),     nullable=False, server_default='DRAFT'),
        sa.Column('notes',        sa.Text(),         nullable=True),
        sa.Column('valid_until',  sa.DateTime(),     nullable=True),
        sa.Column('sent_at',      sa.DateTime(),     nullable=True),
        sa.Column('is_deleted',   sa.Boolean(),      nullable=False, server_default='false'),
        sa.Column('created_at',   sa.DateTime(),     nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at',   sa.DateTime(),     nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['tenant_id'],    ['tenants.id'],     ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lead_id'],      ['leads.id'],       ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['itinerary_id'], ['itineraries.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quotations_tenant_id', 'quotations', ['tenant_id'])
    op.create_index('ix_quotations_status',    'quotations', ['status'])
    op.create_index('ix_quotations_created_at','quotations', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_quotations_created_at', table_name='quotations')
    op.drop_index('ix_quotations_status',     table_name='quotations')
    op.drop_index('ix_quotations_tenant_id',  table_name='quotations')
    op.drop_table('quotations')
