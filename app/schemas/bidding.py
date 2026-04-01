from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class BidStatus(str, Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    NEGOTIATING = "NEGOTIATING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class BidRequest(BaseModel):
    itinerary_block_id: int
    requirements: Dict[str, Any] # e.g., {room_type: "Deluxe", guests: 2, dates: "2024-10-15"}
    target_price: Optional[float] = None
    deadline: datetime

class VendorBid(BaseModel):
    id: Optional[int] = None
    vendor_id: int
    vendor_name: str
    price: float
    currency: str = "INR"
    status: BidStatus = BidStatus.SUBMITTED
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NegotiationStep(BaseModel):
    agent_message: str
    vendor_response: Optional[str] = None
    current_price: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class BiddingProcess(BaseModel):
    id: int
    itinerary_block_id: int
    status: BidStatus
    bids: List[VendorBid]
    best_bid_id: Optional[int] = None
    negotiation_history: List[NegotiationStep] = []
