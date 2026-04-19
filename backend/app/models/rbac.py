"""
NAMA OS — RBAC + ABAC Models
─────────────────────────────
Five tables that power dynamic role/permission management:

  roles                  Tenant-scoped role definitions
  role_permissions       Permission atoms per role (module:action + ABAC conditions)
  user_role_assignments  Many-to-many: users ↔ roles
  user_permission_overrides  Per-user grant/deny that wins over role
  permission_audit_log   Immutable change log for compliance
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey,
    DateTime, Text, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


# ── Role ──────────────────────────────────────────────────────────────────────

class Role(Base):
    __tablename__ = "roles"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name        = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color       = Column(String(30),  nullable=True)   # e.g. "teal" or "#14B8A6"
    icon        = Column(String(30),  nullable=True)   # emoji or lucide icon name
    is_locked   = Column(Boolean, default=False)        # system roles: cannot be deleted
    is_template = Column(Boolean, default=False)        # cloneable starting points
    priority    = Column(Integer, default=10)           # lower number = more privileged
    version     = Column(Integer, default=1)
    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    permissions      = relationship("RolePermission",    back_populates="role", cascade="all, delete-orphan")
    user_assignments = relationship("UserRoleAssignment", back_populates="role", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_roles_tenant_name"),
        Index("ix_roles_tenant_priority", "tenant_id", "priority"),
    )


# ── RolePermission ────────────────────────────────────────────────────────────

class RolePermission(Base):
    __tablename__ = "role_permissions"

    id         = Column(Integer, primary_key=True, index=True)
    role_id    = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    module     = Column(String(50), nullable=False)   # e.g. "leads"
    action     = Column(String(50), nullable=False)   # e.g. "view_all"
    # State: "off" | "on" | "conditional"
    state      = Column(String(20), nullable=False, default="off")
    # ABAC conditions — stored as JSONB, matches AbacCondition interface in frontend:
    #   { geography: [], product_types: [], customer_types: [],
    #     deal_size_min, deal_size_max, own_data_only, shift_start, shift_end, valid_until }
    conditions = Column(JSONB, nullable=True)

    role = relationship("Role", back_populates="permissions")

    __table_args__ = (
        UniqueConstraint("role_id", "module", "action", name="uq_role_permissions_atom"),
        Index("ix_role_permissions_module_action", "role_id", "module", "action"),
    )


# ── UserRoleAssignment ────────────────────────────────────────────────────────

class UserRoleAssignment(Base):
    __tablename__ = "user_role_assignments"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id",    ondelete="CASCADE"), nullable=False)
    tenant_id   = Column(Integer, ForeignKey("tenants.id",  ondelete="CASCADE"), nullable=False)
    role_id     = Column(Integer, ForeignKey("roles.id",    ondelete="CASCADE"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"),   nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at  = Column(DateTime(timezone=True), nullable=True)   # time-bound roles

    role = relationship("Role", back_populates="user_assignments")

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role_assignments"),
        Index("ix_user_role_assignments_tenant", "tenant_id", "user_id"),
    )


# ── UserPermissionOverride ────────────────────────────────────────────────────

class UserPermissionOverride(Base):
    """
    Always wins over role-level permissions.
    Resolution order: DENY override → GRANT override → role permissions → default deny
    """
    __tablename__ = "user_permission_overrides"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    tenant_id  = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    module     = Column(String(50), nullable=False)
    action     = Column(String(50), nullable=False)
    state      = Column(String(10), nullable=False)   # "grant" | "deny"
    conditions = Column(JSONB, nullable=True)          # optional ABAC narrowing
    reason     = Column(Text, nullable=True)           # audit trail note
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "module", "action", name="uq_user_perm_overrides"),
        Index("ix_user_perm_overrides_lookup", "user_id", "module", "action"),
    )


# ── PermissionAuditLog ────────────────────────────────────────────────────────

class PermissionAuditLog(Base):
    """
    Immutable append-only log. Never update or delete rows here.
    """
    __tablename__ = "permission_audit_log"

    id             = Column(Integer, primary_key=True, index=True)
    tenant_id      = Column(Integer, nullable=False, index=True)
    actor_id       = Column(Integer, nullable=True)    # user who made the change
    target_user_id = Column(Integer, nullable=True)
    target_role_id = Column(Integer, nullable=True)
    # action_type: role_created | role_updated | role_deleted | perm_changed |
    #              user_assigned | user_removed | override_set | override_removed
    action_type    = Column(String(50), nullable=False)
    module         = Column(String(50), nullable=True)
    action_name    = Column(String(50), nullable=True)
    old_state      = Column(String(30), nullable=True)
    new_state      = Column(String(30), nullable=True)
    meta           = Column(JSONB, nullable=True)       # arbitrary extra context
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_audit_log_tenant_time", "tenant_id", "created_at"),
    )
