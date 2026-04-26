from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.communications import Message, CommunicationThread, DraftResponse, MessageDraftRequest, MessageChannel, MessageRole, ThreadStatus
from app.agents.comms import CommsAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from app.models.leads import Lead, LeadStatus
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone

router = APIRouter()
comms_agent = CommsAgent()


# Map a lead's source enum to the comms channel enum.
# Anything we don't recognise lands in IN_APP so the thread still renders.
def _source_to_channel(source: Optional[str]) -> MessageChannel:
    s = (source or "").upper()
    if "WHATSAPP" in s or s == "WA":
        return MessageChannel.WHATSAPP
    if "EMAIL" in s or "MAIL" in s or "GMAIL" in s or "OUTLOOK" in s:
        return MessageChannel.EMAIL
    return MessageChannel.IN_APP


# Map a lead's CRM status to the thread status surface.
# WON/LOST → ARCHIVED; CONTACTED/QUALIFIED waiting on lead → PENDING_REPLY; else ACTIVE.
def _lead_to_thread_status(status: Optional[str]) -> ThreadStatus:
    s = (status or "").upper()
    if s in ("WON", "LOST", "CLOSED"):
        return ThreadStatus.ARCHIVED
    if s in ("CONTACTED", "PROPOSAL_SENT", "QUALIFIED"):
        return ThreadStatus.PENDING_REPLY
    return ThreadStatus.ACTIVE


def _build_thread_from_lead(lead: Lead) -> CommunicationThread:
    """
    Build a CommunicationThread view from a single Lead row.

    Each thread bundles:
      - The lead's initial enquiry (CLIENT message, derived from suggested_reply
        or the first note we have, falling back to a synthetic intro).
      - All saved notes (AGENT messages by default, parsed from lead.notes).

    This is a read-only projection — there is no ConversationMessage table yet.
    Real two-way persistence will land when the WhatsApp / IMAP webhooks start
    writing to a dedicated message store.
    """
    from app.api.v1.leads import _parse_notes

    channel = _source_to_channel(getattr(lead, "source", None))
    notes = _parse_notes(getattr(lead, "notes", None))

    messages: List[Message] = []
    thread_id = lead.id

    # 1. Synthetic intro from the lead row itself — gives every thread a CLIENT
    #    opener so the chat UI has something to render. Falls back gracefully
    #    if the lead has no destination / suggested_reply.
    intro_text = (getattr(lead, "suggested_reply", None) or "").strip()
    if not intro_text:
        dest = getattr(lead, "destination", None) or "their travel plans"
        intro_text = f"New enquiry about {dest}."
    messages.append(Message(
        thread_id=thread_id,
        channel=channel,
        role=MessageRole.CLIENT,
        content=intro_text,
        timestamp=lead.created_at if getattr(lead, "created_at", None) else datetime.now(timezone.utc),
    ))

    # 2. Notes become AGENT messages in the thread, in chronological order.
    for n in reversed(notes):  # _parse_notes returns newest-first; chat wants oldest-first
        try:
            ts = datetime.fromisoformat(n.created_at.replace("Z", "+00:00")) if n.created_at else datetime.now(timezone.utc)
        except Exception:
            ts = datetime.now(timezone.utc)
        messages.append(Message(
            thread_id=thread_id,
            channel=channel,
            role=MessageRole.AGENT,
            content=n.content,
            timestamp=ts,
        ))

    last_at = max(m.timestamp for m in messages) if messages else (lead.updated_at or lead.created_at or datetime.now(timezone.utc))

    return CommunicationThread(
        id=thread_id,
        lead_id=lead.id,
        tenant_id=lead.tenant_id,
        status=_lead_to_thread_status(getattr(lead, "status", None)),
        last_message_at=last_at,
        messages=messages,
    )


@router.get("/threads", response_model=List[CommunicationThread])
def get_active_threads(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    include_archived: bool = False,
):
    """
    Real communication threads for the current tenant (Tier 6A).

    Each thread is derived from a Lead row + its parsed notes. Returns the
    most recently updated leads first, capped at `limit` (default 50).

    Set `include_archived=true` to surface WON/LOST leads as well.
    """
    q = db.query(Lead).filter(Lead.tenant_id == current_user.tenant_id)
    if not include_archived:
        q = q.filter(Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST])) if hasattr(LeadStatus, "WON") else q
    leads = q.order_by(Lead.updated_at.desc().nullslast(), Lead.created_at.desc()).limit(limit).all()
    return [_build_thread_from_lead(l) for l in leads]


@router.get("/threads/{thread_id}", response_model=CommunicationThread)
def get_thread(
    thread_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Single-thread fetch. thread_id is the lead_id.
    Returns 404 if the lead doesn't exist or belongs to another tenant.
    """
    lead = db.query(Lead).filter(
        Lead.id == thread_id,
        Lead.tenant_id == current_user.tenant_id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Thread not found")
    return _build_thread_from_lead(lead)

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

    Tier 6A: real persistence. The outbound message is appended to the
    underlying lead's notes column so it shows up in the thread on next
    fetch. Channel-side delivery (WhatsApp Cloud API, Resend, etc.) still
    requires customer-supplied creds — the function will short-circuit to
    "stored only" when those env vars aren't set.
    """
    from app.api.v1.leads import _NOTE_PREFIX, _NOTE_SEP

    message.timestamp = datetime.now(timezone.utc)
    message.role = MessageRole.AGENT

    lead = db.query(Lead).filter(
        Lead.id == message.thread_id,
        Lead.tenant_id == current_user.tenant_id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Persist outbound message as a structured note so it appears in the
    # thread on next /threads/{id} fetch. Same format as POST /leads/{id}/notes.
    now_iso = message.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    author = (current_user.email if hasattr(current_user, "email") else None) or "Agent"
    new_entry = f"{_NOTE_PREFIX} {now_iso} | {author} | {message.content}"
    existing = (lead.notes or "").strip()
    lead.notes = f"{existing}{_NOTE_SEP}{new_entry}" if existing else new_entry
    lead.updated_at = datetime.now(timezone.utc)
    db.commit()

    # TODO Tier 7+: actual channel delivery —
    #   if message.channel == WHATSAPP and WHATSAPP_TOKEN set: POST to Meta Cloud API
    #   if message.channel == EMAIL    and SMTP configured:   send via TenantEmailConfig
    # For now we record and return; UI sees the message in the next thread fetch.

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
