"""add_quotation_respond_token

Adds respond_token column to quotations table.
This is a security hardening measure — the token is generated when a quote is
marked SENT and must be provided by the client portal when accepting/rejecting,
preventing unauthorised manipulation of quotes by guessing integer IDs.

Revision ID: l9m0n1o2p3q4
Revises: k8l9m0n1o2p3
Create Date: 2026-04-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'l9m0n1o2p3q4'
down_revision = 'k8l9m0n1o2p3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'quotations',
        sa.Column('respond_token', sa.String(64), nullable=True)
    )
    # Index for fast token lookup on the public respond endpoint
    op.create_index(
        'ix_quotations_respond_token',
        'quotations',
        ['respond_token'],
        unique=False,  # not unique — NULL values allowed
    )


def downgrade() -> None:
    op.drop_index('ix_quotations_respond_token', table_name='quotations')
    op.drop_column('quotations', 'respond_token')
