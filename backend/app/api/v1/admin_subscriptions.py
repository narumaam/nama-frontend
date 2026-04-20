"""
NAMA OS — Admin Subscription Routes  v1.0
──────────────────────────────────────────
Owner portal-specific endpoints that surface subscription data alongside
platform-wide metrics.  All routes require R0_NAMA_OWNER.

Endpoints:
  GET    /admin/subscriptions/summary          MRR, ARR, churn, plan breakdown
  GET    /admin/subscriptions/tenants          Paginated list of all tenant subs
  PUT    /admin/subscriptions/{tenant_id}      Force change a tenant's plan
  POST   /admin/subscriptions/{tenant_id}/grant-trial  Extend / grant a free trial
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.v1.deps import RoleChecker, require_tenant
from app.db.session import get_db
from app.models.billing import SubscriptionPlan, TenantSubscription, SubscriptionEvent

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin-subscriptions"])

STAFF_ROLES = ["R0_NAMA_OWNER"]


# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class SubscriptionSummaryOut(BaseModel):
    total_subscriptions:  int
    active_count:         int
    trial_count:          int
    cancelled_count:      int
    paused_count:         int
    mrr_inr:              float    # Monthly Recurring Revenue
    arr_inr:              float    # Annual Run Rate
    plan_breakdown:       dict     # slug → count
    monthly_count:        int
    yearly_count:         int


class TenantSubRow(BaseModel):
    tenant_id:         int
    plan_name:         str
    plan_slug:         str
    status:            str
    billing_cycle:     str
    cancel_at_period_end: bool
    current_period_end: Optional[datetime]
    created_at:        datetime


class ForceChangePlanIn(BaseModel):
    plan_id:       int
    billing_cycle: str = Field("monthly", pattern="^(monthly|yearly)$")
    notes:         Optional[str] = None


class GrantTrialIn(BaseModel):
    trial_days: int = Field(14, ge=1, le=365)
    plan_id:    Optional[int] = None   # override plan during trial


# ─── Summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=SubscriptionSummaryOut)
def get_subscription_summary(
    db:      Session = Depends(get_db),
    _claims: dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    Platform-wide subscription summary for the owner portal dashboard.
    Computes MRR, ARR, churn counts, and plan breakdown.
    """
    subs = db.query(TenantSubscription).all()

    total         = len(subs)
    active_count  = sum(1 for s in subs if s.status == "active")
    trial_count   = sum(1 for s in subs if s.status == "trial")
    cancelled_count = sum(1 for s in subs if s.status == "cancelled")
    paused_count  = sum(1 for s in subs if s.status == "paused")
    monthly_count = sum(1 for s in subs if s.billing_cycle == "monthly")
    yearly_count  = sum(1 for s in subs if s.billing_cycle == "yearly")

    # MRR — count active + trial subscriptions only
    mrr = 0.0
    plan_breakdown: dict[str, int] = {}
    for sub in subs:
        if sub.status not in ("active", "trial"):
            continue
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
        if not plan:
            continue
        slug = plan.slug
        plan_breakdown[slug] = plan_breakdown.get(slug, 0) + 1
        if sub.billing_cycle == "yearly":
            mrr += float(plan.price_yearly) / 12
        else:
            mrr += float(plan.price_monthly)

    return SubscriptionSummaryOut(
        total_subscriptions=total,
        active_count=active_count,
        trial_count=trial_count,
        cancelled_count=cancelled_count,
        paused_count=paused_count,
        mrr_inr=round(mrr, 2),
        arr_inr=round(mrr * 12, 2),
        plan_breakdown=plan_breakdown,
        monthly_count=monthly_count,
        yearly_count=yearly_count,
    )


# ─── Paginated tenant list ────────────────────────────────────────────────────

@router.get("/tenants", response_model=list[TenantSubRow])
def list_tenant_subscriptions(
    page:     int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
    status:   Optional[str] = Query(None),
    plan_slug: Optional[str] = Query(None),
    db:       Session = Depends(get_db),
    _claims:  dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    Paginated list of all tenant subscriptions with plan details.
    Filter by status (active|trial|cancelled|paused) or plan_slug.
    """
    offset = (page - 1) * per_page
    q = db.query(TenantSubscription)
    if status:
        q = q.filter(TenantSubscription.status == status)
    subs = q.order_by(TenantSubscription.created_at.desc()).offset(offset).limit(per_page).all()

    result = []
    for sub in subs:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
        if plan_slug and (not plan or plan.slug != plan_slug):
            continue
        result.append(TenantSubRow(
            tenant_id=sub.tenant_id,
            plan_name=plan.name if plan else "Unknown",
            plan_slug=plan.slug if plan else "unknown",
            status=sub.status,
            billing_cycle=sub.billing_cycle,
            cancel_at_period_end=sub.cancel_at_period_end,
            current_period_end=sub.current_period_end,
            created_at=sub.created_at,
        ))
    return result


# ─── Force change plan ────────────────────────────────────────────────────────

@router.put("/{target_tenant_id}", response_model=TenantSubRow)
def admin_force_change_plan(
    target_tenant_id: int,
    body:             ForceChangePlanIn,
    db:               Session = Depends(get_db),
    claims:           dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    R0_NAMA_OWNER only.
    Force-change a tenant's subscription plan immediately, bypassing proration.
    Used for manual upgrades, comp plans, or support interventions.
    """
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == body.plan_id,
        SubscriptionPlan.is_active == True,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found or inactive")

    sub = db.query(TenantSubscription).filter(
        TenantSubscription.tenant_id == target_tenant_id
    ).first()

    now = datetime.now(timezone.utc)
    if not sub:
        period_end = now + timedelta(days=30 if body.billing_cycle == "monthly" else 365)
        sub = TenantSubscription(
            tenant_id=target_tenant_id,
            plan_id=plan.id,
            status="active",
            billing_cycle=body.billing_cycle,
            current_period_start=now,
            current_period_end=period_end,
            cancel_at_period_end=False,
            notes=body.notes,
        )
        db.add(sub)
        db.flush()
        evt_type = "plan_changed"
    else:
        old_plan_id = sub.plan_id
        sub.plan_id            = plan.id
        sub.billing_cycle      = body.billing_cycle
        sub.status             = "active"
        sub.cancel_at_period_end = False
        sub.current_period_start = now
        sub.current_period_end   = now + timedelta(days=30 if body.billing_cycle == "monthly" else 365)
        sub.notes = body.notes or sub.notes
        evt_type = "plan_changed"

    evt = SubscriptionEvent(
        tenant_id=target_tenant_id,
        subscription_id=sub.id,
        event_type=evt_type,
        new_plan_id=plan.id,
        new_billing_cycle=body.billing_cycle,
        notes=f"Admin force-change by {claims.get('user_id')}: plan → {plan.name}",
    )
    db.add(evt)
    db.commit()
    db.refresh(sub)
    logger.info(f"admin={claims.get('user_id')} force-changed tenant={target_tenant_id} plan={plan.slug}")

    return TenantSubRow(
        tenant_id=sub.tenant_id,
        plan_name=plan.name,
        plan_slug=plan.slug,
        status=sub.status,
        billing_cycle=sub.billing_cycle,
        cancel_at_period_end=sub.cancel_at_period_end,
        current_period_end=sub.current_period_end,
        created_at=sub.created_at,
    )


# ─── Grant / extend trial ─────────────────────────────────────────────────────

@router.post("/{target_tenant_id}/grant-trial", response_model=TenantSubRow)
def admin_grant_trial(
    target_tenant_id: int,
    body:             GrantTrialIn,
    db:               Session = Depends(get_db),
    claims:           dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    Grant or extend a free trial for a specific tenant.
    Optionally override the plan during the trial period.
    """
    # Resolve plan
    if body.plan_id:
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.id == body.plan_id,
            SubscriptionPlan.is_active == True,
        ).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
    else:
        # Default to starter plan
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.slug == "starter",
            SubscriptionPlan.is_active == True,
        ).first()
        if not plan:
            plan = db.query(SubscriptionPlan).filter(
                SubscriptionPlan.is_active == True
            ).order_by(SubscriptionPlan.sort_order.asc()).first()
        if not plan:
            raise HTTPException(status_code=404, detail="No active plans available")

    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=body.trial_days)

    sub = db.query(TenantSubscription).filter(
        TenantSubscription.tenant_id == target_tenant_id
    ).first()

    if not sub:
        sub = TenantSubscription(
            tenant_id=target_tenant_id,
            plan_id=plan.id,
            status="trial",
            billing_cycle="monthly",
            current_period_start=now,
            current_period_end=trial_end,
            trial_ends_at=trial_end,
            cancel_at_period_end=False,
        )
        db.add(sub)
        db.flush()
    else:
        sub.plan_id           = plan.id
        sub.status            = "trial"
        sub.current_period_end = trial_end
        sub.trial_ends_at     = trial_end
        sub.cancel_at_period_end = False

    evt = SubscriptionEvent(
        tenant_id=target_tenant_id,
        subscription_id=sub.id,
        event_type="trial_started",
        new_plan_id=plan.id,
        notes=f"Admin-granted {body.trial_days}-day trial by {claims.get('user_id')}",
    )
    db.add(evt)
    db.commit()
    db.refresh(sub)
    logger.info(f"admin={claims.get('user_id')} granted {body.trial_days}-day trial to tenant={target_tenant_id}")

    return TenantSubRow(
        tenant_id=sub.tenant_id,
        plan_name=plan.name,
        plan_slug=plan.slug,
        status=sub.status,
        billing_cycle=sub.billing_cycle,
        cancel_at_period_end=sub.cancel_at_period_end,
        current_period_end=sub.current_period_end,
        created_at=sub.created_at,
    )
