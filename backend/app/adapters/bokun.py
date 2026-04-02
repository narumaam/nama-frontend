import os
import httpx
from typing import List, Optional, Dict, Any
from app.adapters.base import BaseAdapter, SupplyItem


class BokunAdapter(BaseAdapter):
    """
    Bokun Supply Adapter.
    Specializes in Tours and Activities.
    """
    provider_name = "BOKUN"

    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None):
        self.api_key = api_key or os.getenv("BOKUN_API_KEY")
        self.api_secret = api_secret or os.getenv("BOKUN_API_SECRET")
        self.base_url = os.getenv("BOKUN_BASE_URL", "https://api.bokuntest.com/v2")
        self.timeout = float(os.getenv("SUPPLY_HTTP_TIMEOUT", "15"))

    def get_mode(self) -> str:
        if self.api_key and self.api_secret:
            if "test" in self.base_url:
                return "sandbox"
            return "live"
        return "mock"

    def _mock_activities(self) -> List[SupplyItem]:
        return [
            self.annotate(
                SupplyItem(
                    id="BOKUN_BALI_001",
                    source="BOKUN",
                    type="ACTIVITY",
                    name="Private Balinese Spiritual Healing & Cleansing",
                    description="Experience a traditional Balinese cleansing ritual at a sacred water temple.",
                    price_net=4500.0,
                    currency="INR",
                    availability=True,
                    meta={"duration": "4h", "category": "Cultural"},
                )
            ),
            self.annotate(
                SupplyItem(
                    id="BOKUN_DXB_002",
                    source="BOKUN",
                    type="ACTIVITY",
                    name="Premium Desert Safari with Royal Dinner",
                    description="Luxury dune bashing followed by a private gazebo dinner in the Dubai desert.",
                    price_net=12000.0,
                    currency="INR",
                    availability=True,
                    meta={"duration": "6h", "category": "Adventure"},
                )
            ),
        ]

    async def search_hotels(self, city_code: str, check_in: str, check_out: str, guests: int) -> List[SupplyItem]:
        """Bokun primarily handles experiences, but some vendors provide unique stays."""
        return []

    async def search_flights(self, origin: str, destination: str, date: str) -> List[SupplyItem]:
        return []

    async def search_activities(self, city_code: str, date: str) -> List[SupplyItem]:
        if self.get_mode() == "mock":
            return self._mock_activities()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/activities",
                params={"city": city_code, "date": date},
                headers={
                    "X-API-KEY": self.api_key or "",
                    "X-API-SECRET": self.api_secret or "",
                },
            )
            response.raise_for_status()
            data = response.json().get("results", [])

        results: List[SupplyItem] = []
        for item in data:
            results.append(
                self.annotate(
                    SupplyItem(
                        id=item.get("id", "bokun-activity"),
                        source="BOKUN",
                        type="ACTIVITY",
                        name=item.get("name", "Bokun Activity"),
                        description=item.get("description"),
                        price_net=float(item.get("price_net", 0) or 0),
                        currency=item.get("currency", "INR"),
                        availability=item.get("availability", True),
                        meta=item.get("meta", {}),
                    )
                )
            )
        return results or self._mock_activities()

    async def get_details(self, item_id: str) -> Optional[SupplyItem]:
        return None
