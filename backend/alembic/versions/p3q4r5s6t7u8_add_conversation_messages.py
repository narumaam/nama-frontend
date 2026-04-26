"""add conversation_messages table — Tier 7A

Revision ID: p3q4r5s6t7u8
Revises: o2p3q4r5s6t7
Create Date: 2026-04-26

Tier 7A introduces durable inbound/outbound message storage. The table holds
records from WhatsApp Cloud API webhooks, IMAP poll loops, and the agency's
own outbound /send calls. Reading from this table replaces the lead-derived
projection used in Tier 6A.
"""

from alembic import op
import sqlalchemy as sa


revision = 'p3q4r5s6t7u8'
down_revision = 'o2p3q4r5s6t7'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'conversation_messages' not in inspector.get_table_names():
        op.create_table(
            'conversation_messages',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('lead_id', sa.Integer(), sa.ForeignKey('leads.id'), nullable=True),
            sa.Column('channel', sa.String(32), nullable=False, server_default='IN_APP'),
            sa.Column('direction', sa.String(16), nullable=False, server_default='OUTBOUND'),
            sa.Column('status', sa.String(32), nullable=False, server_default='QUEUED'),
            sa.Column('content', sa.Text(), nullable=False, server_default=''),
            sa.Column('external_id', sa.String(256), nullable=True),
            sa.Column('peer_address', sa.String(256), nullable=True),
            sa.Column('author_name', sa.String(128), nullable=True),
            sa.Column('error_message', sa.String(512), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index('ix_conversation_messages_tenant_id', 'conversation_messages', ['tenant_id'])
        op.create_index('ix_conversation_messages_lead_id', 'conversation_messages', ['lead_id'])
        op.create_index('ix_conversation_messages_created_at', 'conversation_messages', ['created_at'])
        op.create_index('ix_conv_msgs_tenant_lead_created', 'conversation_messages', ['tenant_id', 'lead_id', 'created_at'])
        op.create_index('ix_conv_msgs_tenant_external', 'conversation_messages', ['tenant_id', 'external_id'])


def downgrade():
    op.drop_index('ix_conv_msgs_tenant_external', table_name='conversation_messages')
    op.drop_index('ix_conv_msgs_tenant_lead_created', table_name='conversation_messages')
    op.drop_index('ix_conversation_messages_created_at', table_name='conversation_messages')
    op.drop_index('ix_conversation_messages_lead_id', table_name='conversation_messages')
    op.drop_index('ix_conversation_messages_tenant_id', table_name='conversation_messages')
    op.drop_table('conversation_messages')
