"""
E2E Test Configuration
======================
Fixtures for API testing, authentication, and test data management.

Usage:
    E2E_BASE_URL=http://localhost:8000 pytest backend/tests/e2e/ -v

Requires:
    - Running FastAPI server with seeded demo data
    - httpx library (sync client)
"""

import os
import pytest
import httpx
from typing import Dict, Optional


# ── Configuration ──────────────────────────────────────────────────────────────

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@namatest.dev")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Demo123!")
SALES_EMAIL = os.getenv("SALES_EMAIL", "demo@namatest.dev")
SALES_PASSWORD = os.getenv("SALES_PASSWORD", "Demo123!")


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def base_url() -> str:
    """Base URL for API calls. Reads E2E_BASE_URL env var."""
    return BASE_URL


@pytest.fixture(scope="session")
def http_client() -> httpx.Client:
    """Sync HTTP client for E2E tests."""
    client = httpx.Client(follow_redirects=True, timeout=30.0)
    yield client
    client.close()


@pytest.fixture(scope="session")
def auth_tokens(http_client: httpx.Client, base_url: str) -> Dict[str, str]:
    """
    Authenticate as admin user.
    Returns dict with 'access' and 'refresh' tokens.

    Raises:
        AssertionError if login fails
    """
    response = http_client.post(
        f"{base_url}/api/v1/login",
        data={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
        },
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, f"No access_token in response: {data}"

    return {
        "access": data["access_token"],
        "refresh": response.cookies.get("nama_refresh_token"),
    }


@pytest.fixture(scope="session")
def auth_headers(auth_tokens: Dict[str, str]) -> Dict[str, str]:
    """Authorization headers for authenticated requests (admin)."""
    return {"Authorization": f"Bearer {auth_tokens['access']}"}


@pytest.fixture(scope="session")
def sales_tokens(http_client: httpx.Client, base_url: str) -> Dict[str, str]:
    """
    Authenticate as sales agent user.
    Returns dict with 'access' and 'refresh' tokens.
    """
    response = http_client.post(
        f"{base_url}/api/v1/login",
        data={
            "username": SALES_EMAIL,
            "password": SALES_PASSWORD,
        },
    )
    assert response.status_code == 200, f"Sales login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, f"No access_token in response: {data}"

    return {
        "access": data["access_token"],
        "refresh": response.cookies.get("nama_refresh_token"),
    }


@pytest.fixture(scope="session")
def sales_headers(sales_tokens: Dict[str, str]) -> Dict[str, str]:
    """Authorization headers for authenticated requests (sales agent)."""
    return {"Authorization": f"Bearer {sales_tokens['access']}"}


@pytest.fixture(scope="session")
def created_lead_id(http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]) -> int:
    """
    Create a lead for use across tests.
    Session-scoped so it's reused across all E2E tests.

    Returns the lead ID.
    """
    lead_data = {
        "sender_id": "test_sender_123",
        "source": "WHATSAPP",
        "full_name": "Test Lead Name",
        "email": "testlead@example.com",
        "phone": "+919876543210",
        "destination": "Bali, Indonesia",
        "duration_days": 5,
        "travelers_count": 2,
        "travel_dates": "2026-05-01 to 2026-05-06",
        "budget_per_person": 50000,
        "currency": "INR",
        "travel_style": "Luxury",
        "preferences": ["beach", "spa"],
        "status": "NEW",
        "priority": 1,
    }

    response = http_client.post(
        f"{base_url}/api/v1/leads/",
        json=lead_data,
        headers=auth_headers,
    )
    assert response.status_code in (200, 201, 202), f"Lead creation failed: {response.text}"
    data = response.json()
    assert "id" in data, f"No id in lead response: {data}"

    return data["id"]


# ── Helper Functions ───────────────────────────────────────────────────────────

def make_api_call(
    client: httpx.Client,
    method: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    json: Optional[Dict] = None,
    data: Optional[Dict] = None,
    params: Optional[Dict] = None,
) -> httpx.Response:
    """
    Generic API call helper. Simplifies verbose httpx calls in tests.

    Args:
        client: httpx.Client instance
        method: HTTP method (GET, POST, PUT, PATCH, DELETE)
        url: Full API URL
        headers: Optional request headers
        json: Optional JSON body
        data: Optional form data
        params: Optional query parameters

    Returns:
        httpx.Response object
    """
    method_func = getattr(client, method.lower())
    return method_func(
        url,
        headers=headers,
        json=json,
        data=data,
        params=params,
    )
