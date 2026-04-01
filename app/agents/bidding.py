import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.schemas.bidding import BidRequest, VendorBid, BidStatus, BiddingProcess, NegotiationStep
from app.agents.prompts.bidding_prompts import BROADCAST_PROMPT, NEGOTIATION_PROMPT

class BiddingAgent:
    """
    NAMA Supplier Bidding Agent.
    Orchestrates the autonomous broadcast and negotiation process with vendors.
    """
    
    def __init__(self, model: str = "claude-3-5-sonnet-20240620"):
        self.model = model
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    async def broadcast_request(self, request: BidRequest, vendor_ids: List[int]) -> List[Dict[str, Any]]:
        """
        Formulates the broadcast message for each vendor.
        In a real app, this would trigger WhatsApp/Email API calls.
        """
        message = BROADCAST_PROMPT.format(
            block_type="Accommodation" if "room_type" in request.requirements else "Activity",
            details=json.dumps(request.requirements),
            target_price=request.target_price,
            deadline=request.deadline.strftime("%Y-%m-%d %H:%M")
        )
        
        # Prototype: Mocking the broadcast result (e.g., successful dispatch)
        dispatches = []
        for v_id in vendor_ids:
            dispatches.append({
                "vendor_id": v_id,
                "channel": "WhatsApp",
                "message": message,
                "status": "SENT",
                "timestamp": datetime.utcnow()
            })
        return dispatches

    async def evaluate_and_negotiate(self, process: BiddingProcess, new_bid: VendorBid) -> Dict[str, Any]:
        """
        Evaluate an incoming bid and decide whether to accept or negotiate.
        """
        # Logic to decide if we should negotiate
        # (Assuming the target price is stored in the process or block)
        target_price = 10000  # Mock target price for demonstration
        
        if new_bid.price <= target_price:
            return {
                "action": "ACCEPT",
                "reasoning": f"Bid price {new_bid.price} is within or below the target {target_price}.",
                "message": f"We've reviewed your bid for {new_bid.price} and would like to proceed. Please share the confirmation voucher."
            }
        
        # Call LLM for Negotiation logic
        negotiation_logic = NEGOTIATION_PROMPT.format(
            block_type="Travel Service",
            price=new_bid.price,
            currency=new_bid.currency,
            target_price=target_price,
            vendor_bid_notes=new_bid.notes or "Standard submission"
        )
        
        # Prototype: Mocking the agent's negotiation decision
        # In a real app, this would call Claude 3.5
        
        counter_price = target_price * 1.05 # Offer 5% above target
        return {
            "action": "NEGOTIATE",
            "reasoning": f"Bid price {new_bid.price} is higher than the target {target_price}. I will try to counter at {counter_price}.",
            "message": f"Thank you for the quote of {new_bid.price}. We have a high volume of travelers for this season. Would you be open to a rate of {counter_price} for this booking?",
            "counter_price": counter_price
        }

    async def finalize_bidding(self, process: BiddingProcess) -> VendorBid:
        """
        Finalizes the bidding by selecting the best bid.
        """
        if not process.bids:
            raise ValueError("No bids to finalize from.")
            
        # Select the bid with the lowest price among ACCEPTED or SUBMITTED bids
        best_bid = min(process.bids, key=lambda x: x.price)
        return best_bid
