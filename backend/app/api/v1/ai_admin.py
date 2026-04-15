"""
HS-4: AI Admin Endpoints — Usage, Budget, Health, Kill-Switch, Cache
---------------------------------------------------------------------
Acceptance Gate endpoints:
  GET  /api/v1/ai/health         → all agent circuit breaker states
  GET  /api/v1/ai/usage          → per-org token spend (admin only)
  GET  /api/v1/ai/budget         → current tenant's monthly budget status
  POST /api/v1/ai/kill-switch    → enable/disable AI_KILL_SWITCH (super admin only)
  POST /api/v1/cache/purge       → invalidate response cache for tenant (R2+ admin only)
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.api.v1.deps import require_tenant, RoleChecker, get_token_claims
from app.models.ai_usage import AIUsage, TenantAIBudget
from app.core.ai_budget import get_all_breaker_states, ai_is_disabled
from app.core.cache import cache

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class BudgetStatus(BaseModel):
    tenant_id: int
    plan_tier: str
    monthly_token_limit: int
    tokens_used_month: int
    tokens_remaining: int
    hard_limit_usd: float
    cost_used_month: float
    budget_pct_used: float
    ai_globally_disabled: bool


class AgentUsageSummary(BaseModel):
    agent_name: str
    total_calls: int
    successful_calls: int
    total_tokens_in: int
    total_tokens_out: int
    total_cost_usd: float


class HealthResponse(BaseModel):
    ai_globally_disabled: bool
    circuit_breakers: dict
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
def ai_health(claims: dict = Depends(get_token_claims)):
    """
    Return status of all agent circuit breakers.
    HS-4 Acceptance Gate: circuit breaker state visible here.
    """
    states = get_all_breaker_states()
    disabled = ai_is_disabled()
    return HealthResponse(
        ai_globally_disabled=disabled,
        circuit_breakers=states,
        message="AI kill-switch active — all agents returning fallbacks" if disabled else "AI agents operational",
    )


@router.get("/budget", response_model=BudgetStatus)
def get_my_budget(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    """Return the current tenant's AI budget status."""
    budget = db.query(TenantAIBudget).filter(TenantAIBudget.tenant_id == tenant_id).first()
    if not budget:
        # Return default limits for tenants with no budget row yet
        return BudgetStatus(
            tenant_id=tenant_id,
            plan_tier="STARTER",
            monthly_token_limit=500_000,
            tokens_used_month=0,
            tokens_remaining=500_000,
            hard_limit_usd=50.0,
            cost_used_month=0.0,
            budget_pct_used=0.0,
            ai_globally_disabled=ai_is_disabled(),
        )

    remaining = max(0, budget.monthly_token_limit - budget.tokens_used_month)
    pct = (budget.tokens_used_month / budget.monthly_token_limit * 100) if budget.monthly_token_limit else 0

    return BudgetStatus(
        tenant_id=tenant_id,
        plan_tier=budget.plan_tier,
        monthly_token_limit=budget.monthly_token_limit,
        tokens_used_month=budget.tokens_used_month,
        tokens_remaining=remaining,
        hard_limit_usd=budget.hard_limit_usd,
        cost_used_month=budget.cost_used_month,
        budget_pct_used=round(pct, 2),
        ai_globally_disabled=ai_is_disabled(),
    )


@router.get("/usage", response_model=list[AgentUsageSummary])
def get_usage_breakdown(
    tenant_id: int = Depends(require_tenant),
    claims: dict = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN", "R2_ORG_ADMIN"])),
    db: Session = Depends(get_db),
):
    """
    Per-agent usage breakdown for this tenant (admin only).
    Returns total calls, success rate, tokens, and cost per agent.
    """
    from sqlalchemy import func, cast, Integer

    rows = (
        db.query(
            AIUsage.agent_name,
            func.count(AIUsage.id).label("total_calls"),
            func.sum(cast(AIUsage.success, Integer)).label("successful_calls"),
            func.sum(AIUsage.tokens_in).label("total_tokens_in"),
            func.sum(AIUsage.tokens_out).label("total_tokens_out"),
            func.sum(AIUsage.cost_usd).label("total_cost_usd"),
        )
        .filter(AIUsage.tenant_id == tenant_id)
        .group_by(AIUsage.agent_name)
        .all()
    )

    return [
        AgentUsageSummary(
            agent_name=r.agent_name,
            total_calls=r.total_calls or 0,
            successful_calls=int(r.successful_calls or 0),
            total_tokens_in=r.total_tokens_in or 0,
            total_tokens_out=r.total_tokens_out or 0,
            total_cost_usd=round(r.total_cost_usd or 0.0, 6),
        )
        for r in rows
    ]


class KillSwitchPayload(BaseModel):
    enabled: bool
    reason: Optional[str] = None


@router.post("/kill-switch", status_code=200)
def toggle_kill_switch(
    payload: KillSwitchPayload,
    claims: dict = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN"])),
):
    """
    Enable or disable the global AI kill-switch.

    HS-4 Acceptance Gate: setting enabled=True makes ai_is_disabled() return True,
    which causes all call_agent_with_controls() calls to return fallbacks immediately.

    NOTE: This sets an in-process env var.  For persistent effect across restarts,
    set AI_KILL_SWITCH=1 in your deployment environment (ECS task definition / Railway env).
    """
    value = "1" if payload.enabled else "0"
    os.environ["AI_KILL_SWITCH"] = value
    action = "ENABLED" if payload.enabled else "DISABLED"
    return {
        "kill_switch": action,
        "ai_globally_disabled": payload.enabled,
        "reason": payload.reason,
        "note": "Restart the service or set AI_KILL_SWITCH env var for persistence across restarts.",
    }


# ── Cache Management ───────────────────────────────────────────────────────────


class CachePurgeResponse(BaseModel):
    """Response from cache purge endpoint."""
    status: str
    tenant_id: int
    message: str


@router.post("/cache/purge", response_model=CachePurgeResponse, status_code=200)
def purge_cache(
    tenant_id: int = Depends(require_tenant),
    claims: dict = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN", "R2_ORG_ADMIN"])),
):
    """
    Purge the in-process response cache for the current tenant.
    Useful after bulk updates or when cache data has become stale.

    Admin-only (R2+) endpoint. Tenant_id sourced from JWT.
    """
    cache.invalidate_tenant(tenant_id)
    return CachePurgeResponse(
        status="purged",
        tenant_id=tenant_id,
        message=f"Response cache invalidated for tenant {tenant_id}",
    )


class CacheWarmResponse(BaseModel):
    """Response from cache warm endpoint."""
    status: str
    tenant_id: int
    results: dict


@router.post("/cache/warm", response_model=CacheWarmResponse, status_code=200)
def warm_cache(
    tenant_id: int = Depends(require_tenant),
    claims: dict = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN", "R2_ORG_ADMIN"])),
    db: Session = Depends(get_db),
):
    """
    Manually trigger cache pre-warming for the current tenant.

    Populates the distributed cache with:
      - dashboard:{tenant_id} (30s TTL)
      - anomalies:{tenant_id} (60s TTL)
      - forecast:{tenant_id} (300s TTL)

    Admin-only (R2+) endpoint. Useful after cache purge or at startup if
    background warmer hasn't completed yet.
    """
    from app.core.cache_warmer import warm_tenant_cache

    results = warm_tenant_cache(tenant_id, db)
    return CacheWarmResponse(
        status="warmed",
        tenant_id=tenant_id,
        results=results,
    )


# ── Observability ──────────────────────────────────────────────────────────────


@router.get("/metrics")
def prometheus_metrics(
    claims: dict = Depends(RoleChecker(["R0_NAMA_OWNER", "R1_SUPER_ADMIN", "R2_ORG_ADMIN"]))
):
    """Prometheus metrics endpoint — R2+ only (contains business data)."""
    from app.core.metrics import get_metrics_output
    from fastapi.responses import Response
    output, content_type = get_metrics_output()
    return Response(content=output, media_type=content_type)
