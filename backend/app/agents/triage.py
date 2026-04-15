"""
HS-4: Query Triage Agent — Real Claude API + Cost Controls
-----------------------------------------------------------
Replaces the prototype mock with actual Claude API calls routed through
call_agent_with_controls() which enforces:
  - Kill-switch  (AI_KILL_SWITCH=1 → fallback immediately)
  - Budget limit (tokens_used >= monthly_limit → 429)
  - Circuit breaker (>50% error rate → open circuit for 60s)
  - Usage logging (every call written to ai_usage table)
"""

import json
from typing import Optional
from sqlalchemy.orm import Session

from app.schemas.queries import RawQuery, QueryTriageResult, ExtractedLeadData
from app.agents.prompts.triage_prompts import TRIAGE_SYSTEM_PROMPT, TRIAGE_USER_PROMPT
from app.core.ai_budget import call_agent_with_controls

AGENT_NAME = "query_triage"
MODEL = "claude-sonnet-4-6"


class QueryTriageAgent:
    """
    NAMA Query Triage Agent.
    Extracts structured lead data from raw WhatsApp / email text using Claude.

    All calls go through call_agent_with_controls() — direct Claude SDK
    calls are FORBIDDEN in this codebase (bypass cost controls).
    """

    async def triage_query(
        self,
        query: RawQuery,
        tenant_id: int,
        db: Session,
    ) -> QueryTriageResult:
        """
        Triage a raw query into structured lead data.

        Args:
            query:     The raw inbound query (source + content).
            tenant_id: Current tenant (from JWT) for budget enforcement.
            db:        Database session for usage logging.

        Returns:
            QueryTriageResult with extracted_data and suggested_reply.
        """
        user_prompt = TRIAGE_USER_PROMPT.format(
            source=query.source.value,
            content=query.content,
        )

        result = await call_agent_with_controls(
            db=db,
            tenant_id=tenant_id,
            agent_name=AGENT_NAME,
            system_prompt=TRIAGE_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            model=MODEL,
            max_tokens=1024,
            fallback_response=None,
        )

        if result["from_fallback"]:
            return QueryTriageResult(
                is_valid_query=True,
                extracted_data=_empty_lead(),
                suggested_reply="Thank you for your inquiry! Our team will review your request and get back to you shortly.",
                reasoning=f"AI triage unavailable ({result.get('reason', 'unknown')}). Manual review required.",
            )

        try:
            parsed = _parse_triage_response(result["content"])
        except Exception as parse_err:
            return QueryTriageResult(
                is_valid_query=False,
                extracted_data=_empty_lead(),
                suggested_reply="We received your message and will get back to you soon.",
                reasoning=f"AI response parse error: {parse_err}. Raw: {result['content'][:200]}",
            )

        return parsed


# ── Response parser ───────────────────────────────────────────────────────────

def _parse_triage_response(raw: str) -> QueryTriageResult:
    """
    Parse Claude's JSON response into a QueryTriageResult.
    Expects Claude to return JSON with keys:
      is_valid_query, destination, duration_days, travelers_count,
      travel_dates, budget_per_person, currency, preferences, style,
      confidence_score, suggested_reply, reasoning
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned

    data = json.loads(cleaned)

    extracted = ExtractedLeadData(
        destination=data.get("destination", "Not specified"),
        duration_days=int(data.get("duration_days", 0)),
        travelers_count=int(data.get("travelers_count", 1)),
        travel_dates=data.get("travel_dates", "Not specified"),
        budget_per_person=float(data.get("budget_per_person", 0.0)),
        currency=data.get("currency", "INR"),
        preferences=data.get("preferences", []),
        style=data.get("style", "Standard"),
        confidence_score=float(data.get("confidence_score", 0.5)),
    )

    return QueryTriageResult(
        is_valid_query=bool(data.get("is_valid_query", True)),
        extracted_data=extracted,
        suggested_reply=data.get("suggested_reply", "Thank you for your inquiry!"),
        reasoning=data.get("reasoning", ""),
    )


def _empty_lead() -> ExtractedLeadData:
    return ExtractedLeadData(
        destination="Not specified",
        duration_days=0,
        travelers_count=1,
        travel_dates="Not specified",
        budget_per_person=0.0,
        currency="INR",
        preferences=[],
        style="Standard",
        confidence_score=0.0,
    )
