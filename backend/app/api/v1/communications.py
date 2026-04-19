from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.communications import Message, CommunicationThread, DraftResponse, MessageDraftRequest, MessageChannel, MessageRole, ThreadStatus
from app.agents.comms import CommsAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from typing import List, Dict, Any
from datetime import datetime, timedelta

router = APIRouter()
comms_agent = CommsAgent()

@router.get("/threads", response_model=List[CommunicationThread])
def get_active_threads(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active communication threads for the organization (M5).
    """
    # Mocking threads for prototype
    return [
        CommunicationThread(
            id=101,
            lead_id=1,
            tenant_id=current_user.tenant_id,
            status=ThreadStatus.ACTIVE,
            last_message_at=datetime.utcnow() - timedelta(minutes=15),
            messages=[
                Message(thread_id=101, channel=MessageChannel.WHATSAPP, role=MessageRole.CLIENT, content="Hi NAMA! My husband and I are planning a 5-day luxury trip to Dubai. We love fine dining and desert adventures.")
            ]
        )
    ]

@router.post("/draft", response_model=DraftResponse)
async def draft_communication(
    context: str,
    lead_name: str,
    destination: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI-powered draft for a communication thread (M5).

    Args:
        context: Message context (e.g., "follow_up", "quote_sent", "payment_reminder")
        lead_name: Name of the lead
        destination: Travel destination
    """
    try:
        # Build lead_data from parameters
        lead_data = {
            "name": lead_name,
            "destination": destination,
            "travel_dates": "flexible",  # Could be passed as param
            "budget_range": "flexible",  # Could be passed as param
        }

        # AI-powered drafting via Claude
        draft = await comms_agent.draft_message(
            context=context,
            lead_data=lead_data,
            tenant_id=current_user.tenant_id,
            db=db,
        )

        return draft
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send", response_model=Message)
async def send_message(
    message: Message,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message through the unified communication channel (M5).
    This would trigger WhatsApp/Email APIs in a real app.
    """
    # Prototype: Logic to record and 'send' the message
    message.timestamp = datetime.utcnow()
    message.role = MessageRole.AGENT
    
    # Analyze sentiment for inbound client messages (to demo AI capability)
    # (Simplified for the 'send' agent logic)
    
    return message


# ── P3-1: SSE streaming AI draft (comms/drafts/stream) ────────────────────────
import json as _json
import os as _os
import asyncio as _asyncio
from fastapi import Query as _Query
from fastapi.responses import StreamingResponse as _SR
from app.api.v1.deps import require_tenant
from app.models.leads import Lead as _Lead  # type: ignore
import logging as _logging

_log = _logging.getLogger(__name__)

_TONE_INSTRUCTIONS = {
    "professional": "Write a professional, concise message of 2–3 sentences. Use formal but warm language.",
    "friendly":     "Write a warm, friendly and conversational message. Mention their destination by name. Keep it brief.",
    "urgent":       "Write a concise, action-oriented message that prompts the lead to respond today. One paragraph max.",
    "formal":       "Write a formal, polished message suitable for corporate or MICE clients. Structured and complete.",
}

_CONTEXT_PROMPTS = {
    "follow_up":          "You are following up on an enquiry the lead made. Ask if they have questions and mention you have a curated plan ready.",
    "quote_sent":         "You have just sent a quotation. Inform the lead and invite them to review and accept.",
    "payment_reminder":   "Remind the lead about an upcoming payment due date in a polite but firm way.",
    "booking_confirmed":  "Congratulate the lead — their booking is confirmed. Provide key details and next steps.",
    "itinerary_ready":    "Inform the lead that their personalized itinerary is ready and invite them to review it.",
    "pre_trip":           "Send a pre-trip check-in 7 days before departure. Confirm details and offer any help.",
    "post_trip":          "Send a warm post-trip follow-up. Thank them, ask for a review, and tease next trip ideas.",
    "custom":             "Use the custom context provided by the agent.",
}


async def _stream_comms_draft(
    lead_name: str,
    destination: str,
    context: str,
    tone: str,
    channel: str,
    custom_context: str,
    tenant_id: int,
):
    """Inner async generator that streams SSE events."""
    tone_inst    = _TONE_INSTRUCTIONS.get(tone, _TONE_INSTRUCTIONS["professional"])
    context_inst = _CONTEXT_PROMPTS.get(context, context)
    if context == "custom" and custom_context:
        context_inst = f"Custom context: {custom_context}"

    max_tokens = 200 if channel == "whatsapp" else 500
    system = (
        f"You are NAMA Copilot, an AI assistant for a travel agency.\n"
        f"{tone_inst}\n"
        f"Channel: {channel.upper()} — {'keep under 200 characters, no markdown' if channel == 'whatsapp' else 'structured email format is fine'}.\n"
        f"Do not start with 'Dear' or 'Hi [Name]' — the agent will personalise that."
    )
    user_prompt = (
        f"Lead: {lead_name}\nDestination: {destination}\n"
        f"Context: {context_inst}\n"
        f"Write a {tone} {channel} message draft now."
    )

    api_key = _os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        # No API key — yield a demo draft
        demo = f"Hi {lead_name}! Following up on your {destination} enquiry — I've put together a curated plan within your budget. Shall I share the details?"
        for chunk in demo.split(" "):
            yield f"data: {_json.dumps({'type': 'delta', 'content': chunk + ' '})}\n\n"
            await _asyncio.sleep(0.04)
        yield f"data: {_json.dumps({'type': 'done'})}\n\n"
        return

    try:
        from app.core.ai_client import get_async_ai_client
        client = get_async_ai_client(api_key=api_key)
        async with client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            yield f"data: {_json.dumps({'type': 'start'})}\n\n"
            async for text in stream.text_stream:
                yield f"data: {_json.dumps({'type': 'delta', 'content': text})}\n\n"
            yield f"data: {_json.dumps({'type': 'done'})}\n\n"
    except Exception as exc:
        _log.warning(f"Comms draft streaming error: {exc}")
        yield f"data: {_json.dumps({'type': 'error', 'content': str(exc)})}\n\n"


@router.post(
    "/drafts/stream",
    summary="Stream an AI-drafted message (P3-1)",
    response_class=_SR,
)
async def stream_comms_draft(
    lead_name:      str = _Query(..., description="Lead's name"),
    destination:    str = _Query(..., description="Travel destination"),
    context:        str = _Query("follow_up", description="Message context"),
    tone:           str = _Query("friendly",  description="Tone: professional|friendly|urgent|formal"),
    channel:        str = _Query("whatsapp",  description="Channel: whatsapp|email"),
    custom_context: str = _Query("",          description="Custom context text (if context=custom)"),
    tenant_id:      int = Depends(require_tenant),
    _:              dict = Depends(get_current_user),
):
    """
    P3-1: Stream a tone-aware AI draft for a comms message via SSE.
    Supports WhatsApp (short) and email (structured) channels.
    """
    return _SR(
        _stream_comms_draft(
            lead_name, destination, context, tone, channel, custom_context, tenant_id
        ),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control":     "no-cache",
        },
    )
