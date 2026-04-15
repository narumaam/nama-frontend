import os
import httpx
from typing import List, Optional, Dict, Any
from app.adapters.base import BaseAdapter, SupplyItem

class TBOAdapter(BaseAdapter):
    """
    TBO (Travel Boutique Online) Supply Adapter.
    Specializes in Indian and Southeast Asian supply.
    """
    
    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id or os.getenv("TBO_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("TBO_CLIENT_SECRET")
        self.base_url = "https://api.tbo.com/v1" # Mock TBO endpoint

    async def search_hotels(self, city_code: str, check_in: str, check_out: str, guests: int) -> List[SupplyItem]:
        """
        Mock TBO search results for hotel inventory in SEA and India.
        """
        print(f"[TBO] Searching hotels in {city_code} for {check_in} via TBO Group")
        
        # Prototype: Mocking TBO-specific inventory
        mock_results = [
            SupplyItem(
                id="TBO_BKK_123",
                source="TBO",
                type="HOTEL",
                name="Siam Kempinski Hotel Bangkok",
                description="Resort-style luxury in the heart of Bangkok.",
                price_net=15500.0,
                currency="THB",
                availability=True,
                meta={"stars": 5, "city": "BKK", "tbo_rating": "Premier"}
            ),
            SupplyItem(
                id="TBO_GOA_456",
                source="TBO",
                type="HOTEL",
                name="Taj Exotica Resort & Spa, Goa",
                description="Mediterranean-style resort overlooking the Arabian Sea.",
                price_net=22000.0,
                currency="INR",
                availability=True,
                meta={"stars": 5, "city": "GOI", "tbo_rating": "Luxury"}
            )
        ]
        return mock_results

    async def search_flights(self, origin: str, destination: str, date: str) -> List[SupplyItem]:
        """
        Mock search for budget-friendly flights (IndiGo, AirAsia) via TBO.
        """
        print(f"[TBO] Searching LCC flights from {origin} to {destination}")
        
        # Prototype: Mocking budget flight results from TBO
        mock_results = [
            SupplyItem(
                id="TBO_6E_101",
                source="TBO",
                type="FLIGHT",
                name="IndiGo 6E-101",
                description="Non-stop budget flight Mumbai to Bangkok.",
                price_net=12500.0,
                currency="INR",
                availability=True,
                meta={"class": "Economy", "duration": "4h 15m"}
            )
        ]
        return mock_results

    async def get_details(self, item_id: str) -> Optional[SupplyItem]:
        return None
