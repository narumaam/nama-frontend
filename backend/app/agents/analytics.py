from datetime import datetime, timedelta, timezone
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func, literal, text

from app.schemas.analytics import KPIEntry, DashboardSummary, Anomaly, BusinessForecast
from app.schemas.bookings import BookingStatus
from app.models.payments import Payment, PaymentStatus
from app.models.leads import Lead, LeadStatus
from app.models.itineraries import Itinerary, ItineraryStatus
from app.models.bookings import Booking


class AnalyticsAgent:
    """
    NAMA Analytics Intelligence Agent.
    Queries real data from the database to provide accurate KPIs, anomalies, and forecasts.
    """

    def generate_dashboard_summary(self, db: Session, tenant_id: int) -> DashboardSummary:
        """
        Synthesizes real-time KPIs from actual database data.
        """
        # Query GMV: Sum of completed payments
        gmv_query = (
            db.query(func.sum(Payment.amount))
            .filter(
                Payment.tenant_id == tenant_id,
                Payment.status == PaymentStatus.COMPLETED,
            )
            .scalar()
        )
        gmv = float(gmv_query) if gmv_query else 0.0

        # Query total leads
        total_leads_query = (
            db.query(func.count(Lead.id))
            .filter(Lead.tenant_id == tenant_id)
            .scalar()
        )
        total_leads = int(total_leads_query) if total_leads_query else 0

        # Query active itineraries (DRAFT or SENT)
        active_itineraries_query = (
            db.query(func.count(Itinerary.id))
            .filter(
                Itinerary.tenant_id == tenant_id,
                Itinerary.status.in_([ItineraryStatus.DRAFT, ItineraryStatus.SENT]),
            )
            .scalar()
        )
        active_itineraries = int(active_itineraries_query) if active_itineraries_query else 0

        # Calculate conversion rate (WON leads / total leads * 100)
        won_leads_query = (
            db.query(func.count(Lead.id))
            .filter(Lead.tenant_id == tenant_id, Lead.status == LeadStatus.WON)
            .scalar()
        )
        won_leads = int(won_leads_query) if won_leads_query else 0
        conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0.0

        # Calculate AOV (Average Order Value)
        completed_bookings = (
            db.query(func.count(Booking.id))
            .filter(
                Booking.tenant_id == tenant_id,
                Booking.status == BookingStatus.CONFIRMED,
            )
            .scalar()
        )
        aov = (gmv / completed_bookings) if completed_bookings and completed_bookings > 0 else 0.0

        # Calculate trends (simple: compare with 30 days ago)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        previous_gmv_query = (
            db.query(func.sum(Payment.amount))
            .filter(
                Payment.tenant_id == tenant_id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at < thirty_days_ago,
            )
            .scalar()
        )
        previous_gmv = float(previous_gmv_query) if previous_gmv_query else 0.0
        gmv_trend = ((gmv - previous_gmv) / previous_gmv * 100) if previous_gmv > 0 else 0.0

        # Conversion rate trend
        previous_won = (
            db.query(func.count(Lead.id))
            .filter(
                Lead.tenant_id == tenant_id,
                Lead.status == LeadStatus.WON,
                Lead.won_at < thirty_days_ago,
            )
            .scalar()
        )
        previous_total = (
            db.query(func.count(Lead.id))
            .filter(Lead.tenant_id == tenant_id, Lead.created_at < thirty_days_ago)
            .scalar()
        )
        previous_conversion = (
            (int(previous_won) / int(previous_total) * 100)
            if previous_total and int(previous_total) > 0
            else 0.0
        )
        conversion_trend = conversion_rate - previous_conversion

        return DashboardSummary(
            gmv=KPIEntry(
                label="GMV",
                value=gmv,
                trend=gmv_trend,
                status="UP" if gmv_trend > 0 else ("DOWN" if gmv_trend < 0 else "NEUTRAL"),
            ),
            aov=KPIEntry(
                label="Average Order Value",
                value=aov,
                trend=0.0,  # Could compute month-over-month
                status="NEUTRAL",
            ),
            conversion_rate=KPIEntry(
                label="Lead-to-Booking",
                value=conversion_rate,
                trend=conversion_trend,
                status="UP" if conversion_trend > 0 else ("DOWN" if conversion_trend < 0 else "NEUTRAL"),
            ),
            total_leads=KPIEntry(
                label="Total Leads",
                value=float(total_leads),
                trend=0.0,  # Could compute month-over-month
                status="NEUTRAL",
            ),
            active_itineraries=KPIEntry(
                label="Active Itineraries",
                value=float(active_itineraries),
                trend=0.0,
                status="NEUTRAL",
            ),
            currency="INR",
        )

    def detect_anomalies(self, db: Session, tenant_id: int) -> List[Anomaly]:
        """
        Identifies actual anomalies from real database data.
        """
        anomalies = []

        # Anomaly 1: Bookings cancelled within 24 hours
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        cancelled_bookings = (
            db.query(func.count(Booking.id))
            .filter(
                Booking.tenant_id == tenant_id,
                Booking.status == BookingStatus.CANCELLED,
                Booking.updated_at > twenty_four_hours_ago,
            )
            .scalar()
        )
        if cancelled_bookings and int(cancelled_bookings) > 0:
            anomalies.append(
                Anomaly(
                    metric="Booking Cancellations",
                    description=f"{int(cancelled_bookings)} bookings were cancelled in the last 24 hours.",
                    severity="HIGH",
                )
            )

        # Anomaly 2: Failed payments
        failed_payments = (
            db.query(func.count(Payment.id))
            .filter(
                Payment.tenant_id == tenant_id,
                Payment.status == PaymentStatus.FAILED,
                Payment.created_at > twenty_four_hours_ago,
            )
            .scalar()
        )
        if failed_payments and int(failed_payments) > 0:
            anomalies.append(
                Anomaly(
                    metric="Payment Failures",
                    description=f"{int(failed_payments)} payments failed in the last 24 hours.",
                    severity="MEDIUM",
                )
            )

        # Anomaly 3: Leads stuck in NEW status for >7 days
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        stale_leads = (
            db.query(func.count(Lead.id))
            .filter(
                Lead.tenant_id == tenant_id,
                Lead.status == LeadStatus.NEW,
                Lead.created_at < seven_days_ago,
            )
            .scalar()
        )
        if stale_leads and int(stale_leads) > 0:
            anomalies.append(
                Anomaly(
                    metric="Stale Leads",
                    description=f"{int(stale_leads)} leads have been in NEW status for over 7 days without contact.",
                    severity="MEDIUM",
                )
            )

        return anomalies

    def generate_forecast(self, db: Session, tenant_id: int) -> BusinessForecast:
        """
        Projects next month's GMV based on last 3 months of data.
        """
        now = datetime.now(timezone.utc)
        three_months_ago = now - timedelta(days=90)

        # Dialect-aware month grouping: PostgreSQL uses to_char(), SQLite uses strftime()
        dialect = db.bind.dialect.name if db.bind else "sqlite"
        if dialect == "postgresql":
            month_expr = func.to_char(Payment.created_at, "YYYY-MM").label("month")
        else:
            month_expr = func.strftime(literal("%Y-%m"), Payment.created_at).label("month")

        # Query GMV for last 3 months
        monthly_data = (
            db.query(
                month_expr,
                func.sum(Payment.amount).label("total"),
            )
            .filter(
                Payment.tenant_id == tenant_id,
                Payment.status == PaymentStatus.COMPLETED,
                Payment.created_at > three_months_ago,
            )
            .group_by(text("month"))
            .order_by(text("month"))
            .all()
        )

        if len(monthly_data) < 2:
            # Not enough data for forecast
            return BusinessForecast(
                target_month=f"{(now + timedelta(days=30)).strftime('%B %Y')}",
                projected_gmv=0.0,
                confidence_score=0.3,
                recommendation="Insufficient historical data for accurate forecasting.",
            )

        # Calculate month-over-month growth
        values = [float(m[1]) if m[1] else 0.0 for m in monthly_data]
        if len(values) >= 2:
            growth_rates = []
            for i in range(1, len(values)):
                if values[i - 1] > 0:
                    growth = (values[i] - values[i - 1]) / values[i - 1]
                    growth_rates.append(growth)

            # Average growth rate
            avg_growth = (
                sum(growth_rates) / len(growth_rates) if growth_rates else 0.0
            )

            # Project next month
            current_month_gmv = values[-1] if values else 0.0
            projected_gmv = current_month_gmv * (1 + avg_growth)
            confidence = 0.7 if len(values) >= 3 else 0.5
        else:
            projected_gmv = 0.0
            confidence = 0.3

        return BusinessForecast(
            target_month=f"{(now + timedelta(days=30)).strftime('%B %Y')}",
            projected_gmv=max(0.0, projected_gmv),
            confidence_score=confidence,
            recommendation=f"Based on recent trends, expect a {(((projected_gmv / (values[-1] if values[-1] > 0 else 1)) - 1) * 100):.1f}% change in GMV next month.",
        )

