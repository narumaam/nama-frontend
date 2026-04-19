"""add clients table
Revision ID: h5i6j7k8l9m0
Revises: g4h5i6j7k8l9
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = 'h5i6j7k8l9m0'
down_revision = 'g4h5i6j7k8l9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'clients' not in inspector.get_table_names():
        op.create_table(
            'clients',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('full_name', sa.String(256), nullable=False),
            sa.Column('email', sa.String(256), nullable=True),
            sa.Column('phone', sa.String(64), nullable=True),
            sa.Column('secondary_phone', sa.String(64), nullable=True),
            sa.Column('city', sa.String(128), nullable=True),
            sa.Column('country', sa.String(128), nullable=True, server_default='India'),
            sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE'),
            sa.Column('travel_type', sa.String(64), nullable=True),
            sa.Column('preferred_destinations', sa.JSON(), nullable=True),
            sa.Column('tags', sa.JSON(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('total_bookings', sa.Integer(), server_default='0'),
            sa.Column('total_spend', sa.Float(), server_default='0'),
            sa.Column('currency', sa.String(10), server_default='INR'),
            sa.Column('last_booking_date', sa.DateTime(timezone=True), nullable=True),
            sa.Column('import_source', sa.String(64), nullable=True),
            sa.Column('external_id', sa.String(256), nullable=True),
            sa.Column('assigned_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('last_contact', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('ix_clients_tenant_id', 'clients', ['tenant_id'])
        op.create_index('ix_clients_tenant_status', 'clients', ['tenant_id', 'status'])
        op.create_index('ix_clients_email', 'clients', ['email'])


def downgrade():
    op.drop_table('clients')
