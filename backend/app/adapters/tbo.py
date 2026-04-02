import os
import httpx
from typing import List, Optional, Dict, Any
from app.adapters.base import BaseAdapter, SupplyItem


class TBOAdapter(BaseAdapter):
    """
    TBO (Travel Boutique Online) Supply Adapter.
    Specializes in Indian and Southeast Asian supply.
    """
    provider_name = "TBO"

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id or os.getenv("TBO_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("TBO_CLIENT_SECRET")
        self.base_url = os.getenv("TBO_BASE_URL", "https://api.tbo.com/v1")
        self.timeout = float(os.getenv("SUPPLY_HTTP_TIMEOUT", "15"))

    def get_mode(self) -> str:
        if self.client_id and self.client_secret:
            if "sandbox" in self.base_url or "test" in self.base_url:
                return "sandbox"
            return "live"
        return "mock"

    def _mock_hotels(self) -> List[SupplyItem]:
        return [
            self.annotate(
                SupplyItem(
                    id="TBO_BKK_123",
                    source="TBO",
                    type="HOTEL",
                    name="Siam Kempinski Hotel Bangkok",
                    description="Resort-style luxury in the heart of Bangkok.",
                    price_net=15500.0,
                    currency="THB",
                    availability=True,
                    meta={"stars": 5, "city": "BKK", "tbo_rating": "Premier"},
                )
            ),
            self.annotate(
                SupplyItem(
                    id="TBO_GOA_456",
                    source="TBO",
                    type="HOTEL",
                    name="Taj Exotica Resort & Spa, Goa",
                    description="Mediterranean-style resort overlooking the Arabian Sea.",
                    price_net=22000.0,
                    currency="INR",
                    availability=True,
                    meta={"stars": 5, "city": "GOI", "tbo_rating": "Luxury"},
                )
            ),
        ]

    def _mock_flights(self, origin: str, destination: str) -> List[SupplyItem]:
        return [
            self.annotate(
                SupplyItem(
                    id="TBO_6E_101",
                    source="TBO",
                    type="FLIGHT",
                    name="IndiGo 6E-101",
                    description=f"Non-stop budget flight {origin} to {destination}.",
                    price_net=12500.0,
                    currency="INR",
                    availability=True,
                    meta={"class": "Economy", "duration": "4h 15m"},
                )
            )
        ]

    async def search_hotels(self, city_code: str, check_in: str, check_out: str, guests: int) -> List[SupplyItem]:
        if self.get_mode() == "mock":
            return self._mock_hotels()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/hotels/search",
                json={
                    "city_code": city_code,
                    "check_in": check_in,
                    "check_out": check_out,
                    "guests": guests,
                },
                headers={
                    "X-Client-Id": self.client_id or "",
                    "X-Client-Secret": self.client_secret or "",
                },
            )
            response.raise_for_status()
            data = response.json().get("results", [])

        results: List[SupplyItem] = []
        for item in data:
            results.append(
                self.annotate(
                    SupplyItem(
                        id=item.get("id", "tbo-hotel"),
                        source="TBO",
                        type="HOTEL",
                        name=item.get("name", "TBO Hotel"),
                        description=item.get("description"),
                        price_net=float(item.get("price_net", 0) or 0),
                        currency=item.get("currency", "INR"),
                        availability=item.get("availability", True),
                        meta=item.get("meta", {}),
                    )
                )
            )
        return results or self._mock_hotels()

    async def search_flights(self, origin: str, destination: str, date: str) -> List[SupplyItem]:
        if self.get_mode() == "mock":
            return self._mock_flights(origin, destination)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/flights/search",
                json={
                    "origin": origin,
                    "destination": destination,
                    "date": date,
                },
                headers={
                    "X-Client-Id": self.client_id or "",
                    "X-Client-Secret": self.client_secret or "",
                },
            )
            response.raise_for_status()
            data = response.json().get("results", [])

        results: List[SupplyItem] = []
        for item in data:
            results.append(
                self.annotate(
                    SupplyItem(
                        id=item.get("id", "tbo-flight"),
                        source="TBO",
                        type="FLIGHT",
                        name=item.get("name", "TBO Flight"),
                        description=item.get("description"),
                        price_net=float(item.get("price_net", 0) or 0),
                        currency=item.get("currency", "INR"),
                        availability=item.get("availability", True),
                        meta=item.get("meta", {}),
                    )
                )
            )
        return results or self._mock_flights(origin, destination)

    async def get_details(self, item_id: str) -> Optional[SupplyItem]:
        return None
