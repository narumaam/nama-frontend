"""
NAMA Copilot — SSE streaming chat with REQUIRES_CONFIRMATION write-action safety (P3-5, P4-14)
"""
import json
import logging
import os
import re
from typing import AsyncGenerator, Optional, List

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: Optional[str] = None  # e.g. "lead:123" or "booking:456"


# Regex to detect ACTION_REQUIRED block at the end of a response.
# Claude emits:  ⚡ ACTION_REQUIRED: {"type":"...", "display":"...", ...}
_ACTION_RE = re.compile(
    r'\n*⚡\s*ACTION_REQUIRED:\s*(\{.*\})\s*$',
    re.DOTALL,
)

SYSTEM_PROMPT_BASE = """You are NAMA Copilot, an AI assistant built into NAMA OS — an AI-first travel agency management platform.

You help travel agents with:
- Lead management and follow-up strategies
- Quotation creation and pricing advice
- Booking management and operations
- Itinerary planning and destination research
- Vendor selection and rate negotiation
- Finance, invoicing, and payment tracking
- General travel industry knowledge

Keep responses concise and actionable. Use bullet points for lists.
Be warm, professional, and travel-industry savvy.

## WRITE ACTIONS
When the user explicitly asks you to perform a write operation on their data (e.g. "update this lead", "mark as contacted", "send that quote", "create a booking", "change status to WON"), you MUST:
1. Describe what you are about to do in plain English.
2. End your response with EXACTLY this footer on its own line (no extra text after it):
   ⚡ ACTION_REQUIRED: {"type":"<ACTION_TYPE>","display":"<human-readable description>","params":{<relevant params as key:value>}}

Valid ACTION_TYPEs: UPDATE_LEAD_STATUS | SEND_QUOTE | CREATE_BOOKING | MARK_CONTACTED | ARCHIVE_LEAD | SEND_COMMS_DRAFT

Example footer:
⚡ ACTION_REQUIRED: {"type":"UPDATE_LEAD_STATUS","display":"Mark lead as CONTACTED","params":{"lead_id":42,"status":"CONTACTED"}}

Do NOT add anything after the JSON. If no write action is needed, omit the footer entirely.

Platform: NAMA OS v0.3.0 — B2B travel agency management system."""


async def _stream_copilot_response(
    message: str,
    history: list,
    tenant_id: int,
    context: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream SSE events from Anthropic Claude.
    Emits: start | delta | done | action_required | error

    action_required event payload:
      {"type": "action_required", "action": {"type":"...", "display":"...", "params":{...}}}
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        yield f"data: {json.dumps({'type': 'error', 'content': 'AI not configured — set ANTHROPIC_API_KEY'})}\n\n"
        return

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        system_prompt = SYSTEM_PROMPT_BASE
        if context:
            system_prompt += f"\n\nCurrent page/context: {context}"

        messages = []
        for h in history[-10:]:
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": message})

        yield f"data: {json.dumps({'type': 'start'})}\n\n"

        accumulated = ""
        with client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                accumulated += text
                yield f"data: {json.dumps({'type': 'delta', 'content': text})}\n\n"

        # Post-process: detect ACTION_REQUIRED footer
        match = _ACTION_RE.search(accumulated)
        if match:
            try:
                action_payload = json.loads(match.group(1))
                # Emit a retract event so the frontend strips the footer from display
                footer_text = match.group(0)
                yield f"data: {json.dumps({'type': 'retract_suffix', 'suffix': footer_text})}\n\n"
                yield f"data: {json.dumps({'type': 'action_required', 'action': action_payload})}\n\n"
            except json.JSONDecodeError:
                logger.warning("Copilot emitted malformed ACTION_REQUIRED JSON")

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as e:
        logger.error(f"Copilot stream error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"


@router.post("/chat")
async def copilot_chat(
    request: ChatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stream a Copilot chat response via Server-Sent Events (SSE).
    Event types: start | delta | done | action_required | retract_suffix | error
    """
    return StreamingResponse(
        _stream_copilot_response(
            message=request.message,
            history=request.history,
            tenant_id=current_user.tenant_id,
            context=request.context,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/health")
def copilot_health():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    return {
        "status": "ok" if api_key else "degraded",
        "ai_available": bool(api_key),
        "model": "claude-haiku-4-5-20251001",
    }

