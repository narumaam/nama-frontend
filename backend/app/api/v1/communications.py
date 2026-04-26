from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.communications import Message, CommunicationThread, DraftResponse, MessageDraftRequest, MessageChannel, MessageRole, ThreadStatus
from app.agents.comms import CommsAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from app.models.leads import Lead, LeadStatus
from app.models.conversation_messages import (
    ConversationMessage, MessageDirection, MessageDeliveryStatus,
)
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


def _build_thread_from_lead(lead: Lead, db: Optional[Session] = None) -> CommunicationThread:
    """
    Build a CommunicationThread view from a single Lead row.

    Reads from two sources, in priority order:
      1. ConversationMessage rows for this lead — durable inbound/outbound
         records from webhooks + /send (Tier 7A onward).
      2. Lead notes — legacy projection from Tier 6A. Used for back-compat
         so historical leads with notes-only history still render.

    Each thread also gets a synthetic intro CLIENT message derived from the
    lead's suggested_reply / destination so the chat UI always has an opener.
    """
    from app.api.v1.leads import _parse_notes

    channel = _source_to_channel(getattr(lead, "source", None))
    notes = _parse_notes(getattr(lead, "notes", None))

    messages: List[Message] = []
    thread_id = lead.id

    # 1. Synthetic intro from the lead row itself.
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

    # 2. Legacy notes (Tier 6A path) — render in chronological order.
    for n in reversed(notes):
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

    # 3. Tier 7A: pull real persisted ConversationMessage rows on top of the
    #    legacy projection. Inbound rows come back as CLIENT, outbound as AGENT.
    #    Wrapped in try/except so a missing/empty conversation_messages table
    #    (e.g. before the migration runs) silently degrades to the legacy view.
    if db is not None:
        try:
            cm_rows = (
                db.query(ConversationMessage)
                .filter(
                    ConversationMessage.tenant_id == lead.tenant_id,
                    ConversationMessage.lead_id == lead.id,
                )
                .order_by(ConversationMessage.created_at.asc())
                .all()
            )
            for cm in cm_rows:
                try:
                    cm_channel = MessageChannel(cm.channel)
                except ValueError:
                    cm_channel = MessageChannel.IN_APP
                role = MessageRole.CLIENT if cm.direction == MessageDirection.INBOUND.value else MessageRole.AGENT
                messages.append(Message(
                    thread_id=thread_id,
                    channel=cm_channel,
                    role=role,
                    content=cm.content or "",
                    timestamp=cm.created_at or datetime.now(timezone.utc),
                ))
        except Exception:
            # Table may not exist yet (pre-migration) or DB hiccup — ignore.
            pass

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
    return [_build_thread_from_lead(l, db=db) for l in leads]


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
    return _build_thread_from_lead(lead, db=db)

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

async def _deliver_via_whatsapp(content: str, peer_phone: Optional[str]) -> tuple[bool, Optional[str], Optional[str]]:
    """
    Deliver a text message via WhatsApp Cloud API. Returns (success, external_id, error).
    Falls back to (False, None, "no creds") when WHATSAPP_TOKEN / WHATSAPP_PHONE_ID
    aren't set so the caller can store the message as QUEUED rather than fail.
    """
    import os as _os
    import httpx as _httpx
    token = _os.getenv("WHATSAPP_TOKEN", "")
    phone_id = _os.getenv("WHATSAPP_PHONE_ID", "")
    if not token or not phone_id or not peer_phone:
        return False, None, "WhatsApp credentials not configured"
    to = peer_phone.replace("+", "").replace(" ", "").replace("-", "")
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": content[:4000]},  # Meta caps at 4096 chars
    }
    try:
        async with _httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://graph.facebook.com/v19.0/{phone_id}/messages",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=10.0,
            )
            data = resp.json()
            if resp.status_code == 200:
                wamid = (data.get("messages") or [{}])[0].get("id")
                return True, wamid, None
            err = (data.get("error", {}) or {}).get("message") or "WhatsApp send failed"
            return False, None, err
    except Exception as exc:
        return False, None, str(exc)


def _deliver_via_smtp(db: Session, tenant_id: int, to_email: Optional[str], subject: str, body: str) -> tuple[bool, Optional[str], Optional[str]]:
    """
    Deliver an email via the tenant's SMTP config. Returns (success, message_id, error).
    Falls back gracefully when no TenantEmailConfig is set up.
    """
    if not to_email:
        return False, None, "No recipient email"
    try:
        from app.models.email_config import TenantEmailConfig
        from app.core.email_service import send_via_smtp
        cfg = db.query(TenantEmailConfig).filter(TenantEmailConfig.tenant_id == tenant_id).first()
        if not cfg or not cfg.smtp_host:
            return False, None, "SMTP not configured"
        # send_via_smtp returns {sent, message_id, error}. Treat the body text
        # as both HTML (will render in email clients) and plaintext.
        result = send_via_smtp(cfg, to_email, subject, body, text=body)
        if isinstance(result, dict) and result.get("sent"):
            return True, result.get("message_id") or None, None
        err = (result.get("error") if isinstance(result, dict) else None) or "SMTP send failed"
        return False, None, err
    except Exception as exc:
        return False, None, str(exc)


@router.post("/send", response_model=Message)
async def send_message(
    message: Message,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message through the unified communication channel.

    Tier 7C: real channel delivery. When the lead has a phone number and
    WHATSAPP_TOKEN is set, fires the message via Meta Cloud API. When the
    tenant has an EMAIL channel + SMTP configured, sends via SMTP. Always
    persists to ConversationMessage with the resulting status (SENT / FAILED
    / QUEUED), regardless of delivery success — so the message shows up in
    the thread either way and the agent can retry from the UI.
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

    # 1. Append to legacy notes for back-compat with the Tier 6A view.
    now_iso = message.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    author = (current_user.email if hasattr(current_user, "email") else None) or "Agent"
    new_entry = f"{_NOTE_PREFIX} {now_iso} | {author} | {message.content}"
    existing = (lead.notes or "").strip()
    lead.notes = f"{existing}{_NOTE_SEP}{new_entry}" if existing else new_entry
    lead.updated_at = datetime.now(timezone.utc)

    # 2. Tier 7C: actual channel delivery.
    delivery_status = MessageDeliveryStatus.QUEUED
    external_id: Optional[str] = None
    error_message: Optional[str] = None

    if message.channel == MessageChannel.WHATSAPP:
        ok, ext_id, err = await _deliver_via_whatsapp(message.content, getattr(lead, "phone", None))
        delivery_status = MessageDeliveryStatus.SENT if ok else MessageDeliveryStatus.FAILED
        external_id = ext_id
        error_message = err if not ok else None
    elif message.channel == MessageChannel.EMAIL:
        subject = f"Re: {getattr(lead, 'destination', None) or 'your enquiry'}"
        ok, ext_id, err = _deliver_via_smtp(db, current_user.tenant_id, getattr(lead, "email", None), subject, message.content)
        delivery_status = MessageDeliveryStatus.SENT if ok else MessageDeliveryStatus.FAILED
        external_id = ext_id
        error_message = err if not ok else None
    else:
        # IN_APP — no external delivery, just persist.
        delivery_status = MessageDeliveryStatus.NONE

    # 3. Persist as ConversationMessage so /threads renders it on next fetch.
    try:
        cm = ConversationMessage(
            tenant_id=current_user.tenant_id,
            lead_id=lead.id,
            channel=message.channel.value if hasattr(message.channel, "value") else str(message.channel),
            direction=MessageDirection.OUTBOUND.value,
            status=delivery_status.value,
            content=message.content or "",
            external_id=external_id,
            peer_address=(getattr(lead, "phone", None) if message.channel == MessageChannel.WHATSAPP else getattr(lead, "email", None)),
            author_name=author,
            error_message=error_message,
        )
        db.add(cm)
    except Exception:
        # Best-effort — the legacy notes append above is still committed below.
        pass
    db.commit()

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
