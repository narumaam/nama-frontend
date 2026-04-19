"""add webhook_endpoints table

Revision ID: g4h5i6j7k8l9
Revises: f3a4b5c6d7e8
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = 'g4h5i6j7k8l9'
down_revision = 'f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'webhook_endpoints' not in inspector.get_table_names():
        op.create_table(
            'webhook_endpoints',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
            sa.Column('url', sa.String(512), nullable=False),
            sa.Column('events', sa.JSON(), nullable=True),
            sa.Column('secret', sa.String(64), nullable=False),
            sa.Column('description', sa.String(256), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('delivery_count', sa.Integer(), server_default='0'),
            sa.Column('failure_count', sa.Integer(), server_default='0'),
        )
        op.create_index('ix_webhook_endpoints_tenant_id', 'webhook_endpoints', ['tenant_id'])


def downgrade():
    op.drop_table('webhook_endpoints')
