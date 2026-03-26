from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class TransactionType(str, Enum):
    INFLOW = "INFLOW"   # Payment from Client
    OUTFLOW = "OUTFLOW" # Payment to Vendor
    REFUND = "REFUND"
    ADJUSTMENT = "ADJUSTMENT"

class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RECONCILED = "RECONCILED"

class Transaction(BaseModel):
    id: Optional[int] = None
    booking_id: int
    tenant_id: int
    amount: float
    currency: str
    type: TransactionType
    status: TransactionStatus
    reference: Optional[str] = None # Bank Ref, UTR, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BookingProfit(BaseModel):
    booking_id: int
    total_inflow: float
    total_outflow: float
    net_profit: float
    margin_percentage: float
    currency: str

class LedgerSummary(BaseModel):
    tenant_id: int
    balance_available: float
    pending_settlements: float
    currency: str
    last_reconciled: datetime
