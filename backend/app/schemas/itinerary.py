from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class BlockType(str, Enum):
    HOTEL = "HOTEL"
    TRANSFER = "TRANSFER"
    ACTIVITY = "ACTIVITY"
    FLIGHT = "FLIGHT"
    MEAL = "MEAL"

class ItineraryBlock(BaseModel):
    type: BlockType
    title: str
    description: str
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    cost_net: float = 0.0
    price_gross: float = 0.0
    currency: str = "INR"
    vendor_id: Optional[int] = None
    meta: Dict[str, Any] = {}

class ItineraryDay(BaseModel):
    day_number: int
    title: str
    narrative: str
    blocks: List[ItineraryBlock]

class ItineraryCreateRequest(BaseModel):
    lead_id: int
    destination: str
    duration_days: int
    travel_dates: Optional[str] = None
    budget_range: Optional[str] = None
    traveler_count: int = 1
    preferences: List[str] = []
    style: str = "Standard" # Budget, Standard, Luxury

class SocialMediaPost(BaseModel):
    caption: str
    hooks: List[str]
    image_suggestions: List[str]

class ItineraryResponse(BaseModel):
    id: Optional[int] = None
    title: str
    days: List[ItineraryDay]
    total_price: float
    currency: str
    agent_reasoning: Optional[str] = None
    social_post: Optional[SocialMediaPost] = None
