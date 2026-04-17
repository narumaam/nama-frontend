"""
HS-4: AI Cost Controls — Budget Enforcement + Circuit Breaker + Kill-Switch
----------------------------------------------------------------------------
Every agent call MUST go through `call_agent_with_controls()`.
Direct anthropic.Anthropic().messages.create() calls are FORBIDDEN — they
bypass all cost controls.

Acceptance Gate (HS-4):
  ✓ AI_KILL_SWITCH=1 env var → all agent calls return fallback immediately, no Claude API call
  ✓ Over-budget tenant → HTTP 429, no Claude API call made
  ✓ Circuit breaker: 50%+ error rate → open circuit, fallback for 60s
  ✓ Every successful/failed call writes to ai_usage table
  ✓ Budget enforcement runs before every Claude call

Pricing reference (Claude Sonnet, as of 2026):
  Input:  $3.00 per 1M tokens
  Output: $15.00 per 1M tokens
"""

import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from threading import Lock
from typing import Optional, Any

from sqlalchemy.orm import Session

from app.models.ai_usage import AIUsage, TenantAIBudget

# ── Kill-switch ───────────────────────────────────────────────────────────────
# Set AI_KILL_SWITCH=1 in environment to immediately disable ALL AI agent calls
# without a code deploy. Restoring normal operation: set to 0 or unset.
_KILL_SWITCH_ENV = "AI_KILL_SWITCH"


def ai_is_disabled() -> bool:
    return os.getenv(_KILL_SWITCH_ENV, "0").strip() == "1"


# ── Cost calculation ──────────────────────────────────────────────────────────
INPUT_COST_PER_TOKEN  = 3.00 / 1_000_000   # $3 per 1M input tokens
OUTPUT_COST_PER_TOKEN = 15.00 / 1_000_000  # $15 per 1M output tokens


def calc_cost_usd(tokens_in: int, tokens_out: int) -> float:
    return (tokens_in * INPUT_COST_PER_TOKEN) + (tokens_out * OUTPUT_COST_PER_TOKEN)


# ── Circuit Breaker ───────────────────────────────────────────────────────────

@dataclass
class CircuitBreaker:
    """
    Per-agent circuit breaker.
    States: CLOSED (normal) → OPEN (blocking) → HALF_OPEN (testing)

    Thresholds:
      - Opens when error_rate >= 50% over the last `window` calls (min 5 calls)
      - Resets to HALF_OPEN after `reset_timeout_secs` seconds
      - Returns to CLOSED on next success in HALF_OPEN
    """
    name: str
    error_threshold_pct: float = 50.0
    window: int = 10              # number of recent calls to evaluate
    reset_timeout_secs: int = 60

    _results: list = field(default_factory=list)   # True=success, False=failure
    _state: str = "CLOSED"        # CLOSED | OPEN | HALF_OPEN
    _opened_at: Optional[float] = None
    _lock: Lock = field(default_factory=Lock)

    def call_allowed(self) -> bool:
        with self._lock:
            if self._state == "CLOSED":
                return True
            if self._state == "OPEN":
                if time.time() - (self._opened_at or 0) >= self.reset_timeout_secs:
                    self._state = "HALF_OPEN"
                    return True
                return False
            # HALF_OPEN: allow one probe call
            return True

    def record_success(self) -> None:
        with self._lock:
            self._results.append(True)
            self._results = self._results[-self.window:]
            if self._state == "HALF_OPEN":
                self._state = "CLOSED"
                self._opened_at = None

    def record_failure(self) -> None:
        with self._lock:
            self._results.append(False)
            self._results = self._results[-self.window:]
            if len(self._results) >= 5:
                error_rate = (self._results.count(False) / len(self._results)) * 100
                if error_rate >= self.error_threshold_pct and self._state != "OPEN":
                    self._state = "OPEN"
                    self._opened_at = time.time()

    @property
    def state(self) -> str:
        return self._state


# Global registry — one breaker per agent name
_breakers: dict[str, CircuitBreaker] = {}
_breakers_lock = Lock()


def get_breaker(agent_name: str) -> CircuitBreaker:
    with _breakers_lock:
        if agent_name not in _breakers:
            _breakers[agent_name] = CircuitBreaker(name=agent_name)
        return _breakers[agent_name]


def get_all_breaker_states() -> dict[str, str]:
    """For the admin health/monitoring endpoint."""
    with _breakers_lock:
        return {name: cb.state for name, cb in _breakers.items()}


# ── Budget enforcement ────────────────────────────────────────────────────────

def _get_or_create_budget(db: Session, tenant_id: int) -> TenantAIBudget:
    budget = db.query(TenantAIBudget).filter(TenantAIBudget.tenant_id == tenant_id).first()
    if not budget:
        budget = TenantAIBudget(tenant_id=tenant_id)
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return budget


def check_budget(db: Session, tenant_id: int) -> None:
    """
    Raise HTTP 429 if tenant has exceeded their monthly token or cost limit.
    Must be called BEFORE every Claude API call.
    """
    from fastapi import HTTPException, status

    budget = _get_or_create_budget(db, tenant_id)

    if budget.tokens_used_month >= budget.monthly_token_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Monthly AI token limit reached ({budget.monthly_token_limit:,} tokens). "
                "Upgrade your plan or wait for the monthly reset."
            ),
        )

    if budget.cost_used_month >= budget.hard_limit_usd:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Monthly AI cost limit reached (${budget.hard_limit_usd:.2f}). "
                "Contact support or upgrade your plan."
            ),
        )


def record_usage(
    db: Session,
    tenant_id: int,
    agent_name: str,
    model: str,
    tokens_in: int,
    tokens_out: int,
    success: bool,
    error_detail: Optional[str] = None,
) -> None:
    """Write AIUsage row and update TenantAIBudget counters."""
    cost = calc_cost_usd(tokens_in, tokens_out)

    usage = AIUsage(
        tenant_id=tenant_id,
        agent_name=agent_name,
        model=model,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_usd=cost,
        success=success,
        error_detail=error_detail,
    )
    db.add(usage)

    if success:
        budget = _get_or_create_budget(db, tenant_id)
        budget.tokens_used_month += tokens_in + tokens_out
        budget.cost_used_month += cost

    db.commit()


# ── Main controlled caller ────────────────────────────────────────────────────

async def call_agent_with_controls(
    *,
    db: Session,
    tenant_id: int,
    agent_name: str,
    system_prompt: str,
    user_prompt: str,
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 2048,
    fallback_response: Any = None,
) -> dict:
    """
    The ONLY authorised way to call the Claude API within NAMA.

    Enforces (in order):
      1. Kill-switch check       → fallback if AI disabled
      2. Budget check            → 429 if over limit
      3. Circuit breaker check   → fallback if circuit open
      4. Claude API call         → records usage, updates breaker

    Returns dict with keys: content (str), tokens_in, tokens_out, cost_usd, from_fallback (bool)
    """

    # ── 1. Kill-switch ────────────────────────────────────────────────────
    if ai_is_disabled():
        return {
            "content": fallback_response or "AI features are temporarily disabled. Please try again shortly.",
            "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0,
            "from_fallback": True, "reason": "kill_switch",
        }

    # ── 2. Budget check ───────────────────────────────────────────────────
    check_budget(db, tenant_id)   # raises 429 if over limit

    # ── 3. Circuit breaker ────────────────────────────────────────────────
    breaker = get_breaker(agent_name)
    if not breaker.call_allowed():
        return {
            "content": fallback_response or "AI service temporarily unavailable. Please try manually.",
            "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0,
            "from_fallback": True, "reason": "circuit_open",
        }

    # ── 4. Claude API call ────────────────────────────────────────────────
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        # In production and dev, we require a real key. STUB fallback removed.
        log.error("CRITICAL: ANTHROPIC_API_KEY is not set.")
        return {
            "content": "AI service is misconfigured (missing API key). Please contact the administrator.",
            "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0,
            "from_fallback": True, "reason": "misconfigured_no_api_key",
        }

    import anthropic

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        tokens_in  = response.usage.input_tokens
        tokens_out = response.usage.output_tokens
        content    = response.content[0].text if response.content else ""

        breaker.record_success()
        record_usage(db, tenant_id, agent_name, model, tokens_in, tokens_out, success=True)

        return {
            "content": content,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "cost_usd": calc_cost_usd(tokens_in, tokens_out),
            "from_fallback": False,
        }

    except Exception as exc:
        breaker.record_failure()
        record_usage(db, tenant_id, agent_name, model, 0, 0, success=False, error_detail=str(exc))

        return {
            "content": fallback_response or "AI request failed. Please try again or proceed manually.",
            "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0,
            "from_fallback": True, "reason": str(exc),
        }
