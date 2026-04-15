import json
from sqlalchemy.orm import Session

from app.schemas.communications import DraftResponse
from app.core.ai_budget import call_agent_with_controls

AGENT_NAME = "communications"
MODEL = "claude-sonnet-4-6"


class CommsAgent:
    """
    NAMA Communication Intelligence Agent.
    Drafts warm, personalized WhatsApp/email messages using Claude AI.
    All calls go through call_agent_with_controls() for cost control.
    """

    async def draft_message(
        self,
        context: str,
        lead_data: dict,
        tenant_id: int,
        db: Session,
    ) -> DraftResponse:
        """
        Draft a personalized message for a lead.

        Args:
            context: Message context (e.g., "follow_up", "quote_sent", "payment_reminder")
            lead_data: Dict with lead info (name, destination, dates, budget, etc.)
            tenant_id: Current tenant (from JWT)
            db: Database session for usage logging

        Returns:
            DraftResponse with multiple channel options and reasoning
        """
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(context, lead_data)

        result = await call_agent_with_controls(
            db=db,
            tenant_id=tenant_id,
            agent_name=AGENT_NAME,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=MODEL,
            max_tokens=2048,
            fallback_response=None,
        )

        # Handle fallback
        if result["from_fallback"]:
            return self._fallback_drafts(context, lead_data)

        # Parse response
        try:
            parsed = self._parse_response(result["content"], context)
        except Exception as parse_err:
            return self._fallback_drafts(context, lead_data, reason=str(parse_err))

        return parsed

    def _build_system_prompt(self) -> str:
        """Build the system prompt for Claude."""
        return """You are a professional travel consultant's AI assistant.
Your role is to draft warm, personalized messages for travel companies.
Be concise, friendly, professional, and sales-focused.

IMPORTANT: You MUST respond ONLY with valid JSON. No markdown, no extra text.

Response format:
{
  "drafts": [
    {
      "channel": "WHATSAPP" or "EMAIL",
      "subject": null for WHATSAPP, string for EMAIL,
      "body": "the actual message content"
    }
  ],
  "reasoning": "explanation of why these drafts work for this context"
}
"""

    def _build_user_prompt(self, context: str, lead_data: dict) -> str:
        """Build the user prompt for Claude."""
        lead_name = lead_data.get("name", "Valued Customer")
        destination = lead_data.get("destination", "the destination")
        dates = lead_data.get("travel_dates", "your travel dates")
        budget = lead_data.get("budget_range", "your budget")

        context_map = {
            "follow_up": f"Following up on {lead_name}'s {destination} inquiry from {dates}",
            "quote_sent": f"Confirming that {lead_name} received the quote for {destination}",
            "payment_reminder": f"Gentle payment reminder for {lead_name}'s {destination} booking",
            "itinerary_ready": f"Sharing the itinerary with {lead_name} for {destination}",
            "booking_confirmation": f"Confirming booking details for {lead_name}'s {destination} trip",
        }

        context_desc = context_map.get(
            context, f"Contacting {lead_name} regarding their {destination} inquiry"
        )

        return f"""Draft 2 professional messages for a travel company:

Context: {context_desc}
Lead Name: {lead_name}
Destination: {destination}
Travel Dates: {dates}
Budget: {budget}

Create one WHATSAPP message (casual, warm, ~2-3 sentences) and one EMAIL (professional, complete, with subject line).
The messages should be personalized, specific to the lead's trip, and include a clear next step or call-to-action.
Avoid generic templates."""

    def _parse_response(self, raw_content: str, context: str) -> DraftResponse:
        """Parse Claude's JSON response."""
        cleaned = raw_content.strip()

        # Remove markdown code blocks
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            start_idx = 0
            end_idx = len(lines)
            for i, line in enumerate(lines):
                if i == 0 and "json" in line:
                    start_idx = i + 1
                elif i == 0 and line.startswith("```"):
                    start_idx = i + 1
                elif line.strip() == "```":
                    end_idx = i
                    break
            cleaned = "\n".join(lines[start_idx:end_idx])

        data = json.loads(cleaned)

        # Combine drafts into suggested_content
        drafts = data.get("drafts", [])
        suggested = "\n\n".join(
            [
                f"**{d['channel']}**\n{d.get('subject', '')}\n{d['body']}"
                if d.get("subject")
                else f"**{d['channel']}**\n{d['body']}"
                for d in drafts
            ]
        )

        return DraftResponse(
            suggested_content=suggested,
            reasoning=data.get(
                "reasoning",
                f"Generated messages for {context} context.",
            ),
        )

    def _fallback_drafts(
        self, context: str, lead_data: dict, reason: str = ""
    ) -> DraftResponse:
        """Return fallback drafts when AI is unavailable."""
        lead_name = lead_data.get("name", "Valued Customer")
        destination = lead_data.get("destination", "the destination")

        fallback_body = (
            f"Hi {lead_name}! Thank you for your interest in traveling to {destination}. "
            "We'd love to help plan your perfect trip. Please let us know your availability, "
            "and we'll send over some exciting itinerary options. Looking forward to helping you!"
        )

        return DraftResponse(
            suggested_content=f"**WHATSAPP**\n{fallback_body}\n\n**EMAIL**\nSubject: Your {destination} Adventure Awaits\n\nDear {lead_name},\n\nThank you for considering us for your travel needs. "
            f"We're excited to help you plan an unforgettable trip to {destination}.\n\nPlease reply with your preferred travel dates and any specific preferences, "
            "and we'll craft the perfect itinerary for you.\n\nBest regards,\nYour NAMA Team",
            reasoning=f"Fallback message (AI service unavailable). {reason}" if reason else "AI service temporarily unavailable",
        )
