"""
NAMA OS — Dynamic Role & Permission API  v1.0
──────────────────────────────────────────────
Endpoints:
  GET    /roles                       List all roles for the tenant
  POST   /roles                       Create a new role
  GET    /roles/check                 Permission check — can I do module:action?
  GET    /roles/{role_id}             Get role with full permission set
  PUT    /roles/{role_id}             Update role metadata
  DELETE /roles/{role_id}             Delete role (non-locked only)
  PUT    /roles/{role_id}/permissions Bulk-replace all permissions on a role
  GET    /roles/{role_id}/members     List users assigned to this role
  POST   /roles/{role_id}/assign      Assign a user to this role
  DELETE /roles/{role_id}/assign/{user_id}  Remove user from role

  GET    /roles/overrides/{user_id}   Get per-user permission overrides
  PUT    /roles/overrides/{user_id}   Set a per-user override (grant or deny)
  DELETE /roles/overrides/{user_id}/{module}/{action}  Remove override

  GET    /roles/audit-log             Paginated audit log for the tenant

Access control:
  All write endpoints require R0_NAMA_OWNER, R1_SUPER_ADMIN, or R2_ORG_ADMIN.
  Read endpoints are visible to R0–R2.
  /roles/check is available to all authenticated users.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.api.v1.deps import (
    RoleChecker,
    assert_same_tenant,
    get_current_user,
    get_token_claims,
    require_tenant,
)
from app.db.session import get_db
from app.models.auth import User
from app.models.rbac import (
    PermissionAuditLog,
    Role,
    RolePermission,
    UserPermissionOverride,
    UserRoleAssignment,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/roles", tags=["roles"])

ADMIN_ROLES = ["R0_NAMA_OWNER", "R1_SUPER_ADMIN", "R2_ORG_ADMIN"]


# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class AbacConditions(BaseModel):
    geography:      list[str] = Field(default_factory=list)
    product_types:  list[str] = Field(default_factory=list)
    customer_types: list[str] = Field(default_factory=list)
    deal_size_min:  Optional[float] = None
    deal_size_max:  Optional[float] = None
    own_data_only:  bool = False
    shift_start:    Optional[str] = None   # "09:00"
    shift_end:      Optional[str] = None   # "18:00"
    valid_until:    Optional[str] = None   # ISO date string


class PermissionAtomIn(BaseModel):
    module:     str
    action:     str
    state:      str = "off"               # off | on | conditional
    conditions: Optional[AbacConditions] = None


class RoleCreateIn(BaseModel):
    name:        str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color:       Optional[str] = None
    icon:        Optional[str] = None
    is_template: bool = False
    priority:    int = 10
    clone_from:  Optional[int] = None     # role_id to copy permissions from


class RoleUpdateIn(BaseModel):
    name:        Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color:       Optional[str] = None
    icon:        Optional[str] = None
    is_template: Optional[bool] = None
    priority:    Optional[int] = None


class PermAtomOut(BaseModel):
    module:     str
    action:     str
    state:      str
    conditions: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True


class RoleOut(BaseModel):
    id:           int
    name:         str
    description:  Optional[str]
    color:        Optional[str]
    icon:         Optional[str]
    is_locked:    bool
    is_template:  bool
    priority:     int
    version:      int
    member_count: int
    created_at:   datetime

    class Config:
        from_attributes = True


class RoleDetailOut(RoleOut):
    permissions: list[PermAtomOut]


class AssignIn(BaseModel):
    user_id:    int
    expires_at: Optional[str] = None   # ISO datetime string


class OverrideIn(BaseModel):
    module:     str
    action:     str
    state:      str    # "grant" | "deny"
    reason:     Optional[str] = None
    expires_at: Optional[str] = None
    conditions: Optional[AbacConditions] = None


class CheckResult(BaseModel):
    allowed:   bool
    source:    str                      # "override_deny" | "override_grant" | "role:{id}" | "default_deny"
    module:    str
    action:    str


class AuditEntry(BaseModel):
    id:             int
    actor_id:       Optional[int]
    target_user_id: Optional[int]
    target_role_id: Optional[int]
    action_type:    str
    module:         Optional[str]
    action_name:    Optional[str]
    old_state:      Optional[str]
    new_state:      Optional[str]
    created_at:     datetime

    class Config:
        from_attributes = True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _audit(
    db: Session,
    tenant_id: int,
    action_type: str,
    actor_id: Optional[int] = None,
    target_user_id: Optional[int] = None,
    target_role_id: Optional[int] = None,
    module: Optional[str] = None,
    action_name: Optional[str] = None,
    old_state: Optional[str] = None,
    new_state: Optional[str] = None,
    meta: Optional[dict] = None,
) -> None:
    entry = PermissionAuditLog(
        tenant_id=tenant_id,
        actor_id=actor_id,
        target_user_id=target_user_id,
        target_role_id=target_role_id,
        action_type=action_type,
        module=module,
        action_name=action_name,
        old_state=old_state,
        new_state=new_state,
        meta=meta,
    )
    db.add(entry)
    # caller is responsible for db.commit()


def _member_count(db: Session, role_id: int) -> int:
    return db.query(func.count(UserRoleAssignment.id)).filter(
        UserRoleAssignment.role_id == role_id
    ).scalar() or 0


def _role_or_404(db: Session, role_id: int, tenant_id: int) -> Role:
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.tenant_id == tenant_id,
    ).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


def _evaluate_abac(conditions: dict, context: dict) -> bool:
    """
    Returns True if all non-empty conditions match the provided context.
    context keys: geography, product_type, customer_type, deal_size, user_id, target_user_id, now
    """
    if not conditions:
        return True

    geo = conditions.get("geography", [])
    if geo and context.get("geography") not in geo:
        return False

    pt = conditions.get("product_types", [])
    if pt and context.get("product_type") not in pt:
        return False

    ct = conditions.get("customer_types", [])
    if ct and context.get("customer_type") not in ct:
        return False

    deal = context.get("deal_size")
    if deal is not None:
        dmin = conditions.get("deal_size_min")
        dmax = conditions.get("deal_size_max")
        if dmin is not None and deal < dmin:
            return False
        if dmax is not None and deal > dmax:
            return False

    if conditions.get("own_data_only"):
        if context.get("user_id") != context.get("target_user_id"):
            return False

    valid_until = conditions.get("valid_until")
    if valid_until:
        try:
            cutoff = datetime.fromisoformat(valid_until).replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > cutoff:
                return False
        except ValueError:
            pass

    shift_start = conditions.get("shift_start")
    shift_end   = conditions.get("shift_end")
    if shift_start and shift_end:
        now_time = datetime.now(timezone.utc).strftime("%H:%M")
        if not (shift_start <= now_time <= shift_end):
            return False

    return True


# ─── Permission check ─────────────────────────────────────────────────────────

@router.get("/check", response_model=CheckResult)
def check_permission(
    module:          str = Query(...),
    action:          str = Query(...),
    geography:       Optional[str] = Query(None),
    product_type:    Optional[str] = Query(None),
    customer_type:   Optional[str] = Query(None),
    deal_size:       Optional[float] = Query(None),
    target_user_id:  Optional[int] = Query(None),
    db:              Session = Depends(get_db),
    claims:          dict    = Depends(get_token_claims),
    tenant_id:       int     = Depends(require_tenant),
):
    """
    Ask: can I (current JWT user) perform module:action given this context?
    Resolution order:
      1. User DENY override → blocked immediately
      2. User GRANT override → allowed immediately
      3. Scan role assignments → first role with state=on or passing state=conditional
      4. Default → deny
    """
    user_id = int(claims["user_id"])
    now = datetime.now(timezone.utc)

    context = {
        "geography":       geography,
        "product_type":    product_type,
        "customer_type":   customer_type,
        "deal_size":       deal_size,
        "user_id":         user_id,
        "target_user_id":  target_user_id,
    }

    # ── 1 + 2: Per-user overrides ────────────────────────────────────────────
    override = db.query(UserPermissionOverride).filter(
        and_(
            UserPermissionOverride.user_id   == user_id,
            UserPermissionOverride.tenant_id == tenant_id,
            UserPermissionOverride.module    == module,
            UserPermissionOverride.action    == action,
        )
    ).first()

    if override:
        # Skip expired overrides
        if not (override.expires_at and override.expires_at < now):
            cond_ok = _evaluate_abac(override.conditions or {}, context)
            if cond_ok:
                if override.state == "deny":
                    return CheckResult(allowed=False, source="override_deny",  module=module, action=action)
                if override.state == "grant":
                    return CheckResult(allowed=True,  source="override_grant", module=module, action=action)

    # ── 3: Role-based check ──────────────────────────────────────────────────
    assignments = (
        db.query(UserRoleAssignment)
        .filter(
            UserRoleAssignment.user_id   == user_id,
            UserRoleAssignment.tenant_id == tenant_id,
        )
        .all()
    )

    role_ids = []
    for a in assignments:
        if a.expires_at and a.expires_at < now:
            continue
        role_ids.append(a.role_id)

    if role_ids:
        perms = (
            db.query(RolePermission)
            .join(Role, Role.id == RolePermission.role_id)
            .filter(
                RolePermission.role_id.in_(role_ids),
                RolePermission.module == module,
                RolePermission.action == action,
                RolePermission.state  != "off",
            )
            .order_by(Role.priority.asc())
            .all()
        )

        for perm in perms:
            if perm.state == "on":
                return CheckResult(allowed=True, source=f"role:{perm.role_id}", module=module, action=action)
            if perm.state == "conditional":
                if _evaluate_abac(perm.conditions or {}, context):
                    return CheckResult(allowed=True, source=f"role:{perm.role_id}", module=module, action=action)

    # ── 4: Default deny ──────────────────────────────────────────────────────
    return CheckResult(allowed=False, source="default_deny", module=module, action=action)


# ─── List roles ───────────────────────────────────────────────────────────────

@router.get("", response_model=list[RoleOut])
def list_roles(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _claims:   dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    roles = (
        db.query(Role)
        .filter(Role.tenant_id == tenant_id)
        .order_by(Role.priority.asc(), Role.name.asc())
        .all()
    )
    result = []
    for r in roles:
        result.append(RoleOut(
            id=r.id, name=r.name, description=r.description,
            color=r.color, icon=r.icon, is_locked=r.is_locked,
            is_template=r.is_template, priority=r.priority, version=r.version,
            member_count=_member_count(db, r.id),
            created_at=r.created_at,
        ))
    return result


# ─── Create role ──────────────────────────────────────────────────────────────

@router.post("", response_model=RoleDetailOut, status_code=status.HTTP_201_CREATED)
def create_role(
    body:      RoleCreateIn,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    # Check name uniqueness
    existing = db.query(Role).filter(
        Role.tenant_id == tenant_id,
        Role.name      == body.name,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Role name '{body.name}' already exists")

    role = Role(
        tenant_id=tenant_id,
        name=body.name,
        description=body.description,
        color=body.color,
        icon=body.icon,
        is_template=body.is_template,
        priority=body.priority,
        created_by=int(claims["user_id"]),
    )
    db.add(role)
    db.flush()  # get role.id

    # Clone permissions from source role if requested
    if body.clone_from:
        source_perms = db.query(RolePermission).filter(
            RolePermission.role_id == body.clone_from
        ).all()
        # Verify source role belongs to same tenant
        source_role = db.query(Role).filter(
            Role.id == body.clone_from,
            Role.tenant_id == tenant_id,
        ).first()
        if not source_role:
            raise HTTPException(status_code=404, detail="Clone source role not found")
        for sp in source_perms:
            db.add(RolePermission(
                role_id=role.id,
                module=sp.module,
                action=sp.action,
                state=sp.state,
                conditions=sp.conditions,
            ))

    _audit(db, tenant_id, "role_created",
           actor_id=int(claims["user_id"]),
           target_role_id=role.id,
           meta={"name": role.name})
    db.commit()
    db.refresh(role)

    perms = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
    return RoleDetailOut(
        id=role.id, name=role.name, description=role.description,
        color=role.color, icon=role.icon, is_locked=role.is_locked,
        is_template=role.is_template, priority=role.priority, version=role.version,
        member_count=0, created_at=role.created_at,
        permissions=[PermAtomOut(module=p.module, action=p.action, state=p.state, conditions=p.conditions) for p in perms],
    )


# ─── Get role detail ──────────────────────────────────────────────────────────

@router.get("/{role_id}", response_model=RoleDetailOut)
def get_role(
    role_id:   int,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _claims:   dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    role  = _role_or_404(db, role_id, tenant_id)
    perms = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
    return RoleDetailOut(
        id=role.id, name=role.name, description=role.description,
        color=role.color, icon=role.icon, is_locked=role.is_locked,
        is_template=role.is_template, priority=role.priority, version=role.version,
        member_count=_member_count(db, role.id), created_at=role.created_at,
        permissions=[PermAtomOut(module=p.module, action=p.action, state=p.state, conditions=p.conditions) for p in perms],
    )


# ─── Update role metadata ─────────────────────────────────────────────────────

@router.put("/{role_id}", response_model=RoleOut)
def update_role(
    role_id:   int,
    body:      RoleUpdateIn,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    role = _role_or_404(db, role_id, tenant_id)

    if role.is_locked:
        raise HTTPException(status_code=403, detail="System roles cannot be modified")

    old_name = role.name
    if body.name        is not None: role.name        = body.name
    if body.description is not None: role.description = body.description
    if body.color       is not None: role.color       = body.color
    if body.icon        is not None: role.icon        = body.icon
    if body.is_template is not None: role.is_template = body.is_template
    if body.priority    is not None: role.priority    = body.priority
    role.version += 1

    _audit(db, tenant_id, "role_updated",
           actor_id=int(claims["user_id"]),
           target_role_id=role.id,
           old_state=old_name, new_state=role.name)
    db.commit()
    db.refresh(role)
    return RoleOut(
        id=role.id, name=role.name, description=role.description,
        color=role.color, icon=role.icon, is_locked=role.is_locked,
        is_template=role.is_template, priority=role.priority, version=role.version,
        member_count=_member_count(db, role.id), created_at=role.created_at,
    )


# ─── Delete role ──────────────────────────────────────────────────────────────

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id:   int,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN"])),
):
    role = _role_or_404(db, role_id, tenant_id)

    if role.is_locked:
        raise HTTPException(status_code=403, detail="System roles cannot be deleted")

    member_count = _member_count(db, role_id)
    if member_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Role has {member_count} member(s). Reassign them before deleting.",
        )

    _audit(db, tenant_id, "role_deleted",
           actor_id=int(claims["user_id"]),
           target_role_id=role.id,
           meta={"name": role.name})
    db.delete(role)
    db.commit()


# ─── Bulk replace permissions ─────────────────────────────────────────────────

@router.put("/{role_id}/permissions", response_model=RoleDetailOut)
def update_permissions(
    role_id:   int,
    body:      list[PermissionAtomIn],
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    """
    Replaces the entire permission set for a role.
    Send only atoms you want to persist — missing atoms are treated as 'off'.
    This matches the "Save All" pattern in the frontend Role Builder.
    """
    role = _role_or_404(db, role_id, tenant_id)
    if role.is_locked:
        raise HTTPException(status_code=403, detail="System role permissions cannot be modified")

    # Delete all existing permissions for this role
    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()

    for atom in body:
        db.add(RolePermission(
            role_id=role_id,
            module=atom.module,
            action=atom.action,
            state=atom.state,
            conditions=atom.conditions.model_dump() if atom.conditions else None,
        ))

    role.version += 1
    _audit(db, tenant_id, "perm_changed",
           actor_id=int(claims["user_id"]),
           target_role_id=role_id,
           meta={"atoms_count": len(body)})
    db.commit()
    db.refresh(role)

    perms = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
    return RoleDetailOut(
        id=role.id, name=role.name, description=role.description,
        color=role.color, icon=role.icon, is_locked=role.is_locked,
        is_template=role.is_template, priority=role.priority, version=role.version,
        member_count=_member_count(db, role.id), created_at=role.created_at,
        permissions=[PermAtomOut(module=p.module, action=p.action, state=p.state, conditions=p.conditions) for p in perms],
    )


# ─── Role members ─────────────────────────────────────────────────────────────

@router.get("/{role_id}/members")
def list_members(
    role_id:   int,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _claims:   dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    _role_or_404(db, role_id, tenant_id)
    assignments = (
        db.query(UserRoleAssignment)
        .filter(UserRoleAssignment.role_id == role_id)
        .all()
    )
    result = []
    for a in assignments:
        user = db.query(User).filter(User.id == a.user_id).first()
        result.append({
            "user_id":     a.user_id,
            "email":       user.email       if user else None,
            "full_name":   user.full_name   if user else None,
            "assigned_at": a.assigned_at,
            "expires_at":  a.expires_at,
        })
    return result


# ─── Assign / unassign user ───────────────────────────────────────────────────

@router.post("/{role_id}/assign", status_code=status.HTTP_201_CREATED)
def assign_user(
    role_id:   int,
    body:      AssignIn,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    _role_or_404(db, role_id, tenant_id)

    existing = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == body.user_id,
        UserRoleAssignment.role_id == role_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already assigned to this role")

    expires = None
    if body.expires_at:
        try:
            expires = datetime.fromisoformat(body.expires_at)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid expires_at format (use ISO 8601)")

    db.add(UserRoleAssignment(
        user_id=body.user_id,
        tenant_id=tenant_id,
        role_id=role_id,
        assigned_by=int(claims["user_id"]),
        expires_at=expires,
    ))
    _audit(db, tenant_id, "user_assigned",
           actor_id=int(claims["user_id"]),
           target_user_id=body.user_id,
           target_role_id=role_id)
    db.commit()
    return {"ok": True}


@router.delete("/{role_id}/assign/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_user(
    role_id:   int,
    user_id:   int,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    _role_or_404(db, role_id, tenant_id)

    assignment = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == user_id,
        UserRoleAssignment.role_id == role_id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    _audit(db, tenant_id, "user_removed",
           actor_id=int(claims["user_id"]),
           target_user_id=user_id,
           target_role_id=role_id)
    db.delete(assignment)
    db.commit()


# ─── Per-user permission overrides ────────────────────────────────────────────

@router.get("/overrides/{user_id}")
def get_overrides(
    user_id:   int,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _claims:   dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    overrides = db.query(UserPermissionOverride).filter(
        UserPermissionOverride.user_id   == user_id,
        UserPermissionOverride.tenant_id == tenant_id,
    ).all()
    return [
        {
            "module":     o.module,
            "action":     o.action,
            "state":      o.state,
            "reason":     o.reason,
            "expires_at": o.expires_at,
            "conditions": o.conditions,
        }
        for o in overrides
    ]


@router.put("/overrides/{user_id}", status_code=status.HTTP_200_OK)
def set_override(
    user_id:   int,
    body:      OverrideIn,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN"])),
):
    if body.state not in ("grant", "deny"):
        raise HTTPException(status_code=422, detail="state must be 'grant' or 'deny'")

    expires = None
    if body.expires_at:
        try:
            expires = datetime.fromisoformat(body.expires_at)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid expires_at format")

    existing = db.query(UserPermissionOverride).filter(
        UserPermissionOverride.user_id   == user_id,
        UserPermissionOverride.tenant_id == tenant_id,
        UserPermissionOverride.module    == body.module,
        UserPermissionOverride.action    == body.action,
    ).first()

    old_state = existing.state if existing else None

    if existing:
        existing.state      = body.state
        existing.reason     = body.reason
        existing.expires_at = expires
        existing.conditions = body.conditions.model_dump() if body.conditions else None
        existing.created_by = int(claims["user_id"])
    else:
        db.add(UserPermissionOverride(
            user_id=user_id,
            tenant_id=tenant_id,
            module=body.module,
            action=body.action,
            state=body.state,
            reason=body.reason,
            expires_at=expires,
            conditions=body.conditions.model_dump() if body.conditions else None,
            created_by=int(claims["user_id"]),
        ))

    _audit(db, tenant_id, "override_set",
           actor_id=int(claims["user_id"]),
           target_user_id=user_id,
           module=body.module, action_name=body.action,
           old_state=old_state, new_state=body.state)
    db.commit()
    return {"ok": True}


@router.delete("/overrides/{user_id}/{module}/{action}", status_code=status.HTTP_204_NO_CONTENT)
def delete_override(
    user_id:   int,
    module:    str,
    action:    str,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN"])),
):
    override = db.query(UserPermissionOverride).filter(
        UserPermissionOverride.user_id   == user_id,
        UserPermissionOverride.tenant_id == tenant_id,
        UserPermissionOverride.module    == module,
        UserPermissionOverride.action    == action,
    ).first()
    if not override:
        raise HTTPException(status_code=404, detail="Override not found")

    _audit(db, tenant_id, "override_removed",
           actor_id=int(claims["user_id"]),
           target_user_id=user_id,
           module=module, action_name=action,
           old_state=override.state, new_state=None)
    db.delete(override)
    db.commit()


# ─── Audit log ────────────────────────────────────────────────────────────────

@router.get("/audit-log", response_model=list[AuditEntry])
def get_audit_log(
    page:      int = Query(1, ge=1),
    per_page:  int = Query(50, ge=1, le=200),
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _claims:   dict    = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN"])),
):
    offset = (page - 1) * per_page
    entries = (
        db.query(PermissionAuditLog)
        .filter(PermissionAuditLog.tenant_id == tenant_id)
        .order_by(PermissionAuditLog.created_at.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return entries
