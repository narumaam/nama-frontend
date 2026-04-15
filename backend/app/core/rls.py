"""
HS-2: Row Level Security — Application-Layer Enforcement
----------------------------------------------------------
Since we use SQLAlchemy (not raw Supabase RLS), we enforce tenant isolation
at the application layer by filtering every query through require_tenant().

Rules:
  1. NEVER query a tenant-scoped table without a .filter(Model.tenant_id == tid)
  2. ALWAYS source tenant_id from require_tenant() (= from JWT), never from the request body
  3. After loading a resource, call assert_same_tenant() if the table doesn't have tenant_id directly

Helpers in this module make the pattern explicit and easy to audit.

Acceptance Gate (HS-2):
  ✓ RLS isolation test: query as tenant_a returns zero tenant_b rows
  ✓ All mutations scope their INSERT to the JWT tenant_id
"""

from typing import Type, TypeVar, Optional
from sqlalchemy.orm import Session, Query
from fastapi import HTTPException, status

from app.db.session import Base

ModelT = TypeVar("ModelT", bound=Base)


def tenant_query(
    db: Session,
    model: Type[ModelT],
    tenant_id: int,
) -> Query:
    """
    Return a SQLAlchemy Query already filtered to the current tenant.

    Usage:
        bookings = tenant_query(db, Booking, tenant_id).all()
        lead = tenant_query(db, Lead, tenant_id).filter(Lead.id == lead_id).first()
    """
    return db.query(model).filter(model.tenant_id == tenant_id)  # type: ignore[attr-defined]


def get_or_404(
    db: Session,
    model: Type[ModelT],
    resource_id: int,
    tenant_id: int,
    detail: Optional[str] = None,
) -> ModelT:
    """
    Fetch a single resource by PK, scoped to tenant.
    Raises 404 (not 403) if resource doesn't exist in this tenant — prevents
    leaking the existence of other tenants' resources.

    Usage:
        booking = get_or_404(db, Booking, booking_id, tenant_id)
    """
    resource = (
        db.query(model)
        .filter(model.id == resource_id, model.tenant_id == tenant_id)  # type: ignore[attr-defined]
        .first()
    )
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail or f"{model.__name__} not found",
        )
    return resource


def assert_tenant_owns(resource_tenant_id: int, jwt_tenant_id: int, resource_name: str = "resource") -> None:
    """
    Verify that the resource belongs to the current tenant.
    Use this for models that don't have a direct tenant_id column but are
    reachable via FK (e.g. BookingItem → Booking → tenant_id).
    Raises 404 (not 403) to avoid leaking resource existence.
    """
    if resource_tenant_id != jwt_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} not found",
        )
