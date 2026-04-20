"""add_subscription_tables

Creates subscription_plans, tenant_subscriptions, and subscription_events tables.
Seeds 3 platform plans: Starter / Growth / Scale.

Revision ID: m0n1o2p3q4r5
Revises: l9m0n1o2p3q4
Create Date: 2026-04-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone

# revision identifiers
revision = 'm0n1o2p3q4r5'
down_revision = 'l9m0n1o2p3q4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── subscription_plans ────────────────────────────────────────────────────
    op.create_table(
        'subscription_plans',
        sa.Column('id',            sa.Integer(),     nullable=False),
        sa.Column('name',          sa.String(100),   nullable=False),
        sa.Column('slug',          sa.String(50),    nullable=False),
        sa.Column('price_monthly', sa.Numeric(12, 2), nullable=False),
        sa.Column('price_yearly',  sa.Numeric(12, 2), nullable=False),
        sa.Column('max_users',     sa.Integer(),      nullable=True),
        sa.Column('max_leads',     sa.Integer(),      nullable=True),
        sa.Column('features',      JSONB(),            nullable=True),
        sa.Column('is_active',     sa.Boolean(),      nullable=False, server_default='true'),
        sa.Column('sort_order',    sa.Integer(),      nullable=True,  server_default='10'),
        sa.Column('created_at',    sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_subscription_plans_slug'),
    )
    op.create_index('ix_subscription_plans_id', 'subscription_plans', ['id'], unique=False)
    op.add_column('subscription_plans', sa.Column('price_monthly_usd', sa.Numeric(10, 2), nullable=True))
    op.add_column('subscription_plans', sa.Column('price_yearly_usd', sa.Numeric(10, 2), nullable=True))

    # ── tenant_subscriptions ──────────────────────────────────────────────────
    op.create_table(
        'tenant_subscriptions',
        sa.Column('id',                       sa.Integer(),     nullable=False),
        sa.Column('tenant_id',                sa.Integer(),     nullable=False),
        sa.Column('plan_id',                  sa.Integer(),     nullable=False),
        sa.Column('status',                   sa.String(20),    nullable=False, server_default='trial'),
        sa.Column('billing_cycle',            sa.String(10),    nullable=False, server_default='monthly'),
        sa.Column('current_period_start',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end',       sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancel_at_period_end',     sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('trial_ends_at',            sa.DateTime(timezone=True), nullable=True),
        sa.Column('razorpay_subscription_id', sa.String(100),   nullable=True),
        sa.Column('razorpay_customer_id',     sa.String(100),   nullable=True),
        sa.Column('notes',                    sa.Text(),         nullable=True),
        sa.Column('created_at',  sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at',  sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'],   ['subscription_plans.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', name='uq_tenant_subscriptions_tenant'),
    )
    op.create_index('ix_tenant_subscriptions_id',        'tenant_subscriptions', ['id'],        unique=False)
    op.create_index('ix_tenant_subscriptions_tenant_id', 'tenant_subscriptions', ['tenant_id'], unique=False)
    op.create_index('ix_tenant_subscriptions_plan_id',   'tenant_subscriptions', ['plan_id'],   unique=False)
    op.create_index('ix_tenant_subscriptions_status',    'tenant_subscriptions', ['status'],    unique=False)
    op.create_index('ix_tenant_subscriptions_razorpay',  'tenant_subscriptions',
                    ['razorpay_subscription_id'], unique=False)

    # ── subscription_events ───────────────────────────────────────────────────
    op.create_table(
        'subscription_events',
        sa.Column('id',                   sa.Integer(),      nullable=False),
        sa.Column('tenant_id',            sa.Integer(),      nullable=False),
        sa.Column('subscription_id',      sa.Integer(),      nullable=True),
        sa.Column('event_type',           sa.String(50),     nullable=False),
        sa.Column('old_plan_id',          sa.Integer(),      nullable=True),
        sa.Column('new_plan_id',          sa.Integer(),      nullable=True),
        sa.Column('old_billing_cycle',    sa.String(10),     nullable=True),
        sa.Column('new_billing_cycle',    sa.String(10),     nullable=True),
        sa.Column('amount_charged',       sa.Numeric(12, 2), nullable=True),
        sa.Column('proration_credit',     sa.Numeric(12, 2), nullable=True),
        sa.Column('razorpay_payment_id',  sa.String(100),    nullable=True),
        sa.Column('notes',                sa.Text(),          nullable=True),
        sa.Column('meta',                 JSONB(),            nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['subscription_id'], ['tenant_subscriptions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['old_plan_id'],     ['subscription_plans.id']),
        sa.ForeignKeyConstraint(['new_plan_id'],     ['subscription_plans.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_subscription_events_id',          'subscription_events', ['id'],             unique=False)
    op.create_index('ix_subscription_events_tenant_id',   'subscription_events', ['tenant_id'],      unique=False)
    op.create_index('ix_subscription_events_sub_id',      'subscription_events', ['subscription_id'], unique=False)
    op.create_index('ix_subscription_events_tenant_time', 'subscription_events', ['tenant_id', 'created_at'])

    # ── Seed 3 plans ──────────────────────────────────────────────────────────
    plans_table = sa.table(
        'subscription_plans',
        sa.column('name',              sa.String),
        sa.column('slug',              sa.String),
        sa.column('price_monthly',     sa.Numeric),
        sa.column('price_yearly',      sa.Numeric),
        sa.column('price_monthly_usd', sa.Numeric),
        sa.column('price_yearly_usd',  sa.Numeric),
        sa.column('max_users',         sa.Integer),
        sa.column('max_leads',         sa.Integer),
        sa.column('features',          JSONB),
        sa.column('is_active',         sa.Boolean),
        sa.column('sort_order',        sa.Integer),
    )

    op.bulk_insert(plans_table, [
        {
            "name":              "Starter",
            "slug":              "starter",
            "price_monthly":     4999.00,
            "price_yearly":      49999.00,
            "price_monthly_usd": 59.00,
            "price_yearly_usd":  590.00,
            "max_users":         3,
            "max_leads":         500,
            "features": {
                "leads_crm":       True,
                "itineraries":     True,
                "quotations":      True,
                "bookings":        True,
                "vendors":         True,
                "communications":  True,
                "financials":      True,
                "copilot":         False,
                "automations":     False,
                "marketplace":     False,
                "custom_domain":   False,
                "api_access":      False,
                "priority_support": False,
            },
            "is_active":  True,
            "sort_order": 10,
        },
        {
            "name":              "Growth",
            "slug":              "growth",
            "price_monthly":     14999.00,
            "price_yearly":      149999.00,
            "price_monthly_usd": 179.00,
            "price_yearly_usd":  1790.00,
            "max_users":         10,
            "max_leads":         2000,
            "features": {
                "leads_crm":       True,
                "itineraries":     True,
                "quotations":      True,
                "bookings":        True,
                "vendors":         True,
                "communications":  True,
                "financials":      True,
                "copilot":         True,
                "automations":     True,
                "marketplace":     True,
                "custom_domain":   False,
                "api_access":      False,
                "priority_support": False,
            },
            "is_active":  True,
            "sort_order": 20,
        },
        {
            "name":              "Scale",
            "slug":              "scale",
            "price_monthly":     39999.00,
            "price_yearly":      399999.00,
            "price_monthly_usd": 479.00,
            "price_yearly_usd":  4790.00,
            "max_users":         None,   # unlimited
            "max_leads":         None,   # unlimited
            "features": {
                "leads_crm":       True,
                "itineraries":     True,
                "quotations":      True,
                "bookings":        True,
                "vendors":         True,
                "communications":  True,
                "financials":      True,
                "copilot":         True,
                "automations":     True,
                "marketplace":     True,
                "custom_domain":   True,
                "api_access":      True,
                "priority_support": True,
                "dedicated_csm":   True,
                "sla_guarantee":   True,
            },
            "is_active":  True,
            "sort_order": 30,
        },
    ])


def downgrade() -> None:
    op.drop_index('ix_subscription_events_tenant_time', table_name='subscription_events')
    op.drop_index('ix_subscription_events_sub_id',     table_name='subscription_events')
    op.drop_index('ix_subscription_events_tenant_id',  table_name='subscription_events')
    op.drop_index('ix_subscription_events_id',         table_name='subscription_events')
    op.drop_table('subscription_events')

    op.drop_index('ix_tenant_subscriptions_razorpay',  table_name='tenant_subscriptions')
    op.drop_index('ix_tenant_subscriptions_status',    table_name='tenant_subscriptions')
    op.drop_index('ix_tenant_subscriptions_plan_id',   table_name='tenant_subscriptions')
    op.drop_index('ix_tenant_subscriptions_tenant_id', table_name='tenant_subscriptions')
    op.drop_index('ix_tenant_subscriptions_id',        table_name='tenant_subscriptions')
    op.drop_table('tenant_subscriptions')

    op.drop_index('ix_subscription_plans_id', table_name='subscription_plans')
    op.drop_table('subscription_plans')
