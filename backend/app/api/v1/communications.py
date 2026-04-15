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
