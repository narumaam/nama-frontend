import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.schemas.financials import Transaction, TransactionType, TransactionStatus, BookingProfit

class FinanceAgent:
    """
    NAMA Finance Intelligence Agent.
    Handles real-time P&L reconciliation, currency conversion, and fraud detection.
    """
    
    def __init__(self, model: str = "claude-3-5-sonnet-20240620"):
        self.model = model
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    async def calculate_booking_profit(self, transactions: List[Transaction]) -> BookingProfit:
        """
        Calculates the real-time net profit and margin for a specific booking.
        """
        inflow = sum(t.amount for t in transactions if t.type == TransactionType.INFLOW and t.status == TransactionStatus.COMPLETED)
        outflow = sum(t.amount for t in transactions if t.type == TransactionType.OUTFLOW and t.status == TransactionStatus.COMPLETED)
        
        net_profit = inflow - outflow
        margin_percentage = (net_profit / inflow * 100) if inflow > 0 else 0.0
        
        # All calculations for the prototype assume the base currency of the tenant (e.g., INR)
        return BookingProfit(
            booking_id=transactions[0].booking_id if transactions else 0,
            total_inflow=inflow,
            total_outflow=outflow,
            net_profit=net_profit,
            margin_percentage=round(margin_percentage, 2),
            currency=transactions[0].currency if transactions else "INR"
        )

    async def reconcile_transaction(self, transaction: Transaction, bank_ref: str) -> Transaction:
        """
        Uses AI to match internal transaction records with bank reference statements (M11).
        """
        # Logic to match bank_ref using LLM for messy descriptions
        # (Prototype: Automated matching if bank_ref exists)
        if bank_ref:
            transaction.status = TransactionStatus.RECONCILED
            transaction.reference = bank_ref
            
        return transaction

    async def get_currency_forecast(self, base: str, target: str) -> Dict[str, Any]:
        """
        Provides a basic risk assessment for currency fluctuations (Kinetic layer).
        """
        # Forecast logic (Prototype: Mocking current rate)
        mock_rates = {"USD/INR": 83.2, "AED/INR": 22.6}
        pair = f"{base}/{target}"
        return {
            "pair": pair,
            "rate": mock_rates.get(pair, 1.0),
            "volatility": "Low",
            "recommendation": "Hedge recommended for bookings > 10,000 USD"
        }
