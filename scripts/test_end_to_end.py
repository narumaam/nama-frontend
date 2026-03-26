import asyncio
import json
from app.agents.triage import QueryTriageAgent
from app.agents.itinerary import ItineraryAgent
from app.schemas.queries import RawQuery, QuerySource
from app.schemas.itinerary import ItineraryCreateRequest

async def run_end_to_end_test():
    triage_agent = QueryTriageAgent()
    itinerary_agent = ItineraryAgent()
    
    print("\n--- STEP 1: SIMULATING INCOMING WHATSAPP MESSAGE ---")
    raw_message = "Hi NAMA! My husband and I are planning a 5-day luxury trip to Dubai. We love fine dining and desert adventures. Our budget is roughly 2.5 lakhs per person. Can you help?"
    print(f"User Message: \"{raw_message}\"")
    
    query = RawQuery(
        source=QuerySource.WHATSAPP,
        content=raw_message,
        sender_id="+919876543210",
        tenant_id=1
    )
    
    print("\n--- STEP 2: AI TRIAGE (M1/M2) ---")
    triage_result = await triage_agent.triage_query(query)
    lead = triage_result.extracted_data
    print(f"Extracted Destination: {lead.destination}")
    print(f"Extracted Duration: {lead.duration_days} Days")
    print(f"Extracted Style: {lead.style}")
    print(f"AI Suggested Reply: \"{triage_result.suggested_reply}\"")
    
    print("\n--- STEP 3: GENERATING AI ITINERARY (M8) ---")
    itinerary_request = ItineraryCreateRequest(
        lead_id=1001,
        destination=lead.destination,
        duration_days=lead.duration_days,
        traveler_count=lead.travelers_count,
        preferences=lead.preferences,
        style=lead.style
    )
    
    itinerary = await itinerary_agent.generate_itinerary(itinerary_request)
    
    print(f"\n--- STEP 4: FINAL BENTO-STYLE ITINERARY ---")
    print(f"TITLE: {itinerary.title}")
    print(f"TOTAL PRICE: {itinerary.currency} {itinerary.total_price:,.2f}")
    
    for day in itinerary.days:
        print(f"\n[DAY {day.day_number}: {day.title}]")
        print(f"Narrative: {day.narrative}")
        for block in day.blocks:
            print(f"  - {block.type.value}: {block.title} | {block.currency} {block.price_gross:,.2f}")
            print(f"    {block.description}")
            
    print("\n--- AGENT REASONING ---")
    print(itinerary.agent_reasoning)

if __name__ == "__main__":
    import os
    # Mocking environment for the test script
    os.environ["DATABASE_URL"] = "sqlite:///./test.db"
    os.environ["SECRET_KEY"] = "test-secret"
    asyncio.run(run_end_to_end_test())
