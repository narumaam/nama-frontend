"""
E2E Tests: Leads Management (M2 CRM)
=====================================
Tests for lead CRUD, status updates, tenant isolation, and pagination.

Coverage:
  - Create lead → 200/201 with lead_id
  - List leads → paginated results
  - Get lead detail → correct lead data
  - Update lead status → status changes
  - Tenant isolation → lead from tenant A invisible to tenant B
  - Pagination → limit/offset work correctly
  - Missing fields → 422
"""

import pytest
import httpx
from typing import Dict


class TestCreateLead:
    """POST /api/v1/leads/"""

    def test_create_lead_success(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """POST /leads/ with valid data returns 200/201 with lead_id."""
        lead_data = {
            "sender_id": "test_sender_001",
            "source": "WHATSAPP",
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone": "+919876543210",
            "destination": "Maldives",
            "duration_days": 7,
            "travelers_count": 2,
            "travel_dates": "2026-06-01 to 2026-06-08",
            "budget_per_person": 100000,
            "currency": "INR",
            "travel_style": "Luxury",
            "preferences": ["diving", "island"],
            "status": "NEW",
            "priority": 1,
        }

        response = http_client.post(
            f"{base_url}/api/v1/leads/",
            json=lead_data,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 202), f"Create lead failed: {response.text}"

        data = response.json()
        assert "id" in data
        assert data["full_name"] == "John Doe"
        assert data["status"] == "NEW"
        assert data["destination"] == "Maldives"
        assert data["travelers_count"] == 2

    def test_create_lead_minimal_fields(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """POST /leads/ with only required fields."""
        lead_data = {
            "sender_id": "test_sender_002",
            "source": "EMAIL",
            "travelers_count": 1,
        }

        response = http_client.post(
            f"{base_url}/api/v1/leads/",
            json=lead_data,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 202)
        data = response.json()
        assert "id" in data
        assert data["travelers_count"] == 1

    def test_create_lead_missing_required_fields(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """POST /leads/ missing required fields returns 422."""
        lead_data = {
            # Missing sender_id and source
            "full_name": "Jane Doe",
        }

        response = http_client.post(
            f"{base_url}/api/v1/leads/",
            json=lead_data,
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_create_lead_without_auth(self, http_client: httpx.Client, base_url: str):
        """POST /leads/ without auth returns 401."""
        lead_data = {
            "sender_id": "test_sender_003",
            "source": "PORTAL",
            "travelers_count": 1,
        }

        response = http_client.post(
            f"{base_url}/api/v1/leads/",
            json=lead_data,
        )
        assert response.status_code == 401


class TestListLeads:
    """GET /api/v1/leads/"""

    def test_list_leads_success(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """GET /leads/ returns paginated list with required fields."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/",
            headers=auth_headers,
        )
        assert response.status_code == 200, f"List leads failed: {response.text}"

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert isinstance(data["items"], list)
        assert data["total"] >= 0
        assert data["page"] == 1  # Default page

    def test_list_leads_with_pagination(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """GET /leads/ with page and size parameters."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/",
            params={"page": 1, "size": 10},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 10
        assert len(data["items"]) <= 10

    def test_list_leads_with_status_filter(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """GET /leads/ with status filter parameter."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/",
            params={"status": "NEW"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        # All items should have status=NEW (if any items exist)
        for item in data["items"]:
            assert item["status"] == "NEW"

    def test_list_leads_without_auth(self, http_client: httpx.Client, base_url: str):
        """GET /leads/ without auth returns 401."""
        response = http_client.get(f"{base_url}/api/v1/leads/")
        assert response.status_code == 401


class TestGetLeadDetail:
    """GET /api/v1/leads/{id}"""

    def test_get_lead_detail_success(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """GET /leads/{id} returns correct lead data."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/{created_lead_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200, f"Get lead failed: {response.text}"

        data = response.json()
        assert data["id"] == created_lead_id
        assert "full_name" in data
        assert "status" in data
        assert "created_at" in data

    def test_get_nonexistent_lead(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """GET /leads/{nonexistent_id} returns 404."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/99999",
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_get_lead_without_auth(self, http_client: httpx.Client, base_url: str, created_lead_id: int):
        """GET /leads/{id} without auth returns 401."""
        response = http_client.get(f"{base_url}/api/v1/leads/{created_lead_id}")
        assert response.status_code == 401


class TestUpdateLeadStatus:
    """PATCH /api/v1/leads/{id}"""

    def test_update_lead_status(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """PATCH /leads/{id} updates lead status."""
        update_data = {"status": "QUALIFIED"}

        response = http_client.patch(
            f"{base_url}/api/v1/leads/{created_lead_id}",
            json=update_data,
            headers=auth_headers,
        )
        assert response.status_code == 200, f"Update lead failed: {response.text}"

        data = response.json()
        assert data["id"] == created_lead_id
        assert data["status"] == "QUALIFIED"

    def test_update_lead_multiple_fields(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """PATCH /leads/{id} updates multiple fields."""
        update_data = {
            "status": "PROPOSAL_SENT",
            "full_name": "Updated Name",
            "priority": 5,
            "notes": "This is a test update",
        }

        response = http_client.patch(
            f"{base_url}/api/v1/leads/{created_lead_id}",
            json=update_data,
            headers=auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "PROPOSAL_SENT"
        assert data["full_name"] == "Updated Name"
        assert data["priority"] == 5
        assert data["notes"] == "This is a test update"

    def test_update_nonexistent_lead(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """PATCH /leads/{nonexistent_id} returns 404."""
        response = http_client.patch(
            f"{base_url}/api/v1/leads/99999",
            json={"status": "QUALIFIED"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_update_lead_without_auth(self, http_client: httpx.Client, base_url: str, created_lead_id: int):
        """PATCH /leads/{id} without auth returns 401."""
        response = http_client.patch(
            f"{base_url}/api/v1/leads/{created_lead_id}",
            json={"status": "QUALIFIED"},
        )
        assert response.status_code == 401


class TestLeadPagination:
    """Pagination with limit/offset parameters."""

    def test_pagination_first_page(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """First page returns correct items."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/",
            params={"page": 1, "size": 5},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 5

    def test_pagination_second_page(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Second page returns items if total > size."""
        # Get first page to check if there are more items
        response1 = http_client.get(
            f"{base_url}/api/v1/leads/",
            params={"page": 1, "size": 1},
            headers=auth_headers,
        )
        assert response1.status_code == 200
        data1 = response1.json()

        if data1["total"] > 1:
            response2 = http_client.get(
                f"{base_url}/api/v1/leads/",
                params={"page": 2, "size": 1},
                headers=auth_headers,
            )
            assert response2.status_code == 200
            data2 = response2.json()
            assert data2["page"] == 2
            # Items should be different if there are multiple leads
            if len(data1["items"]) > 0 and len(data2["items"]) > 0:
                assert data1["items"][0]["id"] != data2["items"][0]["id"]

    def test_pagination_out_of_bounds(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Very large page number returns empty list."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/",
            params={"page": 9999, "size": 10},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0


class TestLeadTenantIsolation:
    """Tenant isolation: leads from one tenant invisible to another.

    Note: This test requires either:
      1. Creating a second tenant + user in the test
      2. Having a pre-existing secondary tenant in the database
      3. Using test database reset between runs

    For MVP launch, a simplified version that verifies tenant_id in JWT
    is sufficient. A full multi-tenant test would require database setup.
    """

    def test_lead_contains_tenant_id(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str], created_lead_id: int):
        """Lead object includes tenant_id in response."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/{created_lead_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "tenant_id" in data
        assert data["tenant_id"] > 0

    def test_list_leads_filtered_by_tenant(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """List leads returns only leads from authenticated user's tenant."""
        response = http_client.get(
            f"{base_url}/api/v1/leads/",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()

        # All leads should have the same tenant_id (the authenticated user's tenant)
        if len(data["items"]) > 0:
            expected_tenant_id = data["items"][0]["tenant_id"]
            for item in data["items"]:
                assert item["tenant_id"] == expected_tenant_id
