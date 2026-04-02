from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.communications import Message, CommunicationThread, DraftResponse, MessageDraftRequest, MessageChannel, MessageRole, ThreadStatus
from app.agents.comms import CommsAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from app.demo_data import get_demo_case, get_demo_case_by_thread_id, list_demo_cases
from typing import List, Dict, Any
from datetime import datetime, timedelta

router = APIRouter()
comms_agent = CommsAgent()


def _resolve_demo_case(thread_id: int, tenant_id: int):
    return (
        get_demo_case_by_thread_id(thread_id)
        or get_demo_case_by_thread_id(tenant_id)
        or get_demo_case(slug="maldives-honeymoon")
    )

@router.get("/threads", response_model=List[CommunicationThread])
def get_active_threads(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active communication threads for the organization (M5).
    """
    demo_cases = list_demo_cases()
    if demo_cases:
        return [
            CommunicationThread(
                id=case["lead_id"],
                lead_id=case["lead_id"],
                tenant_id=current_user.tenant_id,
                status=ThreadStatus.PENDING_REPLY if case["priority"] == "CRITICAL" else ThreadStatus.ACTIVE,
                last_message_at=datetime.utcnow() - timedelta(minutes=8 + index * 7),
                messages=[
                    Message(
                        thread_id=case["lead_id"],
                        channel=MessageChannel[case["communications"]["channel"]],
                        role=MessageRole.CLIENT,
                        content=case["query"],
                        metadata={"destination": case["triage"]["destination"], "style": case["triage"]["style"], "case": case["slug"]},
                    ),
                    Message(
                        thread_id=case["lead_id"],
                        channel=MessageChannel[case["communications"]["channel"]],
                        role=MessageRole.AGENT,
                        content=case["communications"]["suggested_follow_up"],
                        metadata={"status": "DEMO_READY", "case": case["slug"]},
                    ),
                ]
            )
            for index, case in enumerate(demo_cases)
        ]

    return []

@router.post("/draft", response_model=DraftResponse)
async def draft_communication(
    request: MessageDraftRequest,
    channel: MessageChannel,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI-powered draft for a communication thread (M5).
    """
    try:
        demo_case = _resolve_demo_case(request.thread_id, current_user.tenant_id)
        if demo_case:
            comms = demo_case["communications"]
            content = comms["suggested_follow_up"]
            if channel == MessageChannel.EMAIL:
                content = (
                    f"Subject: {demo_case['triage']['destination']} itinerary ready\n\n"
                    f"{comms['suggested_follow_up']}\n\n"
                    f"Trip value: ₹{demo_case['finance']['quote_total']:,.0f}"
                )
            return DraftResponse(
                suggested_content=content,
                reasoning=f"Used demo case '{demo_case['slug']}' to generate a deterministic {channel.value} follow-up for Monday demo."
            )

        # 1. Fetch history for the thread (Mocked)
        mock_history = [
            Message(thread_id=request.thread_id, channel=channel, role=MessageRole.CLIENT, content="Hi, checking in on my Dubai quote.")
        ]
        
        # 2. AI-powered drafting
        draft = await comms_agent.draft_message(request, channel, mock_history)
        
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
    demo_case = _resolve_demo_case(message.thread_id, current_user.tenant_id)
    if demo_case:
        message.timestamp = datetime.utcnow()
        message.role = MessageRole.AGENT
        message.metadata = {
            **(message.metadata or {}),
            "delivery": "DEMO_SENT",
            "channel_mode": "deterministic-demo",
            "case": demo_case["slug"],
        }
        return message

    # Prototype: Logic to record and 'send' the message
    message.timestamp = datetime.utcnow()
    message.role = MessageRole.AGENT
    
    # Analyze sentiment for inbound client messages (to demo AI capability)
    # (Simplified for the 'send' agent logic)
    
    return message


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "COMMUNICATIONS"}
