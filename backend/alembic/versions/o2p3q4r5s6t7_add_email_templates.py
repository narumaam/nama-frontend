"""add email_templates table

Revision ID: o2p3q4r5s6t7
Revises: n1o2p3q4r5s6
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'o2p3q4r5s6t7'
down_revision = 'n1o2p3q4r5s6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'email_templates',
        sa.Column('id',         sa.Integer(),     primary_key=True),
        sa.Column('tenant_id',  sa.Integer(),     sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name',       sa.String(200),   nullable=False),
        sa.Column('category',   sa.String(50),    nullable=False),
        sa.Column('subject',    sa.String(300),   nullable=False),
        sa.Column('html_body',  sa.Text(),        nullable=False),
        sa.Column('text_body',  sa.Text(),        nullable=True),
        sa.Column('variables',  JSONB(),          nullable=False, server_default='[]'),
        sa.Column('is_system',  sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('is_active',  sa.Boolean(),     nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_email_templates_tenant',   'email_templates', ['tenant_id'])
    op.create_index('ix_email_templates_category', 'email_templates', ['category'])
    op.create_index('ix_email_templates_system',   'email_templates', ['is_system'])


def downgrade():
    op.drop_table('email_templates')
