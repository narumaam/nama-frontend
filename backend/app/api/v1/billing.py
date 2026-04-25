"""
NAMA OS — Subscription & Billing API  v1.0
──────────────────────────────────────────
Endpoints:
  GET    /billing/plans                     List all active plans (public)
  POST   /billing/plans                     Create a new plan (R_NAMA_STAFF only)
  PUT    /billing/plans/{plan_id}           Update plan name/price/features (R_NAMA_STAFF only)
  DELETE /billing/plans/{plan_id}           Deactivate plan (R_NAMA_STAFF only)
  GET    /billing/subscription              Get current tenant subscription
  POST   /billing/subscription              Create or upgrade/downgrade subscription
  GET    /billing/events                    Subscription event history
  POST   /billing/prorate                   Preview pro-rata charge for a plan change
  PUT    /billing/cancel                    Cancel at period end
  PUT    /billing/reactivate                Reactivate a cancelled subscription
  GET    /billing/admin/all                 (R0_NAMA_OWNER only) All tenant subscriptions
  PUT    /billing/admin/{tenant_id}         (R0_NAMA_OWNER only) Force change plan

Pro-rata formula:
  net_charge = (new_daily_rate - old_daily_rate) * days_remaining_in_cycle
  daily_rate = monthly_price / 30   (or yearly_price / 365)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.v1.deps import (
    RoleChecker,
    get_token_claims,
    require_tenant,
)
from app.db.session import get_db
from app.models.billing import SubscriptionPlan, TenantSubscription, SubscriptionEvent

logger = logging.getLogger(__name__)
router = APIRouter(tags=["billing"])

STAFF_ROLES  = ["R0_NAMA_OWNER", "R1_SUPER_ADMIN"]
ADMIN_ROLES  = ["R0_NAMA_OWNER", "R1_SUPER_ADMIN", "R2_ORG_ADMIN"]
ALL_ROLES    = ["R0_NAMA_OWNER", "R1_SUPER_ADMIN", "R2_ORG_ADMIN",
                "R3_SALES_MANAGER", "R4_OPS_EXECUTIVE", "R5_FINANCE_ADMIN"]


# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class PlanOut(BaseModel):
    id:                int
    name:              str
    slug:              str
    price_monthly:     float
    price_yearly:      float
    price_monthly_usd: Optional[float]
    price_yearly_usd:  Optional[float]
    max_users:         Optional[int]
    max_leads:         Optional[int]
    features:          Optional[dict[str, Any]]
    is_active:         bool
    sort_order:        int

    class Config:
        from_attributes = True


class PlansResponse(BaseModel):
    plans:             list[PlanOut]
    detected_currency: str  # "INR" or "USD"


class SubscriptionOut(BaseModel):
    id:                       int
    tenant_id:                int
    plan_id:                  int
    plan:                     Optional[PlanOut]
    status:                   str
    billing_cycle:            str
    current_period_start:     Optional[datetime]
    current_period_end:       Optional[datetime]
    cancel_at_period_end:     bool
    trial_ends_at:            Optional[datetime]
    razorpay_subscription_id: Optional[str]
    notes:                    Optional[str]
    created_at:               datetime
    updated_at:               Optional[datetime]

    class Config:
        from_attributes = True


class SubscribeIn(BaseModel):
    plan_id:       int
    billing_cycle: str = Field("monthly", pattern="^(monthly|yearly)$")
    notes:         Optional[str] = None


class ProrationIn(BaseModel):
    plan_id:       int
    billing_cycle: str = Field("monthly", pattern="^(monthly|yearly)$")


class ProrationOut(BaseModel):
    current_plan_name:  str
    new_plan_name:      str
    current_daily_rate: float
    new_daily_rate:     float
    days_remaining:     int
    net_charge:         float
    credit:             float
    is_upgrade:         bool
    billing_cycle:      str


class SubscriptionEventOut(BaseModel):
    id:               int
    event_type:       str
    old_plan_id:      Optional[int]
    new_plan_id:      Optional[int]
    old_billing_cycle: Optional[str]
    new_billing_cycle: Optional[str]
    amount_charged:   Optional[float]
    proration_credit: Optional[float]
    notes:            Optional[str]
    created_at:       datetime

    class Config:
        from_attributes = True


class AdminSubscriptionOut(BaseModel):
    id:            int
    tenant_id:     int
    tenant_name:   Optional[str] = None
    plan:          Optional[PlanOut]
    status:        str
    billing_cycle: str
    cancel_at_period_end: bool
    current_period_end:   Optional[datetime]
    created_at:    datetime

    class Config:
        from_attributes = True


class AdminChangePlanIn(BaseModel):
    plan_id:       int
    billing_cycle: str = Field("monthly", pattern="^(monthly|yearly)$")
    notes:         Optional[str] = None


class PlanCreateIn(BaseModel):
    name:              str
    slug:              str
    price_monthly:     float = 0.0
    price_yearly:      float = 0.0
    price_monthly_usd: Optional[float] = None
    price_yearly_usd:  Optional[float] = None
    max_users:         Optional[int] = None
    max_leads:         Optional[int] = None
    features:          Optional[dict[str, Any]] = None
    is_active:         bool = True
    sort_order:        int = 99


class PlanUpdateIn(BaseModel):
    name:              Optional[str] = None
    price_monthly:     Optional[float] = None
    price_yearly:      Optional[float] = None
    price_monthly_usd: Optional[float] = None
    price_yearly_usd:  Optional[float] = None
    max_users:         Optional[int] = None
    max_leads:         Optional[int] = None
    features:          Optional[dict[str, Any]] = None
    is_active:         Optional[bool] = None
    sort_order:        Optional[int] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _plan_or_404(db: Session, plan_id: int) -> SubscriptionPlan:
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == plan_id,
        SubscriptionPlan.is_active == True,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found or inactive")
    return plan


def _sub_or_none(db: Session, tenant_id: int) -> Optional[TenantSubscription]:
    return db.query(TenantSubscription).filter(
        TenantSubscription.tenant_id == tenant_id
    ).first()


def _days_remaining(sub: TenantSubscription) -> int:
    """Number of whole days left in the current billing period."""
    if not sub.current_period_end:
        return 0
    now = datetime.now(timezone.utc)
    end = sub.current_period_end
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    delta = (end - now).total_seconds()
    return max(0, int(delta // 86400))


def _calculate_proration(
    current_plan: SubscriptionPlan,
    new_plan: SubscriptionPlan,
    current_cycle: str,
    new_cycle: str,
    days_remaining: int,
) -> dict:
    current_daily = current_plan.daily_rate(current_cycle)
    new_daily     = new_plan.daily_rate(new_cycle)
    net_charge    = (new_daily - current_daily) * days_remaining
    credit        = max(0.0, -net_charge)   # if downgrade, credit = unused amount
    return {
        "current_plan_name":  current_plan.name,
        "new_plan_name":      new_plan.name,
        "current_daily_rate": round(current_daily, 4),
        "new_daily_rate":     round(new_daily, 4),
        "days_remaining":     days_remaining,
        "net_charge":         round(max(0.0, net_charge), 2),
        "credit":             round(credit, 2),
        "is_upgrade":         new_daily > current_daily,
        "billing_cycle":      new_cycle,
    }


def _record_event(
    db: Session,
    tenant_id: int,
    subscription_id: Optional[int],
    event_type: str,
    old_plan_id: Optional[int] = None,
    new_plan_id: Optional[int] = None,
    old_billing_cycle: Optional[str] = None,
    new_billing_cycle: Optional[str] = None,
    amount_charged: Optional[float] = None,
    proration_credit: Optional[float] = None,
    notes: Optional[str] = None,
    meta: Optional[dict] = None,
) -> None:
    evt = SubscriptionEvent(
        tenant_id=tenant_id,
        subscription_id=subscription_id,
        event_type=event_type,
        old_plan_id=old_plan_id,
        new_plan_id=new_plan_id,
        old_billing_cycle=old_billing_cycle,
        new_billing_cycle=new_billing_cycle,
        amount_charged=amount_charged,
        proration_credit=proration_credit,
        notes=notes,
        meta=meta,
    )
    db.add(evt)
    # Caller must call db.commit()


def _period_end(billing_cycle: str) -> datetime:
    """Returns the next period end date from now."""
    now = datetime.now(timezone.utc)
    if billing_cycle == "yearly":
        return now + timedelta(days=365)
    return now + timedelta(days=30)


# ─── Public: list plans ───────────────────────────────────────────────────────

def _detect_currency(request: Request, currency: Optional[str], detect: bool) -> str:
    """
    Determine which currency to use.
    1. If currency param is explicitly provided, use it.
    2. If detect=True, read Vercel's x-vercel-ip-country header; IN → INR, else USD.
    3. Default to INR.
    """
    if currency:
        return currency.upper()
    if detect:
        country = (
            request.headers.get("x-vercel-ip-country") or
            request.headers.get("cf-ipcountry") or
            "IN"
        )
        return "INR" if country == "IN" else "USD"
    return "INR"


def _plan_to_out(p: SubscriptionPlan) -> PlanOut:
    return PlanOut(
        id=p.id, name=p.name, slug=p.slug,
        price_monthly=float(p.price_monthly),
        price_yearly=float(p.price_yearly),
        price_monthly_usd=float(p.price_monthly_usd) if p.price_monthly_usd is not None else None,
        price_yearly_usd=float(p.price_yearly_usd) if p.price_yearly_usd is not None else None,
        max_users=p.max_users, max_leads=p.max_leads,
        features=p.features, is_active=p.is_active,
        sort_order=p.sort_order,
    )


@router.get("/plans", response_model=PlansResponse)
def list_plans(
    request:  Request,
    currency: Optional[str] = Query(default=None, description="Force currency: INR or USD"),
    detect:   bool          = Query(default=False, description="Auto-detect currency from IP geolocation headers"),
    db:       Session       = Depends(get_db),
):
    """
    List all active subscription plans. No auth required — used on marketing pages.
    Pass ?detect=true to auto-detect currency from Vercel's x-vercel-ip-country header.
    Pass ?currency=USD to force USD pricing.
    Returns detected_currency so the frontend knows which prices to display.
    """
    plans = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.is_active == True)
        .order_by(SubscriptionPlan.sort_order.asc(), SubscriptionPlan.id.asc())
        .all()
    )
    detected_currency = _detect_currency(request, currency, detect)
    return PlansResponse(
        plans=[_plan_to_out(p) for p in plans],
        detected_currency=detected_currency,
    )


# ─── Staff: create plan ───────────────────────────────────────────────────────

@router.post("/plans", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    body:    PlanCreateIn,
    db:      Session = Depends(get_db),
    _claims: dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    R0_NAMA_OWNER only.
    Create a new subscription plan.
    """
    # Guard against duplicate slugs
    existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == body.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"A plan with slug '{body.slug}' already exists")

    plan = SubscriptionPlan(
        name=body.name,
        slug=body.slug,
        price_monthly=body.price_monthly,
        price_yearly=body.price_yearly,
        price_monthly_usd=body.price_monthly_usd,
        price_yearly_usd=body.price_yearly_usd,
        max_users=body.max_users,
        max_leads=body.max_leads,
        features=body.features,
        is_active=body.is_active,
        sort_order=body.sort_order,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    logger.info(f"plan_created slug={plan.slug} id={plan.id}")
    return _plan_to_out(plan)


# ─── Staff: update plan ───────────────────────────────────────────────────────

@router.put("/plans/{plan_id}", response_model=PlanOut)
def update_plan(
    plan_id: int,
    body:    PlanUpdateIn,
    db:      Session = Depends(get_db),
    _claims: dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    R0_NAMA_OWNER only.
    Update a plan's name, price, limits, features, or sort order.
    Existing subscriber rates are unaffected — changes apply to new subscriptions only.
    """
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if body.name              is not None: plan.name              = body.name
    if body.price_monthly     is not None: plan.price_monthly     = body.price_monthly
    if body.price_yearly      is not None: plan.price_yearly      = body.price_yearly
    if body.price_monthly_usd is not None: plan.price_monthly_usd = body.price_monthly_usd
    if body.price_yearly_usd  is not None: plan.price_yearly_usd  = body.price_yearly_usd
    if body.max_users         is not None: plan.max_users         = body.max_users
    if body.max_leads         is not None: plan.max_leads         = body.max_leads
    if body.features          is not None: plan.features          = body.features
    if body.is_active         is not None: plan.is_active         = body.is_active
    if body.sort_order        is not None: plan.sort_order        = body.sort_order

    db.commit()
    db.refresh(plan)
    logger.info(f"plan_updated id={plan.id} slug={plan.slug}")
    return _plan_to_out(plan)


# ─── Staff: deactivate plan ───────────────────────────────────────────────────

@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_plan(
    plan_id: int,
    db:      Session = Depends(get_db),
    _claims: dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    R0_NAMA_OWNER only.
    Soft-delete a plan by setting is_active=False.
    Existing subscribers are not affected — they keep their current plan.
    """
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if not plan.is_active:
        raise HTTPException(status_code=409, detail="Plan is already inactive")

    # Refuse if any active/trial subscriptions are still on this plan
    active_count = db.query(TenantSubscription).filter(
        TenantSubscription.plan_id == plan_id,
        TenantSubscription.status.in_(["active", "trial"]),
    ).count()
    if active_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot deactivate: {active_count} active/trial subscription(s) still use this plan. "
                   "Migrate them first or use PUT /billing/plans/{plan_id} to set is_active=false directly.",
        )

    plan.is_active = False
    db.commit()
    logger.info(f"plan_deactivated id={plan_id}")


# ─── Get current subscription ─────────────────────────────────────────────────

@router.get("/subscription", response_model=SubscriptionOut)
def get_subscription(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _claims:   dict    = Depends(RoleChecker(ALL_ROLES)),
):
    sub = _sub_or_none(db, tenant_id)
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found for this tenant")
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    plan_out = _plan_to_out(plan) if plan else None
    return SubscriptionOut(
        id=sub.id, tenant_id=sub.tenant_id, plan_id=sub.plan_id, plan=plan_out,
        status=sub.status, billing_cycle=sub.billing_cycle,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_ends_at=sub.trial_ends_at,
        razorpay_subscription_id=sub.razorpay_subscription_id,
        notes=sub.notes,
        created_at=sub.created_at, updated_at=sub.updated_at,
    )


# ─── Create or change subscription ───────────────────────────────────────────

@router.post("/subscription", response_model=SubscriptionOut)
def create_or_change_subscription(
    body:      SubscribeIn,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    """
    Create a new subscription or change an existing one.

    Upgrade: takes effect immediately with pro-rata charge.
    Downgrade: scheduled at period end (cancel_at_period_end pattern).
    First subscription: creates with 14-day trial.
    """
    new_plan = _plan_or_404(db, body.plan_id)
    now = datetime.now(timezone.utc)
    existing = _sub_or_none(db, tenant_id)

    if not existing:
        # ── First-time subscription: start a 14-day trial ───────────────────
        trial_end = now + timedelta(days=14)
        sub = TenantSubscription(
            tenant_id=tenant_id,
            plan_id=new_plan.id,
            status="trial",
            billing_cycle=body.billing_cycle,
            current_period_start=now,
            current_period_end=trial_end,
            trial_ends_at=trial_end,
            cancel_at_period_end=False,
            notes=body.notes,
        )
        db.add(sub)
        db.flush()
        _record_event(
            db, tenant_id, sub.id, "trial_started",
            new_plan_id=new_plan.id,
            new_billing_cycle=body.billing_cycle,
            notes=f"Trial started — 14 days free on {new_plan.name}",
        )
        db.commit()
        db.refresh(sub)
        logger.info(f"tenant={tenant_id} new subscription plan={new_plan.slug} trial")
    else:
        old_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == existing.plan_id).first()
        old_daily = old_plan.daily_rate(existing.billing_cycle) if old_plan else 0
        new_daily = new_plan.daily_rate(body.billing_cycle)
        is_upgrade = new_daily > old_daily

        if is_upgrade:
            # Upgrade: immediate, with pro-rata charge
            days_rem = _days_remaining(existing)
            proration = _calculate_proration(
                old_plan, new_plan, existing.billing_cycle, body.billing_cycle, days_rem
            )
            old_plan_id = existing.plan_id
            old_cycle   = existing.billing_cycle
            existing.plan_id       = new_plan.id
            existing.billing_cycle = body.billing_cycle
            existing.status        = "active"
            existing.cancel_at_period_end = False
            # Extend period end from now for new cycle
            existing.current_period_end = _period_end(body.billing_cycle)
            existing.notes = body.notes or existing.notes
            _record_event(
                db, tenant_id, existing.id, "plan_changed",
                old_plan_id=old_plan_id, new_plan_id=new_plan.id,
                old_billing_cycle=old_cycle, new_billing_cycle=body.billing_cycle,
                amount_charged=proration["net_charge"],
                proration_credit=proration["credit"],
                notes=f"Upgrade to {new_plan.name} ({body.billing_cycle})",
            )
        else:
            # Downgrade: schedule at period end
            existing.cancel_at_period_end = True
            existing.notes = body.notes or existing.notes
            _record_event(
                db, tenant_id, existing.id, "plan_changed",
                old_plan_id=existing.plan_id, new_plan_id=new_plan.id,
                old_billing_cycle=existing.billing_cycle,
                new_billing_cycle=body.billing_cycle,
                notes=f"Downgrade to {new_plan.name} scheduled at period end",
                meta={"scheduled_plan_id": new_plan.id, "scheduled_cycle": body.billing_cycle},
            )

        db.commit()
        db.refresh(existing)
        sub = existing
        logger.info(f"tenant={tenant_id} plan_changed to={new_plan.slug} upgrade={is_upgrade}")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    plan_out = _plan_to_out(plan) if plan else None

    return SubscriptionOut(
        id=sub.id, tenant_id=sub.tenant_id, plan_id=sub.plan_id, plan=plan_out,
        status=sub.status, billing_cycle=sub.billing_cycle,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_ends_at=sub.trial_ends_at,
        razorpay_subscription_id=sub.razorpay_subscription_id,
        notes=sub.notes,
        created_at=sub.created_at, updated_at=sub.updated_at,
    )


# ─── Preview proration ────────────────────────────────────────────────────────

@router.post("/prorate", response_model=ProrationOut)
def preview_proration(
    body:      ProrationIn,
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _claims:   dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    """
    Preview the pro-rata charge or credit for switching to a new plan.
    Returns a breakdown without making any changes.
    """
    new_plan = _plan_or_404(db, body.plan_id)
    sub = _sub_or_none(db, tenant_id)
    if not sub:
        # No current subscription — just show the full first-month price
        return ProrationOut(
            current_plan_name="None",
            new_plan_name=new_plan.name,
            current_daily_rate=0.0,
            new_daily_rate=round(new_plan.daily_rate(body.billing_cycle), 4),
            days_remaining=30 if body.billing_cycle == "monthly" else 365,
            net_charge=float(new_plan.price_monthly if body.billing_cycle == "monthly" else new_plan.price_yearly),
            credit=0.0,
            is_upgrade=True,
            billing_cycle=body.billing_cycle,
        )

    current_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    if not current_plan:
        raise HTTPException(status_code=404, detail="Current plan not found")

    days_rem = _days_remaining(sub)
    proration = _calculate_proration(
        current_plan, new_plan, sub.billing_cycle, body.billing_cycle, days_rem
    )
    return ProrationOut(**proration)


# ─── Subscription event history ───────────────────────────────────────────────

@router.get("/events", response_model=list[SubscriptionEventOut])
def get_events(
    page:      int = Query(1, ge=1),
    per_page:  int = Query(50, ge=1, le=200),
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    _claims:   dict    = Depends(RoleChecker(ALL_ROLES)),
):
    """Paginated subscription event history for the current tenant."""
    offset = (page - 1) * per_page
    events = (
        db.query(SubscriptionEvent)
        .filter(SubscriptionEvent.tenant_id == tenant_id)
        .order_by(SubscriptionEvent.created_at.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return [
        SubscriptionEventOut(
            id=e.id, event_type=e.event_type,
            old_plan_id=e.old_plan_id, new_plan_id=e.new_plan_id,
            old_billing_cycle=e.old_billing_cycle, new_billing_cycle=e.new_billing_cycle,
            amount_charged=float(e.amount_charged) if e.amount_charged is not None else None,
            proration_credit=float(e.proration_credit) if e.proration_credit is not None else None,
            notes=e.notes, created_at=e.created_at,
        )
        for e in events
    ]


# ─── Cancel subscription ──────────────────────────────────────────────────────

@router.put("/cancel", response_model=SubscriptionOut)
def cancel_subscription(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    """
    Schedule cancellation at the end of the current billing period.
    The subscription remains active until current_period_end.
    """
    sub = _sub_or_none(db, tenant_id)
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription to cancel")
    if sub.status == "cancelled":
        raise HTTPException(status_code=409, detail="Subscription is already cancelled")

    sub.cancel_at_period_end = True
    _record_event(
        db, tenant_id, sub.id, "cancelled",
        old_plan_id=sub.plan_id,
        notes=f"Cancellation scheduled at period end by user {claims.get('user_id')}",
    )
    db.commit()
    db.refresh(sub)
    logger.info(f"tenant={tenant_id} subscription cancel_at_period_end=True")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    plan_out = _plan_to_out(plan) if plan else None

    return SubscriptionOut(
        id=sub.id, tenant_id=sub.tenant_id, plan_id=sub.plan_id, plan=plan_out,
        status=sub.status, billing_cycle=sub.billing_cycle,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_ends_at=sub.trial_ends_at,
        razorpay_subscription_id=sub.razorpay_subscription_id,
        notes=sub.notes,
        created_at=sub.created_at, updated_at=sub.updated_at,
    )


# ─── Reactivate subscription ──────────────────────────────────────────────────

@router.put("/reactivate", response_model=SubscriptionOut)
def reactivate_subscription(
    db:        Session = Depends(get_db),
    tenant_id: int     = Depends(require_tenant),
    claims:    dict    = Depends(RoleChecker(ADMIN_ROLES)),
):
    """
    Undo a pending cancellation or reactivate a fully cancelled subscription.
    """
    sub = _sub_or_none(db, tenant_id)
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")

    if not sub.cancel_at_period_end and sub.status == "active":
        raise HTTPException(status_code=409, detail="Subscription is already active with no pending cancellation")

    sub.cancel_at_period_end = False
    sub.status = "active"
    if not sub.current_period_end or sub.current_period_end < datetime.now(timezone.utc):
        # Expired — renew from now
        sub.current_period_start = datetime.now(timezone.utc)
        sub.current_period_end   = _period_end(sub.billing_cycle)

    _record_event(
        db, tenant_id, sub.id, "reactivated",
        new_plan_id=sub.plan_id,
        notes=f"Reactivated by user {claims.get('user_id')}",
    )
    db.commit()
    db.refresh(sub)
    logger.info(f"tenant={tenant_id} subscription reactivated")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    plan_out = _plan_to_out(plan) if plan else None

    return SubscriptionOut(
        id=sub.id, tenant_id=sub.tenant_id, plan_id=sub.plan_id, plan=plan_out,
        status=sub.status, billing_cycle=sub.billing_cycle,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_ends_at=sub.trial_ends_at,
        razorpay_subscription_id=sub.razorpay_subscription_id,
        notes=sub.notes,
        created_at=sub.created_at, updated_at=sub.updated_at,
    )


# ─── Admin: list all tenant subscriptions ─────────────────────────────────────

@router.get("/admin/all", response_model=list[AdminSubscriptionOut])
def admin_list_all(
    page:      int = Query(1, ge=1),
    per_page:  int = Query(100, ge=1, le=500),
    status:    Optional[str] = Query(None),
    db:        Session = Depends(get_db),
    _claims:   dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    R0_NAMA_OWNER only.
    List all tenant subscriptions across the platform with plan details.
    """
    offset = (page - 1) * per_page
    q = db.query(TenantSubscription)
    if status:
        q = q.filter(TenantSubscription.status == status)
    subs = q.order_by(TenantSubscription.created_at.desc()).offset(offset).limit(per_page).all()

    # Pre-fetch tenant names in a single query to avoid N+1.
    from app.models.auth import Tenant as _Tenant
    tenant_ids = [s.tenant_id for s in subs]
    tenants_map: dict[int, str] = {}
    if tenant_ids:
        for tid, tname in db.query(_Tenant.id, _Tenant.name).filter(_Tenant.id.in_(tenant_ids)).all():
            tenants_map[tid] = tname

    result = []
    for sub in subs:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
        plan_out = _plan_to_out(plan) if plan else None
        result.append(AdminSubscriptionOut(
            id=sub.id, tenant_id=sub.tenant_id,
            tenant_name=tenants_map.get(sub.tenant_id),
            plan=plan_out,
            status=sub.status, billing_cycle=sub.billing_cycle,
            cancel_at_period_end=sub.cancel_at_period_end,
            current_period_end=sub.current_period_end,
            created_at=sub.created_at,
        ))
    return result


# ─── Admin: reactivate any tenant's subscription ──────────────────────────────

@router.put("/admin/{target_tenant_id}/reactivate", response_model=SubscriptionOut)
def admin_reactivate_subscription(
    target_tenant_id: int,
    db:               Session = Depends(get_db),
    claims:           dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    Reactivate any tenant's pending-cancel or fully-cancelled subscription.
    Used by the /owner/subscriptions admin UI to undo cancellations on behalf
    of a customer. Does NOT change the plan or billing cycle.
    """
    sub = _sub_or_none(db, target_tenant_id)
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found for tenant")

    if not sub.cancel_at_period_end and sub.status == "active":
        raise HTTPException(status_code=409, detail="Subscription is already active with no pending cancellation")

    sub.cancel_at_period_end = False
    sub.status = "active"
    if not sub.current_period_end or sub.current_period_end < datetime.now(timezone.utc):
        sub.current_period_start = datetime.now(timezone.utc)
        sub.current_period_end   = _period_end(sub.billing_cycle)

    _record_event(
        db, target_tenant_id, sub.id, "reactivated",
        new_plan_id=sub.plan_id,
        notes=f"Admin reactivated by user {claims.get('user_id')}",
    )
    db.commit()
    db.refresh(sub)
    logger.info(f"tenant={target_tenant_id} subscription admin-reactivated")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    plan_out = _plan_to_out(plan) if plan else None
    return SubscriptionOut(
        id=sub.id, tenant_id=sub.tenant_id, plan_id=sub.plan_id, plan=plan_out,
        status=sub.status, billing_cycle=sub.billing_cycle,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_ends_at=sub.trial_ends_at,
        razorpay_subscription_id=sub.razorpay_subscription_id,
        notes=sub.notes,
        created_at=sub.created_at, updated_at=sub.updated_at,
    )


# ─── Admin: force change any tenant's plan ────────────────────────────────────

@router.put("/admin/{target_tenant_id}", response_model=SubscriptionOut)
def admin_change_plan(
    target_tenant_id: int,
    body:             AdminChangePlanIn,
    db:               Session = Depends(get_db),
    claims:           dict    = Depends(RoleChecker(STAFF_ROLES)),
):
    """
    R0_NAMA_OWNER only.
    Forcefully change any tenant's subscription plan (e.g. for manual upgrades,
    comp plans, or resolving payment issues).
    """
    new_plan = _plan_or_404(db, body.plan_id)
    sub = _sub_or_none(db, target_tenant_id)

    if not sub:
        # Create a new active subscription for the tenant
        sub = TenantSubscription(
            tenant_id=target_tenant_id,
            plan_id=new_plan.id,
            status="active",
            billing_cycle=body.billing_cycle,
            current_period_start=datetime.now(timezone.utc),
            current_period_end=_period_end(body.billing_cycle),
            cancel_at_period_end=False,
            notes=body.notes or f"Created by admin {claims.get('user_id')}",
        )
        db.add(sub)
        db.flush()
        _record_event(
            db, target_tenant_id, sub.id, "plan_changed",
            new_plan_id=new_plan.id, new_billing_cycle=body.billing_cycle,
            notes=f"Admin force-create by {claims.get('user_id')}: {new_plan.name}",
        )
    else:
        old_plan_id = sub.plan_id
        old_cycle   = sub.billing_cycle
        sub.plan_id            = new_plan.id
        sub.billing_cycle      = body.billing_cycle
        sub.status             = "active"
        sub.cancel_at_period_end = False
        sub.current_period_start = datetime.now(timezone.utc)
        sub.current_period_end   = _period_end(body.billing_cycle)
        sub.notes = body.notes or sub.notes
        _record_event(
            db, target_tenant_id, sub.id, "plan_changed",
            old_plan_id=old_plan_id, new_plan_id=new_plan.id,
            old_billing_cycle=old_cycle, new_billing_cycle=body.billing_cycle,
            notes=f"Admin force-change by {claims.get('user_id')}: → {new_plan.name}",
        )

    db.commit()
    db.refresh(sub)
    logger.info(f"admin={claims.get('user_id')} force-changed tenant={target_tenant_id} plan={new_plan.slug}")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    plan_out = _plan_to_out(plan) if plan else None

    return SubscriptionOut(
        id=sub.id, tenant_id=sub.tenant_id, plan_id=sub.plan_id, plan=plan_out,
        status=sub.status, billing_cycle=sub.billing_cycle,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_ends_at=sub.trial_ends_at,
        razorpay_subscription_id=sub.razorpay_subscription_id,
        notes=sub.notes,
        created_at=sub.created_at, updated_at=sub.updated_at,
    )
