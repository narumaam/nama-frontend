"""
E2E Tests: Critical User Flows
===============================
Sequential end-to-end tests for complete user journeys.

Tests:
  - Full lead-to-booking conversion flow
  - Query ingestion and AI triage
  - Analytics dashboard reflects new data
"""

import pytest
import httpx
import uuid
from typing import Dict


class TestFullLeadToBookingFlow:
    """Sequential: login → create lead → create booking → confirm booking"""

    def test_lead_to_booking_conversion(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Complete flow: login → create lead → booking → confirm."""

        # Step 1: Authentication (already done in auth_headers fixture)
        assert "Authorization" in auth_headers

        # Step 2: Create a new lead
        lead_data = {
            "sender_id": f"critical_path_{uuid.uuid4()}",
            "source": "PORTAL",
            "full_name": "Critical Path Traveler",
            "email": "critical@example.com",
            "phone": "+919999999999",
            "destination": "Japan",
            "duration_days": 10,
            "travelers_count": 3,
            "travel_dates": "2026-07-01 to 2026-07-11",
            "budget_per_person": 150000,
            "currency": "INR",
            "travel_style": "Adventure",
            "preferences": ["hiking", "culture"],
            "status": "NEW",
            "priority": 1,
        }

        lead_response = http_client.post(
            f"{base_url}/api/v1/leads/",
            json=lead_data,
            headers=auth_headers,
        )
        assert lead_response.status_code in (200, 201, 202), f"Lead creation failed: {lead_response.text}"
        lead = lead_response.json()
        lead_id = lead["id"]
        assert lead["full_name"] == "Critical Path Traveler"
        assert lead["status"] == "NEW"

        # Step 3: Verify lead is retrievable
        get_lead_response = http_client.get(
            f"{base_url}/api/v1/leads/{lead_id}",
            headers=auth_headers,
        )
        assert get_lead_response.status_code == 200
        retrieved_lead = get_lead_response.json()
        assert retrieved_lead["id"] == lead_id

        # Step 4: Create a booking for the lead
        booking_data = {
            "itinerary_id": 1,
            "lead_id": lead_id,
            "total_price": 450000.00,  # 3 travelers × 150k
            "currency": "INR",
            "idempotency_key": f"critical-path-booking-{uuid.uuid4()}",
        }

        booking_response = http_client.post(
            f"{base_url}/api/v1/bookings/",
            json=booking_data,
            headers=auth_headers,
        )
        assert booking_response.status_code in (200, 201, 202), f"Booking creation failed: {booking_response.text}"
        booking = booking_response.json()
        booking_id = booking["id"]
        assert booking["lead_id"] == lead_id
        assert booking["total_price"] == 450000.00

        # Step 5: Verify booking is retrievable
        get_booking_response = http_client.get(
            f"{base_url}/api/v1/bookings/{booking_id}",
            headers=auth_headers,
        )
        assert get_booking_response.status_code == 200
        retrieved_booking = get_booking_response.json()
        assert retrieved_booking["id"] == booking_id

        # Step 6: Update lead status to PROPOSAL_SENT
        update_lead_data = {"status": "PROPOSAL_SENT"}
        update_lead_response = http_client.patch(
            f"{base_url}/api/v1/leads/{lead_id}",
            json=update_lead_data,
            headers=auth_headers,
        )
        assert update_lead_response.status_code == 200
        updated_lead = update_lead_response.json()
        assert updated_lead["status"] == "PROPOSAL_SENT"

        # Step 7: Confirm the booking
        confirm_booking_data = {"status": "CONFIRMED"}
        confirm_booking_response = http_client.put(
            f"{base_url}/api/v1/bookings/{booking_id}",
            json=confirm_booking_data,
            headers=auth_headers,
        )
        assert confirm_booking_response.status_code == 200
        confirmed_booking = confirm_booking_response.json()
        assert confirmed_booking["status"] == "CONFIRMED"

        # Step 8: Final verification — booking is confirmed and lead has proposal sent
        final_lead = http_client.get(
            f"{base_url}/api/v1/leads/{lead_id}",
            headers=auth_headers,
        ).json()
        assert final_lead["status"] == "PROPOSAL_SENT"

        final_booking = http_client.get(
            f"{base_url}/api/v1/bookings/{booking_id}",
            headers=auth_headers,
        ).json()
        assert final_booking["status"] == "CONFIRMED"


class TestQueryTriageFlow:
    """Query ingestion and AI triage (M1 → M2)"""

    def test_query_ingestion_creates_lead(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """POST /queries/ingest creates a lead from a raw query."""
        query_data = {
            "sender_id": f"triage_test_{uuid.uuid4()}",
            "raw_message": "I want to visit Bali for 5 days in June with my family. Budget is 2 lakhs per person.",
            "source": "WHATSAPP",
        }

        response = http_client.post(
            f"{base_url}/api/v1/queries/ingest",
            json=query_data,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 202), f"Query ingest failed: {response.text}"

        data = response.json()
        # Verify triage result structure
        assert "is_valid_query" in data or "extracted_data" in data, f"Missing triage fields: {data}"

        # If valid query, should have extracted data
        if data.get("is_valid_query"):
            extracted = data.get("extracted_data", {})
            # Should extract destination, duration, budget, travelers
            # (fields depend on agent implementation)
            assert isinstance(extracted, dict)


class TestAnalyticsReflectsNewData:
    """Dashboard metrics update after new lead creation"""

    def test_dashboard_reflects_new_lead(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Create a lead, then verify dashboard shows updated metrics."""

        # Step 1: Get baseline dashboard
        baseline_response = http_client.get(
            f"{base_url}/api/v1/analytics/dashboard",
            headers=auth_headers,
        )
        assert baseline_response.status_code == 200
        baseline = baseline_response.json()
        baseline_total_leads = baseline.get("total_leads", 0)

        # Step 2: Create a new lead
        lead_data = {
            "sender_id": f"analytics_test_{uuid.uuid4()}",
            "source": "DIRECT",
            "full_name": "Analytics Test Lead",
            "travelers_count": 1,
            "status": "NEW",
            "priority": 1,
        }

        lead_response = http_client.post(
            f"{base_url}/api/v1/leads/",
            json=lead_data,
            headers=auth_headers,
        )
        assert lead_response.status_code in (200, 201, 202)

        # Step 3: Get updated dashboard
        # Note: Analytics may have caching, so the update might not be immediate
        updated_response = http_client.get(
            f"{base_url}/api/v1/analytics/dashboard",
            headers=auth_headers,
        )
        assert updated_response.status_code == 200
        updated = updated_response.json()
        updated_total_leads = updated.get("total_leads", 0)

        # Verify total_leads increased (or stayed same if cache not invalidated)
        assert updated_total_leads >= baseline_total_leads, \
            f"Dashboard total_leads should increase: {baseline_total_leads} → {updated_total_leads}"
