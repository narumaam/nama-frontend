"""add RBAC + ABAC tables

Revision ID: d1e2f3a4b5c6
Revises: b2c3d4e5f6a7, c3d4e5f6a7b8
Create Date: 2026-04-19 00:00:00.000000

Adds five tables for the dynamic role/permission system:
  roles
  role_permissions
  user_role_assignments
  user_permission_overrides
  permission_audit_log

Uses checkfirst=True so it is safe to re-run against an
existing database that may already have some of these tables.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = ('b2c3d4e5f6a7', 'c3d4e5f6a7b8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = set(inspector.get_table_names())

    # ── roles ─────────────────────────────────────────────────────────────────
    if 'roles' not in existing:
        op.create_table(
            'roles',
            sa.Column('id',          sa.Integer(),     nullable=False),
            sa.Column('tenant_id',   sa.Integer(),     sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name',        sa.String(100),   nullable=False),
            sa.Column('description', sa.Text(),        nullable=True),
            sa.Column('color',       sa.String(30),    nullable=True),
            sa.Column('icon',        sa.String(30),    nullable=True),
            sa.Column('is_locked',   sa.Boolean(),     nullable=False, server_default='false'),
            sa.Column('is_template', sa.Boolean(),     nullable=False, server_default='false'),
            sa.Column('priority',    sa.Integer(),     nullable=False, server_default='10'),
            sa.Column('version',     sa.Integer(),     nullable=False, server_default='1'),
            sa.Column('created_by',  sa.Integer(),     sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at',  sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
            sa.Column('updated_at',  sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id', 'name', name='uq_roles_tenant_name'),
        )
        op.create_index('ix_roles_id',              'roles', ['id'])
        op.create_index('ix_roles_tenant_id',       'roles', ['tenant_id'])
        op.create_index('ix_roles_tenant_priority', 'roles', ['tenant_id', 'priority'])

    # ── role_permissions ──────────────────────────────────────────────────────
    if 'role_permissions' not in existing:
        op.create_table(
            'role_permissions',
            sa.Column('id',         sa.Integer(),   nullable=False),
            sa.Column('role_id',    sa.Integer(),   sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
            sa.Column('module',     sa.String(50),  nullable=False),
            sa.Column('action',     sa.String(50),  nullable=False),
            sa.Column('state',      sa.String(20),  nullable=False, server_default='off'),
            sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('role_id', 'module', 'action', name='uq_role_permissions_atom'),
        )
        op.create_index('ix_role_permissions_id',           'role_permissions', ['id'])
        op.create_index('ix_role_permissions_role_id',      'role_permissions', ['role_id'])
        op.create_index('ix_role_permissions_module_action','role_permissions', ['role_id', 'module', 'action'])

    # ── user_role_assignments ─────────────────────────────────────────────────
    if 'user_role_assignments' not in existing:
        op.create_table(
            'user_role_assignments',
            sa.Column('id',          sa.Integer(), nullable=False),
            sa.Column('user_id',     sa.Integer(), sa.ForeignKey('users.id',   ondelete='CASCADE'), nullable=False),
            sa.Column('tenant_id',   sa.Integer(), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
            sa.Column('role_id',     sa.Integer(), sa.ForeignKey('roles.id',   ondelete='CASCADE'), nullable=False),
            sa.Column('assigned_by', sa.Integer(), sa.ForeignKey('users.id'),  nullable=True),
            sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
            sa.Column('expires_at',  sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role_assignments'),
        )
        op.create_index('ix_user_role_assignments_id',     'user_role_assignments', ['id'])
        op.create_index('ix_user_role_assignments_tenant', 'user_role_assignments', ['tenant_id', 'user_id'])

    # ── user_permission_overrides ─────────────────────────────────────────────
    if 'user_permission_overrides' not in existing:
        op.create_table(
            'user_permission_overrides',
            sa.Column('id',         sa.Integer(),  nullable=False),
            sa.Column('user_id',    sa.Integer(),  sa.ForeignKey('users.id',   ondelete='CASCADE'), nullable=False),
            sa.Column('tenant_id',  sa.Integer(),  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
            sa.Column('module',     sa.String(50), nullable=False),
            sa.Column('action',     sa.String(50), nullable=False),
            sa.Column('state',      sa.String(10), nullable=False),   # grant | deny
            sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('reason',     sa.Text(),     nullable=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_by', sa.Integer(),  sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'module', 'action', name='uq_user_perm_overrides'),
        )
        op.create_index('ix_user_perm_overrides_id',     'user_permission_overrides', ['id'])
        op.create_index('ix_user_perm_overrides_lookup', 'user_permission_overrides', ['user_id', 'module', 'action'])

    # ── permission_audit_log ──────────────────────────────────────────────────
    if 'permission_audit_log' not in existing:
        op.create_table(
            'permission_audit_log',
            sa.Column('id',             sa.Integer(),  nullable=False),
            sa.Column('tenant_id',      sa.Integer(),  nullable=False),
            sa.Column('actor_id',       sa.Integer(),  nullable=True),
            sa.Column('target_user_id', sa.Integer(),  nullable=True),
            sa.Column('target_role_id', sa.Integer(),  nullable=True),
            sa.Column('action_type',    sa.String(50), nullable=False),
            sa.Column('module',         sa.String(50), nullable=True),
            sa.Column('action_name',    sa.String(50), nullable=True),
            sa.Column('old_state',      sa.String(30), nullable=True),
            sa.Column('new_state',      sa.String(30), nullable=True),
            sa.Column('meta',           postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('created_at',     sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_audit_log_id',          'permission_audit_log', ['id'])
        op.create_index('ix_audit_log_tenant_time', 'permission_audit_log', ['tenant_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('permission_audit_log')
    op.drop_table('user_permission_overrides')
    op.drop_table('user_role_assignments')
    op.drop_table('role_permissions')
    op.drop_table('roles')
