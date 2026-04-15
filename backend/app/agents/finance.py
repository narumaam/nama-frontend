from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.schemas.financials import BookingProfit, LedgerSummary
from app.core.rls import get_or_404
from app.models.bookings import Booking, BookingItem
from app.models.payments import Payment, PaymentStatus, LedgerEntry


class FinanceAgent:
    """
    NAMA Finance Intelligence Agent.
    Handles real-time P&L reconciliation and financial analytics using actual database data.
    """

    def calculate_booking_profit(
        self,
        db: Session,
        booking_id: int,
        tenant_id: int,
    ) -> BookingProfit:
        """
        Calculates the real-time net profit and margin for a specific booking.
        Uses actual Payment and BookingItem data from the database.
        """
        # 1. Get booking
        booking = get_or_404(db, Booking, booking_id, tenant_id, "Booking not found")

        # 2. Query revenue: Payment with status=COMPLETED for this booking
        revenue_query = (
            db.query(func.sum(Payment.amount))
            .filter(
                Payment.booking_id == booking_id,
                Payment.status == PaymentStatus.COMPLETED,
            )
            .scalar()
        )
        revenue = float(revenue_query) if revenue_query else 0.0

        # 3. Query cost: Sum of booking_items.cost_net
        cost_query = (
            db.query(func.sum(BookingItem.cost_net))
            .filter(BookingItem.booking_id == booking_id)
            .scalar()
        )
        cost = float(cost_query) if cost_query else 0.0

        # 4. Calculate profit
        gross_profit = revenue - cost
        margin_pct = (gross_profit / revenue * 100) if revenue > 0 else 0.0

        return BookingProfit(
            booking_id=booking_id,
            total_inflow=revenue,
            total_outflow=cost,
            net_profit=gross_profit,
            margin_percentage=round(margin_pct, 2),
            currency=booking.currency or "INR",
        )

    def get_ledger_summary(self, db: Session, tenant_id: int) -> LedgerSummary:
        """
        Summarizes the double-entry ledger for a tenant.
        """
        # Query total revenue (CREDIT entries)
        revenue_query = (
            db.query(func.sum(LedgerEntry.amount))
            .filter(
                LedgerEntry.tenant_id == tenant_id,
                LedgerEntry.entry_type == "CREDIT",
            )
            .scalar()
        )
        total_revenue = float(revenue_query) if revenue_query else 0.0

        # Query total cost (DEBIT entries)
        cost_query = (
            db.query(func.sum(LedgerEntry.amount))
            .filter(
                LedgerEntry.tenant_id == tenant_id,
                LedgerEntry.entry_type == "DEBIT",
            )
            .scalar()
        )
        total_cost = float(cost_query) if cost_query else 0.0

        # Calculate balance
        balance = total_revenue - total_cost

        # Get last reconciled timestamp
        last_entry = (
            db.query(LedgerEntry)
            .filter(LedgerEntry.tenant_id == tenant_id)
            .order_by(LedgerEntry.created_at.desc())
            .first()
        )
        last_reconciled = (
            last_entry.created_at if last_entry else datetime.now(timezone.utc)
        )

        return LedgerSummary(
            tenant_id=tenant_id,
            balance_available=balance,
            pending_settlements=0.0,  # Could query pending payments
            currency="INR",
            last_reconciled=last_reconciled,
        )
