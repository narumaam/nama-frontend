"""baseline_schema

Revision ID: f5d48c026bb0
Revises:
Create Date: 2026-04-15 06:19:09.938543

Full baseline — creates all NAMA tables if they don't exist.
Uses CREATE TABLE IF NOT EXISTS via checkfirst=True so it's
safe to run against both fresh and existing databases.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f5d48c026bb0'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = set(inspector.get_table_names())

    # ── tenants ──────────────────────────────────────────────────────────────
    if 'tenants' not in existing:
        op.create_table(
            'tenants',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('slug', sa.String(length=100), nullable=False),
            sa.Column('tenant_type', sa.String(length=50), nullable=False, server_default='DMC'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('subscription_plan', sa.String(50), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('slug'),
        )
        op.create_index('ix_tenants_id', 'tenants', ['id'])
        op.create_index('ix_tenants_slug', 'tenants', ['slug'])

    # ── users ─────────────────────────────────────────────────────────────────
    if 'users' not in existing:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('hashed_password', sa.String(length=255), nullable=False),
            sa.Column('full_name', sa.String(length=200), nullable=True),
            sa.Column('role', sa.String(length=50), nullable=False, server_default='R4_OPS_EXECUTIVE'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.Column('last_login_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('email'),
        )
        op.create_index('ix_users_id', 'users', ['id'])
        op.create_index('ix_users_email', 'users', ['email'])
        op.create_index('ix_users_tenant_id', 'users', ['tenant_id'])

    # ── leads ─────────────────────────────────────────────────────────────────
    if 'leads' not in existing:
        op.create_table(
            'leads',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('sender_id', sa.String(length=100), nullable=True),
            sa.Column('source', sa.String(length=50), nullable=False, server_default='MANUAL'),
            sa.Column('full_name', sa.String(length=200), nullable=True),
            sa.Column('email', sa.String(length=255), nullable=True),
            sa.Column('phone', sa.String(length=30), nullable=True),
            sa.Column('destination', sa.String(length=200), nullable=True),
            sa.Column('duration_days', sa.Integer(), nullable=True),
            sa.Column('travelers_count', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('budget_per_person', sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('travel_style', sa.String(length=50), nullable=True),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='NEW'),
            sa.Column('priority', sa.Integer(), nullable=False, server_default='3'),
            sa.Column('triage_confidence', sa.Integer(), nullable=False, server_default='50'),
            sa.Column('suggested_reply', sa.Text(), nullable=True),
            sa.Column('assigned_to', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_leads_id', 'leads', ['id'])
        op.create_index('ix_leads_tenant_id', 'leads', ['tenant_id'])
        op.create_index('ix_leads_status', 'leads', ['status'])
        op.create_index('ix_leads_created_at', 'leads', ['created_at'])

    # ── lead_tags ──────────────────────────────────────────────────────────────
    if 'lead_tags' not in existing:
        op.create_table(
            'lead_tags',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('lead_id', sa.Integer(), sa.ForeignKey('leads.id'), nullable=False),
            sa.Column('tag', sa.String(length=100), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── vendors ───────────────────────────────────────────────────────────────
    if 'vendors' not in existing:
        op.create_table(
            'vendors',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('vendor_code', sa.String(length=50), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=False),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='ACTIVE'),
            sa.Column('contact_name', sa.String(length=200), nullable=True),
            sa.Column('contact_email', sa.String(length=255), nullable=True),
            sa.Column('contact_phone', sa.String(length=30), nullable=True),
            sa.Column('city', sa.String(length=100), nullable=True),
            sa.Column('country', sa.String(length=100), nullable=True),
            sa.Column('default_currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('markup_pct', sa.Numeric(precision=5, scale=2), nullable=False, server_default='20'),
            sa.Column('rating', sa.Numeric(precision=3, scale=2), nullable=True),
            sa.Column('is_preferred', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('tags', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id', 'vendor_code', name='uq_vendor_code_tenant'),
        )
        op.create_index('ix_vendors_tenant_id', 'vendors', ['tenant_id'])

    # ── vendor_rates ──────────────────────────────────────────────────────────
    if 'vendor_rates' not in existing:
        op.create_table(
            'vendor_rates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('vendor_id', sa.Integer(), sa.ForeignKey('vendors.id'), nullable=False),
            sa.Column('service_type', sa.String(length=100), nullable=False),
            sa.Column('base_price', sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('valid_from', sa.Date(), nullable=True),
            sa.Column('valid_until', sa.Date(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── itineraries ───────────────────────────────────────────────────────────
    if 'itineraries' not in existing:
        op.create_table(
            'itineraries',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('lead_id', sa.Integer(), sa.ForeignKey('leads.id'), nullable=True),
            sa.Column('title', sa.String(length=300), nullable=False),
            sa.Column('destination', sa.String(length=200), nullable=True),
            sa.Column('duration_days', sa.Integer(), nullable=False),
            sa.Column('total_price', sa.Numeric(precision=14, scale=2), nullable=True),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='DRAFT'),
            sa.Column('days_json', sa.Text(), nullable=True),
            sa.Column('social_caption', sa.Text(), nullable=True),
            sa.Column('social_hooks', sa.Text(), nullable=True),
            sa.Column('agent_reasoning', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_itineraries_tenant_id', 'itineraries', ['tenant_id'])

    # ── bookings ──────────────────────────────────────────────────────────────
    if 'bookings' not in existing:
        op.create_table(
            'bookings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('lead_id', sa.Integer(), sa.ForeignKey('leads.id'), nullable=True),
            sa.Column('itinerary_id', sa.Integer(), sa.ForeignKey('itineraries.id'), nullable=True),
            sa.Column('booking_ref', sa.String(length=50), nullable=False),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='PENDING'),
            sa.Column('total_price', sa.Numeric(precision=14, scale=2), nullable=True),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('travel_start', sa.Date(), nullable=True),
            sa.Column('travel_end', sa.Date(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_bookings_tenant_id', 'bookings', ['tenant_id'])

    # ── booking_items ─────────────────────────────────────────────────────────
    if 'booking_items' not in existing:
        op.create_table(
            'booking_items',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=False),
            sa.Column('vendor_id', sa.Integer(), sa.ForeignKey('vendors.id'), nullable=True),
            sa.Column('service_type', sa.String(length=100), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('cost_net', sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column('price_gross', sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='PENDING'),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── payments ──────────────────────────────────────────────────────────────
    if 'payments' not in existing:
        op.create_table(
            'payments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=True),
            sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='PENDING'),
            sa.Column('provider', sa.String(length=50), nullable=True),
            sa.Column('provider_payment_id', sa.String(length=200), nullable=True),
            sa.Column('fx_rate', sa.Numeric(precision=10, scale=6), nullable=True),
            sa.Column('idempotency_key', sa.String(length=100), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── ledger_entries ────────────────────────────────────────────────────────
    if 'ledger_entries' not in existing:
        op.create_table(
            'ledger_entries',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=True),
            sa.Column('entry_type', sa.String(length=10), nullable=False),
            sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_ledger_tenant_id', 'ledger_entries', ['tenant_id'])

    # ── webhook_events ─────────────────────────────────────────────────────────
    if 'webhook_events' not in existing:
        op.create_table(
            'webhook_events',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('provider', sa.String(length=50), nullable=False),
            sa.Column('event_type', sa.String(length=100), nullable=False),
            sa.Column('payload', sa.Text(), nullable=True),
            sa.Column('processed', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── portals ───────────────────────────────────────────────────────────────
    if 'portals' not in existing:
        op.create_table(
            'portals',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('subdomain', sa.String(length=100), nullable=False),
            sa.Column('custom_domain', sa.String(length=255), nullable=True),
            sa.Column('brand_name', sa.String(length=200), nullable=True),
            sa.Column('primary_color', sa.String(length=10), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('subdomain'),
        )

    # ── destinations ──────────────────────────────────────────────────────────
    if 'destinations' not in existing:
        op.create_table(
            'destinations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=True),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('country', sa.String(length=100), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('cover_image', sa.String(length=500), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── content_blocks ────────────────────────────────────────────────────────
    if 'content_blocks' not in existing:
        op.create_table(
            'content_blocks',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('title', sa.String(length=300), nullable=False),
            sa.Column('category', sa.String(length=100), nullable=True),
            sa.Column('body', sa.Text(), nullable=True),
            sa.Column('preview', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── media_assets ──────────────────────────────────────────────────────────
    if 'media_assets' not in existing:
        op.create_table(
            'media_assets',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('url', sa.String(length=500), nullable=False),
            sa.Column('asset_type', sa.String(length=50), nullable=False),
            sa.Column('tags', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── tenant_ai_budgets ─────────────────────────────────────────────────────
    if 'tenant_ai_budgets' not in existing:
        op.create_table(
            'tenant_ai_budgets',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('monthly_limit_usd', sa.Numeric(precision=10, scale=4), nullable=False, server_default='50'),
            sa.Column('current_spend_usd', sa.Numeric(precision=10, scale=4), nullable=False, server_default='0'),
            sa.Column('is_kill_switch_active', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('reset_day', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id'),
        )

    # ── ai_usage ──────────────────────────────────────────────────────────────
    if 'ai_usage' not in existing:
        op.create_table(
            'ai_usage',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('model', sa.String(length=100), nullable=False),
            sa.Column('operation', sa.String(length=100), nullable=False),
            sa.Column('tokens_in', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('tokens_out', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('cost_usd', sa.Numeric(precision=10, scale=6), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_ai_usage_tenant_id', 'ai_usage', ['tenant_id'])

    # ── corporate_pos ─────────────────────────────────────────────────────────
    if 'corporate_pos' not in existing:
        op.create_table(
            'corporate_pos',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('company_name', sa.String(length=200), nullable=False),
            sa.Column('po_number', sa.String(length=100), nullable=True),
            sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=True),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='PENDING'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── fixed_departures ──────────────────────────────────────────────────────
    if 'fixed_departures' not in existing:
        op.create_table(
            'fixed_departures',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('title', sa.String(length=300), nullable=False),
            sa.Column('destination', sa.String(length=200), nullable=True),
            sa.Column('departure_date', sa.Date(), nullable=False),
            sa.Column('return_date', sa.Date(), nullable=True),
            sa.Column('total_seats', sa.Integer(), nullable=False, server_default='20'),
            sa.Column('seats_sold', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('price_per_person', sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='OPEN'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )

    # ── byok_api_keys (M15) ───────────────────────────────────────────────────
    if 'byok_api_keys' not in existing:
        op.create_table(
            'byok_api_keys',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('provider', sa.String(length=50), nullable=False),
            sa.Column('label', sa.String(length=200), nullable=True),
            sa.Column('key_encrypted', sa.Text(), nullable=False),
            sa.Column('key_masked', sa.String(length=30), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
            sa.Column('last_used_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_byok_keys_tenant_id', 'byok_api_keys', ['tenant_id'])


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    tables = [
        'byok_api_keys', 'fixed_departures', 'corporate_pos', 'ai_usage',
        'tenant_ai_budgets', 'media_assets', 'content_blocks', 'destinations',
        'portals', 'webhook_events', 'ledger_entries', 'payments',
        'booking_items', 'bookings', 'itineraries', 'lead_tags', 'vendors',
        'leads', 'users', 'tenants',
    ]
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = set(inspector.get_table_names())
    for table in tables:
        if table in existing:
            op.drop_table(table)
