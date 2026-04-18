"""add sso fields to users

Revision ID: c3d4e5f6a7b8
Revises: f5d48c026bb1
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'f5d48c026bb1'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('users', sa.Column('workos_user_id',    sa.String(), nullable=True))
    op.add_column('users', sa.Column('sso_connection_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('last_login_at',     sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('is_sso_user',       sa.Boolean(), nullable=True, server_default='false'))
    op.create_index('ix_users_workos_user_id', 'users', ['workos_user_id'], unique=True)

def downgrade() -> None:
    op.drop_index('ix_users_workos_user_id', table_name='users')
    op.drop_column('users', 'is_sso_user')
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'sso_connection_id')
    op.drop_column('users', 'workos_user_id')
