import os
import json
from typing import Dict, Any, Optional
from app.schemas.queries import RawQuery, QueryTriageResult, ExtractedLeadData
from app.agents.prompts.triage_prompts import TRIAGE_SYSTEM_PROMPT, TRIAGE_USER_PROMPT

class QueryTriageAgent:
    """
    NAMA Query Triage Agent.
    Orchestrates the extraction of structured leads from raw WhatsApp/Email text.
    """
    
    def __init__(self, model: str = "claude-3-5-sonnet-20240620"):
        self.model = model
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    async def triage_query(self, query: RawQuery) -> QueryTriageResult:
        """
        Main entry point for triaging a raw query.
        In a production environment, this would call Claude 3.5.
        For the prototype, we implement the structure logic.
        """
        
        # Step 1: Format Prompts
        sys_p = TRIAGE_SYSTEM_PROMPT
        user_p = TRIAGE_USER_PROMPT.format(
            source=query.source.value,
            content=query.content
        )
        
        # Step 2: Call LLM (Pseudo-logic for the prototype)
        # In a real implementation, we'd use:
        # client = anthropic.Anthropic(api_key=self.api_key)
        # response = await client.messages.create(...)
        
        # Prototype: Mocking the triage result based on simple content patterns
        # to demonstrate the extraction flow.
        
        lower_content = query.content.lower()
        
        # Simple extraction logic for demonstration
        destination = "Thailand" if "thailand" in lower_content else ("Dubai" if "dubai" in lower_content else "India")
        duration = 5 if "5 days" in lower_content else (7 if "week" in lower_content else 4)
        travelers = 2 if "couple" in lower_content or "2 people" in lower_content else 1
        
        extracted = ExtractedLeadData(
            destination=destination,
            duration_days=duration,
            travelers_count=travelers,
            travel_dates="Not specified",
            budget_per_person=50000.0,
            currency="INR",
            preferences=["Sightseeing", "Luxury Stay"] if "luxury" in lower_content else ["Local Food", "Culture"],
            style="Luxury" if "luxury" in lower_content else "Standard",
            confidence_score=0.85
        )
        
        return QueryTriageResult(
            is_valid_query=True,
            extracted_data=extracted,
            suggested_reply=f"Hi! Thanks for your inquiry about {destination}. Our travel specialists are putting together a custom {duration}-day plan for you. Stay tuned!",
            reasoning=f"Detected destination '{destination}' and duration '{duration}' from the raw content."
        )
