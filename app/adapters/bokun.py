import os
import httpx
from typing import List, Optional, Dict, Any
from app.adapters.base import BaseAdapter, SupplyItem

class BokunAdapter(BaseAdapter):
    """
    Bokun Supply Adapter.
    Specializes in Tours and Activities.
    """
    
    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None):
        self.api_key = api_key or os.getenv("BOKUN_API_KEY")
        self.api_secret = api_secret or os.getenv("BOKUN_API_SECRET")
        self.base_url = "https://api.bokuntest.com/v2" # Mock Bokun Test API

    async def search_hotels(self, city_code: str, check_in: str, check_out: str, guests: int) -> List[SupplyItem]:
        """Bokun primarily handles experiences, but some vendors provide unique stays."""
        return []

    async def search_flights(self, origin: str, destination: str, date: str) -> List[SupplyItem]:
        return []

    async def search_activities(self, city_code: str, date: str) -> List[SupplyItem]:
        """
        Mock Bokun search results for tours and activities.
        """
        print(f"[BOKUN] Searching activities in {city_code} for {date}")
        
        # Prototype: Mocking Bokun-specific activities
        mock_results = [
            SupplyItem(
                id="BOKUN_BALI_001",
                source="BOKUN",
                type="ACTIVITY",
                name="Private Balinese Spiritual Healing & Cleansing",
                description="Experience a traditional Balinese cleansing ritual at a sacred water temple.",
                price_net=4500.0,
                currency="INR",
                availability=True,
                meta={"duration": "4h", "category": "Cultural"}
            ),
            SupplyItem(
                id="BOKUN_DXB_002",
                source="BOKUN",
                type="ACTIVITY",
                name="Premium Desert Safari with Royal Dinner",
                description="Luxury dune bashing followed by a private gazebo dinner in the Dubai desert.",
                price_net=12000.0,
                currency="INR",
                availability=True,
                meta={"duration": "6h", "category": "Adventure"}
            )
        ]
        return mock_results

    async def get_details(self, item_id: str) -> Optional[SupplyItem]:
        return None
