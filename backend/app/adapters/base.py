from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class SupplyItem(BaseModel):
    id: str
    source: str  # e.g., "AMADEUS", "TBO"
    type: str  # HOTEL, FLIGHT, ACTIVITY
    name: str
    description: Optional[str] = None
    price_net: float
    currency: str
    availability: bool = True
    meta: Dict[str, Any] = {}


class BaseAdapter(ABC):
    provider_name: str = "UNKNOWN"

    @abstractmethod
    async def search_hotels(self, city_code: str, check_in: str, check_out: str, guests: int) -> List[SupplyItem]:
        pass

    @abstractmethod
    async def search_flights(self, origin: str, destination: str, date: str) -> List[SupplyItem]:
        pass

    @abstractmethod
    async def get_details(self, item_id: str) -> Optional[SupplyItem]:
        pass

    def get_mode(self) -> str:
        return "mock"

    def annotate(self, item: SupplyItem, **extra_meta: Any) -> SupplyItem:
        merged_meta = {
            "adapter": self.provider_name,
            "mode": self.get_mode(),
            **item.meta,
            **extra_meta,
        }
        return item.model_copy(update={"meta": merged_meta})
