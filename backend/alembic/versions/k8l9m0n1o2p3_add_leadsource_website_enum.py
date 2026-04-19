"""add_leadsource_website_enum

Adds WEBSITE value to the leadsource PostgreSQL enum type.
Required for the website lead capture widget (public/widget.js + /api/v1/capture/).

Revision ID: k8l9m0n1o2p3
Revises: j7k8l9m0n1o2
Create Date: 2026-04-19 00:00:00.000000
"""

from alembic import op

# revision identifiers
revision = 'k8l9m0n1o2p3'
down_revision = 'j7k8l9m0n1o2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE is non-transactional in Postgres — must run outside
    # a transaction block. Alembic's execute() works here because each migration
    # step runs in autocommit-compatible mode when using ALTER TYPE ADD VALUE.
    #
    # IF NOT EXISTS guard (Postgres 9.6+) makes this idempotent — safe to re-run.
    op.execute("ALTER TYPE leadsource ADD VALUE IF NOT EXISTS 'WEBSITE'")


def downgrade() -> None:
    # Postgres does not support removing enum values.
    # Downgrade is a no-op — the value is harmless if the feature is rolled back.
    pass
