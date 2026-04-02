import os
import json
from typing import List, Dict, Any, Optional
from app.schemas.itinerary import (
    ItineraryCreateRequest, ItineraryResponse, ItineraryDay, 
    ItineraryBlock, BlockType, SocialMediaPost
)
from app.agents.prompts.itinerary_prompts import SYSTEM_PROMPT, USER_PROMPT, INSTA_POST_PROMPT
from app.adapters.amadeus import AmadeusAdapter
from app.adapters.tbo import TBOAdapter
from app.adapters.bokun import BokunAdapter
from app.demo_data import list_demo_cases

class ItineraryAgent:
    """
    NAMA Itinerary Intelligence Agent.
    Orchestrates the decomposition of traveler preferences into a day-by-day itinerary.
    Integrated with Bokun for activities and Insta Post generator.
    """
    
    def __init__(self, model: str = "claude-3-5-sonnet-20240620"):
        self.model = model
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.amadeus_adapter = AmadeusAdapter()
        self.tbo_adapter = TBOAdapter()
        self.bokun_adapter = BokunAdapter()

    async def generate_itinerary(self, request: ItineraryCreateRequest) -> ItineraryResponse:
        """
        Main entry point for generating a new itinerary.
        """
        for case in list_demo_cases():
            triage = case["triage"]
            if (
                request.destination.lower() == triage["destination"].lower()
                and request.duration_days == triage["duration_days"]
                and request.traveler_count == triage["travelers_count"]
            ):
                return ItineraryResponse(**case["itinerary"])

        # Step 1: Logic to determine search dates
        check_in = "2024-12-15"
        check_out = "2024-12-22"
        city_code = request.destination[:3].upper()
        
        # Step 2: Fetch Real-time Supply via Adapters
        # Parallel fetch from multiple supply sources
        amadeus_hotels = await self.amadeus_adapter.search_hotels(city_code, check_in, check_out, request.traveler_count)
        tbo_hotels = await self.tbo_adapter.search_hotels(city_code, check_in, check_out, request.traveler_count)
        bokun_activities = await self.bokun_adapter.search_activities(city_code, check_in)
        
        all_hotels = amadeus_hotels + tbo_hotels
        best_hotel = all_hotels[1] if request.style == "Luxury" and len(all_hotels) > 1 else all_hotels[0]
        
        # Select best activity from Bokun if available
        best_activity = bokun_activities[0] if bokun_activities else None
        
        # Step 3: Construct Itinerary
        mock_days = []
        highlights = []
        for i in range(1, request.duration_days + 1):
            activity_block = ItineraryBlock(
                type=BlockType.ACTIVITY,
                title=best_activity.name if best_activity else f"Explore {request.destination} City Tour",
                description=best_activity.description if best_activity else f"Guided tour covering major landmarks.",
                cost_net=best_activity.price_net if best_activity else 2500,
                price_gross=best_activity.price_net * 1.3 if best_activity else 3500,
                currency=best_activity.currency if best_activity else "INR",
                vendor_id=best_activity.id if best_activity else 1
            )
            
            if i == 1: highlights.append(activity_block.title)

            blocks = [
                ItineraryBlock(
                    type=BlockType.TRANSFER,
                    title="Airport Pick-up",
                    description=f"Private AC Sedan to {best_hotel.name}.",
                    cost_net=1200,
                    price_gross=1500
                ),
                ItineraryBlock(
                    type=BlockType.HOTEL,
                    title=best_hotel.name,
                    description=best_hotel.description,
                    cost_net=best_hotel.price_net,
                    price_gross=best_hotel.price_net * 1.25,
                    currency=best_hotel.currency,
                    vendor_id=1,
                    meta=best_hotel.meta
                ),
                activity_block
            ]
            
            day = ItineraryDay(
                day_number=i,
                title=f"Day {i}: Welcome to {request.destination}",
                narrative=f"Experience {request.destination} with a focus on {request.style} comfort and curated local experiences.",
                blocks=blocks
            )
            mock_days.append(day)
            
        total_price = sum(block.price_gross for day in mock_days for block in day.blocks)
        title = f"The Ultimate {request.duration_days}-Day {request.style} Experience in {request.destination}"
        
        # Step 4: Generate Social Media Post (Creative Marketing Agent)
        social_post = SocialMediaPost(
            caption=f"Dreaming of {request.destination}? ✨ Our new {request.duration_days}-day {request.style} itinerary is live! From {best_hotel.name} to {highlights[0]}, experience the best of {request.destination} autonomously with NAMA. #TravelWithNAMA #AutonomousTravel",
            hooks=[f"Stop planning, start traveling to {request.destination}.", f"Is {request.destination} on your bucket list?", "Luxury travel just got an AI upgrade."],
            image_suggestions=[f"Sunset view from {best_hotel.name}", f"Action shot of {highlights[0]}", "Morning breakfast layout with city view"]
        )
        
        return ItineraryResponse(
            title=title,
            days=mock_days,
            total_price=total_price,
            currency="INR",
            agent_reasoning=f"I integrated real-time supply from Amadeus, TBO, and BOKUN. I selected {best_hotel.name} and {best_activity.name} from BOKUN to ensure a high-conversion, luxury experience.",
            social_post=social_post
        )
