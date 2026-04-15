"""
M1: Query Ingestion & Triage
------------------------------
Handles inbound raw queries from WhatsApp webhooks and direct API callers.

Flow:
  1. Raw message arrives (WhatsApp webhook / POST /ingest)
  2. QueryTriageAgent classifies it → structured ExtractedLeadData
  3. If valid, a Lead (M2) is persisted in the DB
  4. Caller receives the triage result + the newly created lead ID

HS-4 enforcement: tenant_id is read from JWT (require_tenant dependency, not
request body) and passed to call_agent_with_controls() inside the triage agent.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.queries import RawQuery, QueryTriageResult
from app.agents.triage import QueryTriageAgent
from app.api.v1.deps import require_tenant, get_token_claims
from app.core.leads import create_lead_from_triage

logger = logging.getLogger(__name__)
router = APIRouter()
triage_agent = QueryTriageAgent()


@router.post(
    "/ingest",
    response_model=QueryTriageResult,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest & triage a raw query (M1 → M2)",
)
async def ingest_query(
    query:      RawQuery,
    db:         Session = Depends(get_db),
    tenant_id:  int     = Depends(require_tenant),   # HS-2: reads from JWT, never body
    claims:     dict    = Depends(get_token_claims),
) -> QueryTriageResult:
    """
    Classify an inbound WhatsApp/email message via the Query Triage Agent.

    If the query is valid, a Lead record is created automatically (M2).
    The AI call goes through HS-4 cost controls (budget, circuit breaker,
    kill-switch) keyed on the JWT tenant_id.
    """
    try:
        result = await triage_agent.triage_query(
            query=query,
            tenant_id=tenant_id,   # HS-4: budget enforcement uses this
            db=db,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Triage agent error: {exc}",
        )

    # ── M1 → M2: persist lead if query is valid ───────────────────────────────
    if result.is_valid_query and result.extracted_data:
        try:
            create_lead_from_triage(
                db=db,
                tenant_id=tenant_id,
                query=query,
                triage_result=result,
            )
        except Exception as exc:
            # Lead creation failure must NOT fail the triage response —
            # log and continue so the caller still gets the triage output.
            logger.error("Lead creation failed after triage: %s", exc, exc_info=True)

    return result


@router.post(
    "/whatsapp-webhook",
    status_code=status.HTTP_200_OK,
    summary="Twilio / Meta WhatsApp webhook receiver",
)
async def whatsapp_webhook(
    payload: dict,
    db: Session = Depends(get_db),
) -> dict:
    """
    Receives raw POST from Twilio or Meta WhatsApp Cloud API.

    NOTE: This endpoint intentionally does NOT require JWT auth —
    it is called by WhatsApp / Twilio, not by a logged-in user.
    Webhook signature verification (HMAC) should be added at the
    infrastructure layer (API Gateway / reverse proxy).

    The tenant is identified by the webhook URL path (one URL per tenant
    subdomain). For the prototype tenant_id=1 is used; real routing
    lands in W3.
    """
    raw_content = payload.get("Body", "")
    sender      = payload.get("From", "unknown")

    if not raw_content.strip():
        return {"status": "ignored", "reason": "empty_body"}

    query = RawQuery(
        source="WHATSAPP",
        content=raw_content,
        sender_id=sender,
        tenant_id=1,   # TODO W3: resolve from subdomain / webhook URL routing
    )

    try:
        result = await triage_agent.triage_query(
            query=query,
            tenant_id=1,
            db=db,
        )
    except Exception as exc:
        # Always return 200 to WhatsApp — non-200 causes infinite retries
        logger.error("WhatsApp webhook triage failed: %s", exc, exc_info=True)
        return {"status": "error", "detail": str(exc)}

    return {
        "status": "ok",
        "is_valid_query": result.is_valid_query,
        "suggested_reply": result.suggested_reply,
    }
