"""
NAMA Copilot — SSE streaming chat with REQUIRES_CONFIRMATION write-action safety (P3-5, P4-14)
Supports OpenRouter (free Llama) and Anthropic (Claude) — prefers OPENROUTER_API_KEY.
"""
import json
import logging
import os
import re
from typing import AsyncGenerator, Optional, List

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: Optional[str] = None  # e.g. "lead:123" or "booking:456"


# Regex to detect ACTION_REQUIRED block at the end of a response.
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


async def _stream_openrouter(
    message: str,
    history: list,
    context: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream SSE events from OpenRouter (Llama 3.3 70B free tier)."""
    api_key = os.getenv("OPENROUTER_API_KEY")

    system_prompt = SYSTEM_PROMPT_BASE
    if context:
        system_prompt += f"\n\nCurrent page/context: {context}"

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    yield f"data: {json.dumps({'type': 'start'})}\n\n"

    accumulated = ""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                OPENROUTER_BASE,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://nama-os.vercel.app",
                    "X-Title": "NAMA OS Copilot",
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": messages,
                    "stream": True,
                    "max_tokens": 1024,
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    raw = line[6:]
                    if raw.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(raw)
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        if delta:
                            accumulated += delta
                            yield f"data: {json.dumps({'type': 'delta', 'content': delta})}\n\n"
                    except (KeyError, json.JSONDecodeError):
                        continue

    except Exception as e:
        logger.error(f"OpenRouter stream error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        return

    # Post-process: detect ACTION_REQUIRED footer
    match = _ACTION_RE.search(accumulated)
    if match:
        try:
            action_payload = json.loads(match.group(1))
            footer_text = match.group(0)
            yield f"data: {json.dumps({'type': 'retract_suffix', 'suffix': footer_text})}\n\n"
            yield f"data: {json.dumps({'type': 'action_required', 'action': action_payload})}\n\n"
        except json.JSONDecodeError:
            logger.warning("Copilot emitted malformed ACTION_REQUIRED JSON")

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def _stream_anthropic(
    message: str,
    history: list,
    context: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream SSE events from Anthropic Claude (fallback)."""
    api_key = os.getenv("ANTHROPIC_API_KEY")

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

        match = _ACTION_RE.search(accumulated)
        if match:
            try:
                action_payload = json.loads(match.group(1))
                footer_text = match.group(0)
                yield f"data: {json.dumps({'type': 'retract_suffix', 'suffix': footer_text})}\n\n"
                yield f"data: {json.dumps({'type': 'action_required', 'action': action_payload})}\n\n"
            except json.JSONDecodeError:
                logger.warning("Copilot emitted malformed ACTION_REQUIRED JSON")

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as e:
        logger.error(f"Copilot stream error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"


async def _stream_copilot_response(
    message: str,
    history: list,
    tenant_id: int,
    context: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Route to OpenRouter or Anthropic based on available API keys."""
    if os.getenv("OPENROUTER_API_KEY"):
        async for event in _stream_openrouter(message, history, context):
            yield event
    elif os.getenv("ANTHROPIC_API_KEY"):
        async for event in _stream_anthropic(message, history, context):
            yield event
    else:
        yield f"data: {json.dumps({'type': 'error', 'content': 'AI not configured — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in Railway'})}\n\n"


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
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if openrouter_key:
        return {"status": "ok", "ai_available": True, "model": OPENROUTER_MODEL, "provider": "openrouter"}
    elif anthropic_key:
        return {"status": "ok", "ai_available": True, "model": "claude-haiku-4-5-20251001", "provider": "anthropic"}
    else:
        return {"status": "degraded", "ai_available": False, "provider": "none"}
