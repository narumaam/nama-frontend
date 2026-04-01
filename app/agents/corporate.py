import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.schemas.corporate import POStatus, CorporatePO

class CorporateAgent:
    """
    NAMA Corporate Booking Agent (M13).
    Specializes in policy enforcement, PO approval workflows, and seat inventory optimization.
    """
    
    def __init__(self, model: str = "claude-3-5-sonnet-20240620"):
        self.model = model
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    async def validate_po_policy(self, po: CorporatePO, booking_amount: float) -> Dict[str, Any]:
        """
        Uses AI logic to check if a booking request complies with the Corporate PO policy.
        """
        # Step 1: Logic to check budget and status
        if po.status != POStatus.APPROVED:
            return {"valid": False, "reason": "The PO is not in APPROVED status."}
        
        if booking_amount > po.budget_threshold:
            return {
                "valid": False, 
                "reason": f"Booking amount ({booking_amount} {po.currency}) exceeds the PO threshold ({po.budget_threshold} {po.currency}).",
                "recommendation": "Request a budget override or a supplementary PO."
            }
            
        return {"valid": True, "reason": "Booking is within PO policy limits."}

    async def suggest_approval_chain(self, client_org_id: int, booking_amount: float) -> List[Dict[str, Any]]:
        """
        Suggests an approval chain based on the organization's structure and booking value.
        """
        # Prototype: Mocking the approval chain logic
        if booking_amount > 500000:
            return [{"role": "Travel Manager", "status": "PENDING"}, {"role": "Finance Director", "status": "PENDING"}]
        return [{"role": "Department Head", "status": "PENDING"}]

    async def optimize_seat_pricing(self, departure_id: int, current_load: float) -> float:
        """
        Dynamic pricing for fixed departures based on remaining seat capacity.
        """
        # Dynamic pricing logic (Prototype: Increase price by 10% if > 80% full)
        base_price = 15000.0
        if current_load > 0.8:
            return base_price * 1.10
        return base_price
