from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class SupplyItem(BaseModel):
    id: str
    source: str # e.g., "AMADEUS", "TBO"
    type: str # HOTEL, FLIGHT, ACTIVITY
    name: str
    description: Optional[str] = None
    price_net: float
    currency: str
    availability: bool = True
    meta: Dict[str, Any] = {}

class BaseAdapter(ABC):
    @abstractmethod
    async def search_hotels(self, city_code: str, check_in: str, check_out: str, guests: int) -> List[SupplyItem]:
        pass

    @abstractmethod
    async def search_flights(self, origin: str, destination: str, date: str) -> List[SupplyItem]:
        pass

    @abstractmethod
    async def get_details(self, item_id: str) -> Optional[SupplyItem]:
        pass
