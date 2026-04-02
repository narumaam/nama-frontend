import os
import httpx
from typing import List, Optional, Dict, Any
from app.adapters.base import BaseAdapter, SupplyItem


class AmadeusAdapter(BaseAdapter):
    provider_name = "AMADEUS"

    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None):
        self.api_key = api_key or os.getenv("AMADEUS_API_KEY")
        self.api_secret = api_secret or os.getenv("AMADEUS_API_SECRET")
        self.base_url = os.getenv("AMADEUS_BASE_URL", "https://test.api.amadeus.com")
        self.token: Optional[str] = None
        self.timeout = float(os.getenv("SUPPLY_HTTP_TIMEOUT", "15"))

    def get_mode(self) -> str:
        if self.api_key and self.api_secret:
            if "test" in self.base_url:
                return "sandbox"
            return "live"
        return "mock"

    async def _get_token(self):
        """Amadeus OAuth2 token logic."""
        if self.token:
            return self.token
        if self.get_mode() == "mock":
            self.token = "mock_amadeus_token"
            return self.token

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/security/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.api_key,
                    "client_secret": self.api_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            self.token = response.json()["access_token"]
        return self.token

    async def _auth_headers(self) -> Dict[str, str]:
        token = await self._get_token()
        return {"Authorization": f"Bearer {token}"}

    def _mock_hotels(self, city_code: str) -> List[SupplyItem]:
        return [
            self.annotate(
                SupplyItem(
                    id="HYATT_DXB_001",
                    source="AMADEUS",
                    type="HOTEL",
                    name="Grand Hyatt Dubai",
                    description="5-star luxury hotel near Dubai Healthcare City",
                    price_net=12000.0,
                    currency="AED",
                    availability=True,
                    meta={"stars": 5, "city": city_code, "rooms_available": 5},
                )
            ),
            self.annotate(
                SupplyItem(
                    id="BURJ_AL_ARAB_001",
                    source="AMADEUS",
                    type="HOTEL",
                    name="Burj Al Arab Jumeirah",
                    description="Iconic sail-shaped hotel on its own island",
                    price_net=45000.0,
                    currency="AED",
                    availability=True,
                    meta={"stars": 7, "city": city_code, "rooms_available": 2},
                )
            ),
        ]

    def _mock_flights(self, origin: str, destination: str, date: str) -> List[SupplyItem]:
        return [
            self.annotate(
                SupplyItem(
                    id="EK_512_001",
                    source="AMADEUS",
                    type="FLIGHT",
                    name="Emirates EK512",
                    description=f"Non-stop flight from {origin} to {destination} on {date}",
                    price_net=25000.0,
                    currency="INR",
                    availability=True,
                    meta={"class": "Business", "duration": "3h 30m"},
                )
            )
        ]

    async def search_hotels(self, city_code: str, check_in: str, check_out: str, guests: int) -> List[SupplyItem]:
        if self.get_mode() == "mock":
            return self._mock_hotels(city_code)

        headers = await self._auth_headers()
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            offers = await client.get(
                f"{self.base_url}/shopping/hotel-offers",
                params={
                    "cityCode": city_code,
                    "checkInDate": check_in,
                    "checkOutDate": check_out,
                    "adults": guests,
                },
            )
            offers.raise_for_status()
            data = offers.json().get("data", [])

        results: List[SupplyItem] = []
        for offer in data:
            hotel = offer.get("hotel", {})
            hotel_offers = offer.get("offers", [])
            first_offer = hotel_offers[0] if hotel_offers else {}
            price = first_offer.get("price", {})
            results.append(
                self.annotate(
                    SupplyItem(
                        id=hotel.get("hotelId", hotel.get("name", "amadeus-hotel")),
                        source="AMADEUS",
                        type="HOTEL",
                        name=hotel.get("name", "Amadeus Hotel"),
                        description=hotel.get("description", {}).get("text"),
                        price_net=float(price.get("total", 0) or 0),
                        currency=price.get("currency", "USD"),
                        availability=bool(hotel_offers),
                        meta={
                            "city": city_code,
                            "check_in": check_in,
                            "check_out": check_out,
                            "guests": guests,
                        },
                    )
                )
            )
        return results or self._mock_hotels(city_code)

    async def search_flights(self, origin: str, destination: str, date: str) -> List[SupplyItem]:
        if self.get_mode() == "mock":
            return self._mock_flights(origin, destination, date)

        headers = await self._auth_headers()
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            offers = await client.get(
                f"{self.base_url}/shopping/flight-offers",
                params={
                    "originLocationCode": origin,
                    "destinationLocationCode": destination,
                    "departureDate": date,
                    "adults": 1,
                    "currencyCode": "INR",
                    "max": 5,
                },
            )
            offers.raise_for_status()
            data = offers.json().get("data", [])

        results: List[SupplyItem] = []
        for offer in data:
            itineraries = offer.get("itineraries", [])
            first_itinerary = itineraries[0] if itineraries else {}
            segments = first_itinerary.get("segments", [])
            first_segment = segments[0] if segments else {}
            price = offer.get("price", {})
            airline = first_segment.get("carrierCode", "XX")
            flight_no = first_segment.get("number", "000")
            results.append(
                self.annotate(
                    SupplyItem(
                        id=offer.get("id", f"{airline}_{flight_no}"),
                        source="AMADEUS",
                        type="FLIGHT",
                        name=f"{airline} {flight_no}",
                        description=f"{origin} to {destination}",
                        price_net=float(price.get("total", 0) or 0),
                        currency=price.get("currency", "INR"),
                        availability=True,
                        meta={
                            "origin": origin,
                            "destination": destination,
                            "departure_date": date,
                            "segments": segments,
                        },
                    )
                )
            )
        return results or self._mock_flights(origin, destination, date)

    async def get_details(self, item_id: str) -> Optional[SupplyItem]:
        # Implementation for detailed view
        return None
