"""add inbound_webhook_events table (M19)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-16

Adds the inbound_webhook_events table used by the M19 webhook handler
(webhooks.py) for WhatsApp, Razorpay, and generic inbound events.

Separate from the existing webhook_events table (which tracks outbound
payment provider events in app.models.payments).
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create table only if it doesn't already exist (idempotent)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'inbound_webhook_events' in inspector.get_table_names():
        return

    op.create_table(
        'inbound_webhook_events',
        sa.Column('id',           sa.Integer,     primary_key=True, autoincrement=True),
        sa.Column('source',       sa.String(50),  nullable=False,  server_default='GENERIC'),
        sa.Column('event_type',   sa.String(128), nullable=False,  server_default='unknown'),
        sa.Column('payload_json', sa.Text,        nullable=False,  server_default='{}'),
        sa.Column('processed',    sa.Boolean,     nullable=False,  server_default=sa.text('false')),
        sa.Column('attempts',     sa.Integer,     nullable=False,  server_default='0'),
        sa.Column('error_detail', sa.String(512), nullable=True),
        sa.Column('created_at',   sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Indexes for background worker polling
    op.create_index(
        'ix_inbound_webhook_events_processed',
        'inbound_webhook_events',
        ['processed'],
    )
    op.create_index(
        'ix_inbound_webhook_source_processed',
        'inbound_webhook_events',
        ['source', 'processed'],
    )


def downgrade() -> None:
    op.drop_index('ix_inbound_webhook_source_processed', table_name='inbound_webhook_events')
    op.drop_index('ix_inbound_webhook_events_processed',  table_name='inbound_webhook_events')
    op.drop_table('inbound_webhook_events')
