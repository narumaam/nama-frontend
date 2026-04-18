from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.schemas.financials import BookingProfit, LedgerSummary, LedgerEntryOut
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

        gross_profit = total_revenue - total_cost
        margin_pct = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0.0

        # Count unreconciled CREDIT entries as pending_reconciliation proxy
        pending_count_query = (
            db.query(func.count(LedgerEntry.id))
            .filter(
                LedgerEntry.tenant_id == tenant_id,
                LedgerEntry.entry_type == "CREDIT",
                LedgerEntry.reference == None,
            )
            .scalar()
        )
        pending_count = int(pending_count_query) if pending_count_query else 0

        return LedgerSummary(
            tenant_id=tenant_id,
            balance_available=balance,
            pending_settlements=0.0,
            currency="INR",
            last_reconciled=last_reconciled,
            # Enriched fields for frontend
            total_revenue=total_revenue,
            total_cost=total_cost,
            gross_profit=gross_profit,
            margin_pct=round(margin_pct, 1),
            pending_reconciliation=pending_count,
        )

    def list_ledger_entries(
        self,
        db: Session,
        tenant_id: int,
        limit: int = 50,
        offset: int = 0,
    ):
        """Return paginated ledger entries for a tenant."""
        entries = (
            db.query(LedgerEntry)
            .filter(LedgerEntry.tenant_id == tenant_id)
            .order_by(LedgerEntry.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        total = (
            db.query(func.count(LedgerEntry.id))
            .filter(LedgerEntry.tenant_id == tenant_id)
            .scalar()
        ) or 0

        return {
            "items": [
                LedgerEntryOut(
                    id=e.id,
                    type=e.entry_type,
                    amount=float(e.amount),
                    currency=e.currency or "INR",
                    description=e.description or "",
                    reference=e.reference,
                    booking_id=e.booking_id,
                    created_at=e.created_at,
                    reconciled=bool(e.reference),
                )
                for e in entries
            ],
            "total": int(total),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # AR Aging Report
    # ─────────────────────────────────────────────────────────────────────────

    def get_ar_aging(self, db: Session, tenant_id: int) -> Dict:
        """
        Accounts Receivable Aging Report.
        Groups CREDIT ledger entries without a corresponding COMPLETED payment
        into aging buckets: Current (0-30d), 31-60d, 61-90d, 90+d.

        Uses Bookings with CONFIRMED status and outstanding payment balance
        as the source of truth.
        """
        now = datetime.now(timezone.utc)

        # Find all confirmed bookings with some revenue
        bookings = (
            db.query(Booking)
            .filter(
                Booking.tenant_id == tenant_id,
                Booking.status.in_(["CONFIRMED", "PENDING_CONFIRMATION"]),
            )
            .all()
        )

        buckets: Dict[str, List[Dict]] = {
            "current":   [],  # 0–30 days
            "days_31_60": [],
            "days_61_90": [],
            "days_90_plus": [],
        }
        totals = {k: 0.0 for k in buckets}

        for b in bookings:
            # Total paid for this booking
            paid_query = (
                db.query(func.sum(Payment.amount))
                .filter(
                    Payment.booking_id == b.id,
                    Payment.status == PaymentStatus.COMPLETED,
                )
                .scalar()
            )
            paid = float(paid_query) if paid_query else 0.0
            outstanding = max(0.0, float(b.total_price or 0) - paid)
            if outstanding <= 0:
                continue

            # Age in days from booking creation
            created = b.created_at
            if created and created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            age_days = (now - (created or now)).days

            entry = {
                "booking_id": b.id,
                "outstanding": outstanding,
                "currency": b.currency or "INR",
                "age_days": age_days,
                "created_at": (created or now).isoformat(),
            }

            if age_days <= 30:
                buckets["current"].append(entry)
                totals["current"] += outstanding
            elif age_days <= 60:
                buckets["days_31_60"].append(entry)
                totals["days_31_60"] += outstanding
            elif age_days <= 90:
                buckets["days_61_90"].append(entry)
                totals["days_61_90"] += outstanding
            else:
                buckets["days_90_plus"].append(entry)
                totals["days_90_plus"] += outstanding

        return {
            "as_of": now.isoformat(),
            "currency": "INR",
            "buckets": buckets,
            "totals": totals,
            "grand_total": sum(totals.values()),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Bank Reconciliation
    # ─────────────────────────────────────────────────────────────────────────

    def get_bank_reconciliation(self, db: Session, tenant_id: int, days: int = 30) -> Dict:
        """
        Bank Reconciliation Report.
        Lists CREDIT ledger entries in the given period and flags which ones
        have a gateway reference (reconciled) vs. which are unreconciled.
        """
        since = datetime.now(timezone.utc) - timedelta(days=days)

        entries = (
            db.query(LedgerEntry)
            .filter(
                LedgerEntry.tenant_id == tenant_id,
                LedgerEntry.created_at >= since,
            )
            .order_by(LedgerEntry.created_at.desc())
            .all()
        )

        reconciled = []
        unreconciled = []
        for e in entries:
            item = {
                "id": e.id,
                "type": e.entry_type,
                "amount": float(e.amount),
                "currency": e.currency or "INR",
                "description": e.description or "",
                "reference": e.reference,
                "booking_id": e.booking_id,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            if e.reference:
                reconciled.append(item)
            else:
                unreconciled.append(item)

        total_reconciled   = sum(i["amount"] for i in reconciled)
        total_unreconciled = sum(i["amount"] for i in unreconciled)

        return {
            "period_days": days,
            "currency": "INR",
            "reconciled":        reconciled,
            "unreconciled":      unreconciled,
            "total_reconciled":   total_reconciled,
            "total_unreconciled": total_unreconciled,
            "reconciliation_rate": (
                round(total_reconciled / (total_reconciled + total_unreconciled) * 100, 1)
                if (total_reconciled + total_unreconciled) > 0 else 100.0
            ),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Month-End Close
    # ─────────────────────────────────────────────────────────────────────────

    def get_month_end_close(self, db: Session, tenant_id: int, year: int, month: int) -> Dict:
        """
        Month-End Close Report for a given year/month.
        Produces a P&L summary:
          Revenue  = CREDIT ledger entries in period
          Cost     = DEBIT ledger entries in period
          Gross P&L, margin %, confirmed bookings count
        """
        from datetime import date
        import calendar

        _, last_day = calendar.monthrange(year, month)
        period_start = datetime(year, month, 1, tzinfo=timezone.utc)
        period_end   = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)

        revenue_q = (
            db.query(func.sum(LedgerEntry.amount))
            .filter(
                LedgerEntry.tenant_id == tenant_id,
                LedgerEntry.entry_type == "CREDIT",
                LedgerEntry.created_at >= period_start,
                LedgerEntry.created_at <= period_end,
            )
            .scalar()
        )
        cost_q = (
            db.query(func.sum(LedgerEntry.amount))
            .filter(
                LedgerEntry.tenant_id == tenant_id,
                LedgerEntry.entry_type == "DEBIT",
                LedgerEntry.created_at >= period_start,
                LedgerEntry.created_at <= period_end,
            )
            .scalar()
        )
        bookings_q = (
            db.query(func.count(Booking.id))
            .filter(
                Booking.tenant_id == tenant_id,
                Booking.status == "CONFIRMED",
                Booking.created_at >= period_start,
                Booking.created_at <= period_end,
            )
            .scalar()
        )

        revenue      = float(revenue_q) if revenue_q else 0.0
        cost         = float(cost_q)    if cost_q    else 0.0
        gross_profit = revenue - cost
        margin_pct   = round(gross_profit / revenue * 100, 1) if revenue > 0 else 0.0
        bookings     = int(bookings_q)  if bookings_q else 0

        return {
            "period": f"{year}-{month:02d}",
            "period_label": f"{date(year, month, 1).strftime('%B %Y')}",
            "currency": "INR",
            "revenue":      revenue,
            "cost":         cost,
            "gross_profit": gross_profit,
            "margin_pct":   margin_pct,
            "bookings":     bookings,
            "status":       "closed" if datetime.now(timezone.utc) > period_end else "open",
        }

