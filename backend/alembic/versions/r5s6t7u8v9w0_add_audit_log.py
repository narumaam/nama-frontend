"""add audit_log table — Tier 9B

Revision ID: r5s6t7u8v9w0
Revises: q4r5s6t7u8v9
Create Date: 2026-04-26
"""

from alembic import op
import sqlalchemy as sa


revision = 'r5s6t7u8v9w0'
down_revision = 'q4r5s6t7u8v9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'audit_log' not in inspector.get_table_names():
        op.create_table(
            'audit_log',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=True),
            sa.Column('actor_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('actor_email', sa.String(256), nullable=True),
            sa.Column('actor_role', sa.String(64), nullable=True),
            sa.Column('actor_ip', sa.String(64), nullable=True),
            sa.Column('action', sa.String(64), nullable=False),
            sa.Column('target_type', sa.String(64), nullable=True),
            sa.Column('target_id', sa.String(128), nullable=True),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column('outcome', sa.String(32), nullable=False, server_default='success'),
            sa.Column('error_message', sa.String(512), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index('ix_audit_log_tenant_id', 'audit_log', ['tenant_id'])
        op.create_index('ix_audit_log_actor_user_id', 'audit_log', ['actor_user_id'])
        op.create_index('ix_audit_log_action', 'audit_log', ['action'])
        op.create_index('ix_audit_log_created_at', 'audit_log', ['created_at'])
        op.create_index('ix_audit_log_tenant_created', 'audit_log', ['tenant_id', 'created_at'])
        op.create_index('ix_audit_log_action_created', 'audit_log', ['action', 'created_at'])


def downgrade():
    op.drop_index('ix_audit_log_action_created', table_name='audit_log')
    op.drop_index('ix_audit_log_tenant_created', table_name='audit_log')
    op.drop_index('ix_audit_log_created_at', table_name='audit_log')
    op.drop_index('ix_audit_log_action', table_name='audit_log')
    op.drop_index('ix_audit_log_actor_user_id', table_name='audit_log')
    op.drop_index('ix_audit_log_tenant_id', table_name='audit_log')
    op.drop_table('audit_log')
