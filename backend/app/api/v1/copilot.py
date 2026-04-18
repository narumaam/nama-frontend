"""
NAMA Copilot — SSE streaming chat with REQUIRES_CONFIRMATION write-action safety (P3-5, P4-14)
Supports OpenRouter (free Llama) and Anthropic (Claude) — prefers OPENROUTER_API_KEY.

Also exposes POST /score-lead — LLM-based lead scoring returning structured JSON.
"""
import json
import logging
import os
import re
from typing import AsyncGenerator, Optional, List, Dict, Any

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


# ─── Lead Scoring ─────────────────────────────────────────────────────────────

class LeadScoreRequest(BaseModel):
    id: int
    full_name: Optional[str] = None
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    travelers_count: Optional[int] = None
    budget_per_person: Optional[float] = None
    currency: Optional[str] = "INR"
    travel_style: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    priority: Optional[int] = None
    triage_confidence: Optional[float] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[str] = None


class SignalItem(BaseModel):
    label: str
    value: str
    positive: bool
    weight: int


class LeadScoreResponse(BaseModel):
    lead_id: int
    probability: int          # 0–100
    temp: str                 # HOT | WARM | COLD
    urgency: str              # e.g. "Contact within 2 hours"
    next_action: str          # e.g. "Send proposal now →"
    reasoning: str            # 2–3 sentence narrative
    signals: List[SignalItem]
    strengths: List[str]
    risks: List[str]
    provider: str             # openrouter | anthropic | heuristic


SCORE_SYSTEM_PROMPT = """You are a travel sales intelligence engine inside NAMA OS, a B2B travel agency CRM.

Your job is to analyze a travel lead and return a JSON scoring object. You must respond with ONLY valid JSON — no explanation, no markdown, no code fences.

JSON schema:
{
  "probability": <integer 0-100, conversion likelihood>,
  "temp": "<HOT|WARM|COLD>",
  "urgency": "<short urgency statement, e.g. 'Contact within 2 hours' or 'Nurture over 1 week'>",
  "next_action": "<single actionable step ending with →>",
  "reasoning": "<2-3 sentences explaining the score>",
  "signals": [
    {"label": "<signal name>", "value": "<observed value>", "positive": <true|false>, "weight": <0-25>}
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "risks": ["<risk 1>", "<risk 2>"]
}

Scoring guidelines:
- HOT = probability >= 70 (strong buying signals, qualified, high budget, advanced pipeline)
- WARM = probability 45–69 (moderate intent, needs nurturing)
- COLD = probability < 45 (exploratory, low budget, early stage)
- Budget signals: >₹150K/pax = very strong; ₹75–150K = strong; ₹25–75K = moderate; <₹25K = weak
- Group size: 6+ pax = large revenue potential; 2–4 = ideal package size
- Pipeline stage: WON/PROPOSAL_SENT > QUALIFIED > CONTACTED > NEW > LOST
- Source quality: PHONE > WHATSAPP > EMAIL > WEBSITE > UNKNOWN
- Travel style: LUXURY/HONEYMOON/WILDLIFE = high margin segments
- Triage confidence from automated parsing: 85%+ = strong signal
- Provide exactly 4-6 signals, 2-4 strengths, 1-3 risks"""


def _build_lead_prompt(lead: LeadScoreRequest) -> str:
    budget_total = (lead.budget_per_person or 0) * (lead.travelers_count or 1)
    currency = lead.currency or "INR"
    budget_str = (
        f"{currency} {lead.budget_per_person:,.0f}/pax (total: {currency} {budget_total:,.0f})"
        if lead.budget_per_person
        else "Not specified"
    )
    priority_str = "High" if lead.priority == 1 else "Medium" if lead.priority == 2 else "Low" if lead.priority else "Unknown"
    return f"""Analyze this travel lead and return a JSON score:

Lead ID: {lead.id}
Name: {lead.full_name or 'Unknown'}
Destination: {lead.destination or 'Not specified'}
Duration: {lead.duration_days or '?'} days
Group size: {lead.travelers_count or '?'} pax
Budget: {budget_str}
Travel style: {lead.travel_style or 'Not specified'}
Pipeline status: {lead.status or 'NEW'}
Lead source: {lead.source or 'Unknown'}
Priority: {priority_str}
AI triage confidence: {lead.triage_confidence or 0}%
Has email: {'Yes' if lead.email else 'No'}
Has phone: {'Yes' if lead.phone else 'No'}
Lead age: {lead.created_at or 'Unknown'}

Return ONLY the JSON scoring object."""


async def _call_openrouter_json(prompt: str) -> Dict[str, Any]:
    """Call OpenRouter and parse the JSON response (non-streaming)."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            OPENROUTER_BASE,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://nama-os.vercel.app",
                "X-Title": "NAMA OS Lead Scoring",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": SCORE_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "max_tokens": 800,
                "temperature": 0.2,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()
        # Strip any accidental markdown fences
        if content.startswith("```"):
            content = re.sub(r"^```[a-z]*\n?", "", content)
            content = re.sub(r"\n?```$", "", content)
        return json.loads(content)


async def _call_anthropic_json(prompt: str) -> Dict[str, Any]:
    """Call Anthropic (non-streaming) and parse the JSON response."""
    import anthropic as ant
    api_key = os.getenv("ANTHROPIC_API_KEY")
    client = ant.AsyncAnthropic(api_key=api_key)
    msg = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=800,
        system=SCORE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    content = msg.content[0].text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[a-z]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    return json.loads(content)


@router.post("/score-lead", response_model=LeadScoreResponse)
async def score_lead(
    request: LeadScoreRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    LLM-based lead scoring. Returns structured JSON with probability, temp,
    urgency, next_action, reasoning, signals, strengths, risks.
    Falls back to heuristic scoring if no AI keys are configured.
    """
    prompt = _build_lead_prompt(request)
    provider = "heuristic"
    result: Dict[str, Any] = {}

    try:
        if os.getenv("OPENROUTER_API_KEY"):
            result = await _call_openrouter_json(prompt)
            provider = "openrouter"
        elif os.getenv("ANTHROPIC_API_KEY"):
            result = await _call_anthropic_json(prompt)
            provider = "anthropic"
        else:
            raise ValueError("No AI provider configured")
    except Exception as e:
        logger.warning(f"LLM scoring failed, using heuristic fallback: {e}")
        # Heuristic fallback
        conf = request.triage_confidence or 0
        budget = request.budget_per_person or 0
        pax = request.travelers_count or 1
        status = request.status or "NEW"
        score = (
            (conf * 0.35)
            + (25 if budget >= 150000 else 18 if budget >= 75000 else 10 if budget >= 25000 else 0)
            + (15 if pax >= 6 else 10 if pax >= 4 else 5)
            + (20 if request.priority == 1 else 10 if request.priority == 2 else 0)
            + (25 if status == "WON" else 18 if status == "PROPOSAL_SENT" else 15 if status == "QUALIFIED" else 8 if status == "CONTACTED" else 3)
        )
        probability = min(97, max(12, int(score * 0.6)))
        temp = "HOT" if probability >= 70 else "WARM" if probability >= 45 else "COLD"
        result = {
            "probability": probability,
            "temp": temp,
            "urgency": "Contact within 2 hours" if temp == "HOT" else "Follow up in 2-3 days" if temp == "WARM" else "Nurture over 1 week",
            "next_action": "Send proposal now →" if temp == "HOT" else "Share destination guide →" if temp == "WARM" else "Add to nurture sequence →",
            "reasoning": f"Heuristic scoring based on {conf}% triage confidence, budget ₹{budget:,.0f}/pax, {pax} pax, status {status}.",
            "signals": [
                {"label": "AI Triage Confidence", "value": f"{conf}%", "positive": conf >= 75, "weight": int(conf * 0.35)},
                {"label": "Budget Signal", "value": f"₹{budget:,.0f}/pax" if budget else "Not specified", "positive": budget >= 50000, "weight": 25 if budget >= 150000 else 18 if budget >= 75000 else 10 if budget >= 25000 else 0},
                {"label": "Pipeline Stage", "value": status.replace("_", " "), "positive": status in ["QUALIFIED", "PROPOSAL_SENT", "WON"], "weight": 25 if status == "WON" else 18 if status == "PROPOSAL_SENT" else 15 if status == "QUALIFIED" else 8},
            ],
            "strengths": ["Lead captured in system"],
            "risks": ["AI scoring unavailable — using heuristics"],
        }

    # Normalise and validate required fields
    probability = max(0, min(100, int(result.get("probability", 50))))
    temp_raw = str(result.get("temp", "WARM")).upper()
    temp = temp_raw if temp_raw in ("HOT", "WARM", "COLD") else "WARM"

    signals = [
        SignalItem(
            label=str(s.get("label", "")),
            value=str(s.get("value", "")),
            positive=bool(s.get("positive", False)),
            weight=max(0, min(25, int(s.get("weight", 0)))),
        )
        for s in result.get("signals", [])
    ]

    return LeadScoreResponse(
        lead_id=request.id,
        probability=probability,
        temp=temp,
        urgency=str(result.get("urgency", "Review lead")),
        next_action=str(result.get("next_action", "Review lead →")),
        reasoning=str(result.get("reasoning", "")),
        signals=signals,
        strengths=[str(s) for s in result.get("strengths", [])],
        risks=[str(r) for r in result.get("risks", [])],
        provider=provider,
    )
