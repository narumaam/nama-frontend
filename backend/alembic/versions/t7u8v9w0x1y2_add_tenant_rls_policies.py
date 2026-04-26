"""add tenant RLS policies (defence-in-depth) — Tier 10D

Revision ID: t7u8v9w0x1y2
Revises: s6t7u8v9w0x1
Create Date: 2026-04-26

Creates Postgres Row-Level Security policies on the major tenant tables.
Each policy enforces:

    USING (tenant_id = current_setting('app.tenant_id', true)::int)

so that any session that doesn't `SET LOCAL app.tenant_id = N` either gets
the policy's null-safe fall-through (when missing_ok=true returns NULL,
NULL = tenant_id evaluates to NULL → row is filtered out) or, for a row
where tenant_id is NULL, also filtered out. This is exactly what we want
as a defence-in-depth backstop in case an application-layer query forgets
its `WHERE tenant_id = X` filter.

⚠️  IMPORTANT — ENFORCEMENT IS NOT ENABLED IN THIS MIGRATION.
The `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` line is commented out.
This migration **only creates the policy objects**. To turn enforcement on:

  1. Confirm every backend request goes through `get_db()` which now
     issues `SET LOCAL app.tenant_id = N` (Tier 10D plumbing — already shipped).
  2. Confirm the connecting Postgres role does NOT have BYPASSRLS:
         ALTER ROLE app_user NOBYPASSRLS;
  3. Run the enable script in `deploy/enable_rls.sql` (separate hand-flip).

Why split: enabling RLS on a live table is irreversible at the request
layer — if even one query path forgets SET LOCAL, the request returns
zero rows or crashes. Running the policy creation as an additive
migration first lets the team verify the policies in a staging snapshot
without risk to production.

Idempotent: every CREATE POLICY uses checkfirst-style DROP IF EXISTS first.
SQLite (test env) — no-op.
"""

from alembic import op
import sqlalchemy as sa


revision = 't7u8v9w0x1y2'
down_revision = 's6t7u8v9w0x1'
branch_labels = None
depends_on = None


# Tables that are tenant-scoped — every row has a tenant_id column.
# Order doesn't matter: each table is independent.
RLS_TABLES = [
    "leads",
    "itineraries",
    "quotations",
    "bookings",
    "conversation_messages",
    "audit_log",
    "vendors",
    "clients",
    "ledger_entries",
    "media_assets",
]

POLICY_NAME = "tenant_isolation"


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        # SQLite/MySQL: skip silently — RLS is a Postgres-specific feature.
        return

    for table in RLS_TABLES:
        # Skip if the table doesn't exist in this deployment yet (defensive).
        exists = bind.execute(sa.text(
            "SELECT to_regclass(:tbl) IS NOT NULL"
        ), {"tbl": table}).scalar()
        if not exists:
            continue

        # Drop-then-recreate so re-running the migration always converges.
        op.execute(sa.text(
            f"DROP POLICY IF EXISTS {POLICY_NAME} ON {table}"
        ))
        op.execute(sa.text(
            f"""
            CREATE POLICY {POLICY_NAME} ON {table}
              USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int)
              WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int)
            """
        ))
        # NOTE: enforcement is gated. See the docstring at top.
        # op.execute(sa.text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for table in RLS_TABLES:
        try:
            op.execute(sa.text(f"DROP POLICY IF EXISTS {POLICY_NAME} ON {table}"))
        except Exception:
            pass
