"""add routines tables

Revision ID: i6j7k8l9m0n1
Revises: h5i6j7k8l9m0
Create Date: 2026-04-19

Tables added:
  - routines          (Routine automation definitions per tenant)
  - routine_runs      (Execution history for each routine trigger)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'i6j7k8l9m0n1'
down_revision = 'h5i6j7k8l9m0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────────────
    trigger_type = postgresql.ENUM(
        'SCHEDULE', 'EVENT', 'MANUAL',
        name='triggertype', create_type=False
    )
    trigger_type.create(op.get_bind(), checkfirst=True)

    routine_status = postgresql.ENUM(
        'ACTIVE', 'PAUSED', 'DRAFT',
        name='routinestatus', create_type=False
    )
    routine_status.create(op.get_bind(), checkfirst=True)

    run_status = postgresql.ENUM(
        'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED',
        name='runstatus', create_type=False
    )
    run_status.create(op.get_bind(), checkfirst=True)

    # ── routines ─────────────────────────────────────────────────────────────────
    op.create_table(
        'routines',
        sa.Column('id',              sa.Integer(),     primary_key=True),
        sa.Column('tenant_id',       sa.Integer(),     sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name',            sa.String(120),   nullable=False),
        sa.Column('description',     sa.Text(),        nullable=True),
        sa.Column('icon',            sa.String(10),    nullable=True, server_default='⚡'),
        sa.Column('color',           sa.String(20),    nullable=True, server_default='emerald'),
        sa.Column('trigger_type',    sa.Enum('SCHEDULE','EVENT','MANUAL', name='triggertype'), nullable=False, server_default='MANUAL'),
        sa.Column('cron_expression', sa.String(100),   nullable=True),
        sa.Column('schedule_label',  sa.String(100),   nullable=True),
        sa.Column('event_trigger',   sa.String(80),    nullable=True),
        sa.Column('prompt',          sa.Text(),        nullable=True),
        sa.Column('steps_json',      postgresql.JSON(), nullable=True),
        sa.Column('status',          sa.Enum('ACTIVE','PAUSED','DRAFT', name='routinestatus'), nullable=False, server_default='DRAFT'),
        sa.Column('run_count',       sa.Integer(),     server_default='0'),
        sa.Column('last_run_at',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_run_status', sa.Enum('QUEUED','RUNNING','SUCCESS','FAILED','CANCELLED','SKIPPED', name='runstatus'), nullable=True),
        sa.Column('next_run_at',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_template',     sa.Boolean(),     server_default='false'),
        sa.Column('template_id',     sa.String(60),    nullable=True),
        sa.Column('created_by',      sa.Integer(),     sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        checkfirst=True,
    )
    op.create_index('ix_routines_tenant_id',  'routines', ['tenant_id'], unique=False, if_not_exists=True)
    op.create_index('ix_routines_status',     'routines', ['status'],    unique=False, if_not_exists=True)
    op.create_index('ix_routines_next_run',   'routines', ['next_run_at'], unique=False, if_not_exists=True)

    # ── routine_runs ─────────────────────────────────────────────────────────────
    op.create_table(
        'routine_runs',
        sa.Column('id',             sa.Integer(),    primary_key=True),
        sa.Column('routine_id',     sa.Integer(),    sa.ForeignKey('routines.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id',      sa.Integer(),    nullable=False),
        sa.Column('status',         sa.Enum('QUEUED','RUNNING','SUCCESS','FAILED','CANCELLED','SKIPPED', name='runstatus'), nullable=False, server_default='QUEUED'),
        sa.Column('trigger_source', sa.String(20),   nullable=True, server_default='manual'),
        sa.Column('trigger_detail', sa.String(120),  nullable=True),
        sa.Column('started_at',     sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('completed_at',   sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_ms',    sa.Float(),      nullable=True),
        sa.Column('output_summary', sa.Text(),       nullable=True),
        sa.Column('actions_log',    postgresql.JSON(), nullable=True),
        sa.Column('error_message',  sa.Text(),       nullable=True),
        checkfirst=True,
    )
    op.create_index('ix_routine_runs_routine_id', 'routine_runs', ['routine_id'], unique=False, if_not_exists=True)
    op.create_index('ix_routine_runs_tenant_id',  'routine_runs', ['tenant_id'],  unique=False, if_not_exists=True)
    op.create_index('ix_routine_runs_started_at', 'routine_runs', ['started_at'], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_table('routine_runs')
    op.drop_table('routines')
