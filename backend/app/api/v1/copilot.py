"""
NAMA Copilot — SSE streaming chat with tool use (P3-5)
"""
import json
import logging
import os
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional, List

from fastapi import APIRouter, Depends, HTTPException
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


async def _stream_copilot_response(
    message: str,
    history: list,
    tenant_id: int,
    context: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream SSE events from Anthropic Claude."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        yield f"data: {json.dumps({'type': 'error', 'content': 'AI not configured — set ANTHROPIC_API_KEY'})}\n\n"
        return

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        system_prompt = """You are NAMA Copilot, an AI assistant built into NAMA OS — an AI-first travel agency management platform.

You help travel agents with:
- Lead management and follow-up strategies
- Quotation creation and pricing advice
- Booking management and operations
- Itinerary planning and destination research
- Vendor selection and rate negotiation
- Finance, invoicing, and payment tracking
- General travel industry knowledge

Keep responses concise and actionable. Use bullet points for lists.
If asked to perform a system action (like create a lead, send a quote), describe clearly what to do in the UI.
Be warm, professional, and travel-industry savvy.

Platform: NAMA OS v0.3.0 — B2B travel agency management system."""

        if context:
            system_prompt += f"\n\nCurrent page/context: {context}"

        messages = []
        for h in history[-10:]:  # keep last 10 messages for context
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": message})

        yield f"data: {json.dumps({'type': 'start'})}\n\n"

        with client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'type': 'delta', 'content': text})}\n\n"

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
    Event types: start | delta | done | error
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
