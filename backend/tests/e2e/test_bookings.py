"""
E2E Tests: Bookings Management (M7)
====================================
Tests for booking CRUD, status updates, and auth requirements.

Coverage:
  - Create booking → 202 with booking_id
  - List bookings → paginated results
  - Get booking detail → correct booking data
  - Booking requires auth → 401 without token
  - Update booking status → status changes
"""

import pytest
import httpx
from typing import Dict


class TestCreateBooking:
    """POST /api/v1/bookings/"""

    def test_create_booking_success(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """POST /bookings/ with valid data returns 202 with booking_id."""
        booking_data = {
            "itinerary_id": 1,
            "lead_id": created_lead_id,
            "total_price": 150000.00,
            "currency": "INR",
            "idempotency_key": "booking-test-001-uuid",
        }

        response = http_client.post(
            f"{base_url}/api/v1/bookings/",
            json=booking_data,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 202), f"Create booking failed: {response.text}"

        data = response.json()
        assert "id" in data
        assert data["lead_id"] == created_lead_id
        assert data["total_price"] == 150000.00
        assert data["currency"] == "INR"

    def test_create_booking_without_auth(self, http_client: httpx.Client, base_url: str, created_lead_id: int):
        """POST /bookings/ without auth returns 401."""
        booking_data = {
            "itinerary_id": 1,
            "lead_id": created_lead_id,
            "total_price": 100000.00,
            "currency": "INR",
            "idempotency_key": "booking-test-002-uuid",
        }

        response = http_client.post(
            f"{base_url}/api/v1/bookings/",
            json=booking_data,
        )
        assert response.status_code == 401

    def test_create_booking_missing_fields(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """POST /bookings/ missing required fields returns 422."""
        booking_data = {
            # Missing itinerary_id, lead_id, total_price, idempotency_key
            "currency": "INR",
        }

        response = http_client.post(
            f"{base_url}/api/v1/bookings/",
            json=booking_data,
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_create_booking_idempotency(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """Duplicate idempotency_key prevents duplicate bookings."""
        booking_data = {
            "itinerary_id": 1,
            "lead_id": created_lead_id,
            "total_price": 100000.00,
            "currency": "INR",
            "idempotency_key": "booking-idempotency-test-001",
        }

        # Create first booking
        response1 = http_client.post(
            f"{base_url}/api/v1/bookings/",
            json=booking_data,
            headers=auth_headers,
        )
        assert response1.status_code in (200, 201, 202)
        booking1 = response1.json()
        booking1_id = booking1["id"]

        # Attempt to create again with same idempotency_key
        response2 = http_client.post(
            f"{base_url}/api/v1/bookings/",
            json=booking_data,
            headers=auth_headers,
        )
        assert response2.status_code in (200, 201, 202)
        booking2 = response2.json()

        # Should return same booking (or idempotent response)
        assert booking2["id"] == booking1_id


class TestListBookings:
    """GET /api/v1/bookings/"""

    def test_list_bookings_success(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """GET /bookings/ returns list of bookings."""
        response = http_client.get(
            f"{base_url}/api/v1/bookings/",
            headers=auth_headers,
        )
        assert response.status_code == 200, f"List bookings failed: {response.text}"

        data = response.json()
        assert isinstance(data, list)
        # List may be empty or contain bookings
        for booking in data:
            assert "id" in booking
            assert "lead_id" in booking
            assert "total_price" in booking

    def test_list_bookings_without_auth(self, http_client: httpx.Client, base_url: str):
        """GET /bookings/ without auth returns 401."""
        response = http_client.get(f"{base_url}/api/v1/bookings/")
        assert response.status_code == 401

    def test_list_bookings_with_status_filter(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """GET /bookings/ with booking_status filter."""
        response = http_client.get(
            f"{base_url}/api/v1/bookings/",
            params={"booking_status": "DRAFT"},
            headers=auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        # All items should have status=DRAFT (if any)
        for booking in data:
            assert booking["status"] == "DRAFT"


class TestGetBookingDetail:
    """GET /api/v1/bookings/{id}"""

    def test_get_booking_detail_success(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """GET /bookings/{id} returns correct booking data."""
        # First create a booking
        booking_data = {
            "itinerary_id": 1,
            "lead_id": created_lead_id,
            "total_price": 200000.00,
            "currency": "INR",
            "idempotency_key": "booking-detail-test-001",
        }

        create_response = http_client.post(
            f"{base_url}/api/v1/bookings/",
            json=booking_data,
            headers=auth_headers,
        )
        assert create_response.status_code in (200, 201, 202)
        booking_id = create_response.json()["id"]

        # Get the booking
        response = http_client.get(
            f"{base_url}/api/v1/bookings/{booking_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200, f"Get booking failed: {response.text}"

        data = response.json()
        assert data["id"] == booking_id
        assert data["lead_id"] == created_lead_id

    def test_get_nonexistent_booking(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """GET /bookings/{nonexistent_id} returns 404."""
        response = http_client.get(
            f"{base_url}/api/v1/bookings/99999",
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_get_booking_without_auth(self, http_client: httpx.Client, base_url: str):
        """GET /bookings/{id} without auth returns 401."""
        response = http_client.get(f"{base_url}/api/v1/bookings/1")
        assert response.status_code == 401


class TestUpdateBookingStatus:
    """PUT /api/v1/bookings/{id}"""

    def test_update_booking_status_success(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """PUT /bookings/{id} updates booking status."""
        # Create a booking
        booking_data = {
            "itinerary_id": 1,
            "lead_id": created_lead_id,
            "total_price": 125000.00,
            "currency": "INR",
            "idempotency_key": "booking-update-test-001",
        }

        create_response = http_client.post(
            f"{base_url}/api/v1/bookings/",
            json=booking_data,
            headers=auth_headers,
        )
        assert create_response.status_code in (200, 201, 202)
        booking_id = create_response.json()["id"]

        # Update the booking status
        update_data = {"status": "CONFIRMED"}

        response = http_client.put(
            f"{base_url}/api/v1/bookings/{booking_id}",
            json=update_data,
            headers=auth_headers,
        )
        assert response.status_code == 200, f"Update booking failed: {response.text}"

        data = response.json()
        assert data["id"] == booking_id
        assert data["status"] == "CONFIRMED"

    def test_update_booking_without_auth(self, http_client: httpx.Client, base_url: str):
        """PUT /bookings/{id} without auth returns 401."""
        update_data = {"status": "CONFIRMED"}

        response = http_client.put(
            f"{base_url}/api/v1/bookings/1",
            json=update_data,
        )
        assert response.status_code == 401

    def test_update_nonexistent_booking(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """PUT /bookings/{nonexistent_id} returns 404."""
        update_data = {"status": "CONFIRMED"}

        response = http_client.put(
            f"{base_url}/api/v1/bookings/99999",
            json=update_data,
            headers=auth_headers,
        )
        assert response.status_code == 404
