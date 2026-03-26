import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.schemas.communications import Message, MessageChannel, MessageRole, DraftResponse, MessageDraftRequest
from app.agents.prompts.comms_prompts import COMMS_AGENT_SYSTEM_PROMPT, COMMS_AGENT_USER_PROMPT

class CommsAgent:
    """
    NAMA Communication Intelligence Agent.
    Orchestrates unified WhatsApp and Email threads with AI drafting capabilities (M5).
    """
    
    def __init__(self, model: str = "claude-3-5-sonnet-20240620"):
        self.model = model
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    async def draft_message(self, request: MessageDraftRequest, channel: MessageChannel, history: List[Message]) -> DraftResponse:
        """
        Uses Claude 3.5 to draft a context-aware message based on the conversation history.
        """
        # Step 1: Format history for prompt
        history_text = "\n".join([f"{m.role.value}: {m.content}" for m in history[-5:]]) # Last 5 messages
        
        # Prototype: Mocking the draft logic based on simple context
        # In real app, we would call Claude's messages.create endpoint.
        
        mock_drafts = {
            "Follow up on the Dubai quote": {
                "WHATSAPP": "Hi! Just wanted to check if you had a chance to look at the luxury Dubai itinerary we sent over. The Burj Al Arab currently has a 10% early bird offer available for your dates. Would you like to lock it in? 😊",
                "EMAIL": "Dear Traveler,\n\nI hope you're having a wonderful week. I'm following up on the 5-day Dubai itinerary we shared. We've just received a limited-time upgrade offer for the Burj Al Arab for your travel dates.\n\nPlease let us know if you have any questions or would like us to proceed with the booking.\n\nBest regards,\nYour NAMA Specialist"
            },
            "Request passport copy": {
                "WHATSAPP": "Great news! We're ready to proceed with your booking. Could you please share a clear photo of your passport for the flight tickets? You can send it right here. Thanks!",
                "EMAIL": "Subject: Action Required: Passport Copy for Booking\n\nDear Traveler,\n\nTo finalize your flight and hotel bookings, we require a clear copy of your passport (photo page). You can reply to this email or upload it directly to your portal.\n\nThank you,\nNAMA Support"
            }
        }
        
        # Fallback to general draft logic
        suggested = mock_drafts.get(request.context, {}).get(channel.value, f"Hi! I'm following up on your recent request regarding {request.context}. Let me know how we can help.")
        
        return DraftResponse(
            suggested_content=suggested,
            reasoning=f"I drafted this {channel.value} message with a {request.tone} tone, focusing on the context '{request.context}' to drive conversion."
        )

    async def analyze_sentiment(self, content: str) -> str:
        """
        Uses AI to detect the sentiment of a client message (Positive, Neutral, Urgent, Frustrated).
        """
        # Prototype: Basic sentiment logic
        lower_content = content.lower()
        if any(word in lower_content for word in ["urgent", "asap", "quickly", "waiting"]):
            return "URGENT"
        if any(word in lower_content for word in ["bad", "not happy", "disappointed", "slow"]):
            return "FRUSTRATED"
        if any(word in lower_content for word in ["thanks", "great", "love it", "awesome"]):
            return "POSITIVE"
        return "NEUTRAL"
