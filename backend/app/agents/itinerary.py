import json
from typing import Optional
from sqlalchemy.orm import Session

from app.schemas.itinerary import (
    ItineraryCreateRequest, ItineraryResponse, ItineraryDay,
    ItineraryBlock, BlockType, SocialMediaPost
)
from app.core.ai_budget import call_agent_with_controls

AGENT_NAME = "itinerary_generation"
MODEL = "claude-sonnet-4-6"


class ItineraryAgent:
    """
    NAMA Itinerary Intelligence Agent.
    Generates day-by-day travel itineraries using Claude AI via call_agent_with_controls().
    All calls enforce budget controls, circuit breaking, and kill-switch enforcement.
    """

    async def generate_itinerary(
        self,
        request: ItineraryCreateRequest,
        tenant_id: int,
        db: Session,
    ) -> ItineraryResponse:
        """
        Main entry point for generating a new itinerary via AI.

        Args:
            request: ItineraryCreateRequest with destination, duration, budget, preferences, etc.
            tenant_id: Current tenant (from JWT) for budget enforcement.
            db: Database session for usage logging.

        Returns:
            ItineraryResponse with title, days, total_price, social_post, and agent_reasoning.
        """

        # Build system prompt
        system_prompt = self._build_system_prompt(request)

        # Build user prompt
        user_prompt = self._build_user_prompt(request)

        # Call Claude via call_agent_with_controls (HS-4 enforced)
        result = await call_agent_with_controls(
            db=db,
            tenant_id=tenant_id,
            agent_name=AGENT_NAME,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=MODEL,
            max_tokens=4096,
            fallback_response=None,
        )

        # If fallback (circuit open, budget exceeded, etc.), return graceful fallback
        if result["from_fallback"]:
            return self._fallback_itinerary(request)

        # Parse Claude's JSON response
        try:
            parsed = self._parse_response(result["content"], request)
        except Exception as parse_err:
            # If parse fails, return fallback
            return self._fallback_itinerary(request, reason=str(parse_err))

        return parsed

    def _build_system_prompt(self, request: ItineraryCreateRequest) -> str:
        """Build the system prompt for Claude."""
        return f"""You are the NAMA Itinerary Intelligence Agent, a core component of an AI-native travel operating system.
Your goal is to generate high-conversion, logistically sound, and narrative-driven travel itineraries.

### CONTEXT
- Destination: {request.destination}
- Duration: {request.duration_days} days
- Budget Style: {request.style}
- Traveler Count: {request.traveler_count}
- Preferences: {', '.join(request.preferences) if request.preferences else 'Not specified'}
- Travel Dates: {request.travel_dates or 'Not specified'}
- Budget Range: {request.budget_range or 'Not specified'}

### OUTPUT REQUIREMENTS
You MUST respond ONLY with valid JSON (no markdown, no extra text). The JSON structure must match:
{{
  "title": "string",
  "total_price": number,
  "currency": "INR",
  "agent_reasoning": "string",
  "days": [
    {{
      "day_number": number,
      "title": "string",
      "narrative": "string",
      "blocks": [
        {{
          "type": "FLIGHT|HOTEL|TRANSFER|ACTIVITY|MEAL",
          "title": "string",
          "description": "string",
          "time_start": "HH:MM" (optional),
          "cost_net": number,
          "price_gross": number,
          "currency": "INR"
        }}
      ]
    }}
  ],
  "social_post": {{
    "caption": "string",
    "hooks": ["string", "string", "string"],
    "image_suggestions": ["string", "string", "string"]
  }}
}}

### GUIDELINES
1. Generate a logically coherent day-by-day itinerary.
2. Each day should include a mix of hotel, transfer, activity, and meal blocks.
3. Ensure blocks are chronologically sensible (times and locations).
4. Calculate realistic costs: cost_net is supplier cost, price_gross is markup (typically 1.25x-1.3x).
5. total_price = sum of all price_gross across all days.
6. Narratives should be engaging, storytelling-driven, highlighting unique destination value.
7. Social post caption should be professional yet exciting, with a clear CTA.
8. Agent reasoning should explain why this itinerary fits the traveler's preferences."""

    def _build_user_prompt(self, request: ItineraryCreateRequest) -> str:
        """Build the user prompt for Claude."""
        prefs = ", ".join(request.preferences) if request.preferences else "general travel"
        return f"""Generate a {request.duration_days}-day {request.style.lower()} itinerary for {request.destination}.

Traveler Profile:
- Group size: {request.traveler_count} person(s)
- Interests: {prefs}
- Travel style: {request.style}
- Budget: {request.budget_range or 'flexible'}
- Travel dates: {request.travel_dates or 'flexible'}

Please create a complete itinerary with realistic costs, engaging narratives, and social media content."""

    def _parse_response(self, raw_content: str, request: ItineraryCreateRequest) -> ItineraryResponse:
        """
        Parse Claude's JSON response into ItineraryResponse.
        Handles markdown code blocks and JSON parsing.
        """
        cleaned = raw_content.strip()

        # Remove markdown code blocks if present
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Find content between ``` markers
            start_idx = 0
            end_idx = len(lines)
            for i, line in enumerate(lines):
                if i == 0 and line.startswith("```json"):
                    start_idx = i + 1
                elif i == 0 and line.startswith("```"):
                    start_idx = i + 1
                elif line.strip() == "```":
                    end_idx = i
                    break
            cleaned = "\n".join(lines[start_idx:end_idx])

        # Parse JSON
        data = json.loads(cleaned)

        # Extract and construct response
        days = []
        for day_data in data.get("days", []):
            blocks = []
            for block_data in day_data.get("blocks", []):
                block = ItineraryBlock(
                    type=BlockType[block_data.get("type", "ACTIVITY").upper()],
                    title=block_data.get("title", ""),
                    description=block_data.get("description", ""),
                    time_start=block_data.get("time_start"),
                    time_end=block_data.get("time_end"),
                    cost_net=float(block_data.get("cost_net", 0)),
                    price_gross=float(block_data.get("price_gross", 0)),
                    currency=block_data.get("currency", "INR"),
                    vendor_id=block_data.get("vendor_id"),
                    meta=block_data.get("meta", {}),
                )
                blocks.append(block)

            day = ItineraryDay(
                day_number=int(day_data.get("day_number", 0)),
                title=day_data.get("title", ""),
                narrative=day_data.get("narrative", ""),
                blocks=blocks,
            )
            days.append(day)

        # Extract social post
        social_data = data.get("social_post", {})
        social_post = SocialMediaPost(
            caption=social_data.get("caption", ""),
            hooks=social_data.get("hooks", []),
            image_suggestions=social_data.get("image_suggestions", []),
        ) if social_data else None

        return ItineraryResponse(
            title=data.get("title", f"Trip to {request.destination}"),
            days=days,
            total_price=float(data.get("total_price", 0)),
            currency=data.get("currency", "INR"),
            agent_reasoning=data.get("agent_reasoning", ""),
            social_post=social_post,
        )

    def _fallback_itinerary(
        self,
        request: ItineraryCreateRequest,
        reason: str = "AI engine temporarily unavailable",
    ) -> ItineraryResponse:
        """Return a graceful fallback itinerary when AI is unavailable."""
        fallback_day = ItineraryDay(
            day_number=1,
            title=f"Welcome to {request.destination}",
            narrative=f"Explore {request.destination} at your own pace. We'll create a detailed itinerary once our AI service is back online.",
            blocks=[
                ItineraryBlock(
                    type=BlockType.ACTIVITY,
                    title=f"Explore {request.destination}",
                    description="Self-guided exploration of the destination.",
                    cost_net=0,
                    price_gross=0,
                    currency="INR",
                )
            ],
        )

        return ItineraryResponse(
            title=f"Trip to {request.destination}",
            days=[fallback_day],
            total_price=0,
            currency="INR",
            agent_reasoning=f"Fallback itinerary: {reason}. Please try again shortly.",
            social_post=SocialMediaPost(
                caption=f"Coming soon: Your perfect {request.destination} itinerary",
                hooks=["Adventure awaits", "Travel smarter", "Experience {request.destination}"],
                image_suggestions=["Destination landmark", "Local culture", "Adventure scene"],
            ),
        )
