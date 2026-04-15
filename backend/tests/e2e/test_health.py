"""
E2E Tests: Health Check
========================
Tests for system health endpoint (no auth required).

Coverage:
  - Health check returns 200 with status "healthy"
  - Health check does NOT require Authorization header
  - Health check includes version info and hard stop status
"""

import pytest
import httpx


class TestHealthCheck:
    """GET /api/v1/health"""

    def test_health_check_success(self, http_client: httpx.Client, base_url: str):
        """GET /health returns 200 with status 'healthy'."""
        response = http_client.get(f"{base_url}/api/v1/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"

        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data

    def test_health_includes_hard_stop_status(self, http_client: httpx.Client, base_url: str):
        """Health check includes hard stop status."""
        response = http_client.get(f"{base_url}/api/v1/health")
        assert response.status_code == 200

        data = response.json()
        assert "hard_stops" in data
        hard_stops = data["hard_stops"]

        # Verify all 4 hard stops are reported
        expected_stops = [
            "HS1_auth_jwt_claims",
            "HS2_rls_tenant_scope",
            "HS3_payment_safety",
            "HS4_ai_cost_controls",
        ]

        for stop in expected_stops:
            assert stop in hard_stops, f"Missing hard stop: {stop}"
            assert hard_stops[stop] == "resolved", f"Hard stop {stop} not resolved: {hard_stops[stop]}"

    def test_health_no_auth_required(self, http_client: httpx.Client, base_url: str):
        """Health check does NOT require Authorization header."""
        # Make request without any auth headers
        response = http_client.get(f"{base_url}/api/v1/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"

    def test_health_with_invalid_auth_ignored(self, http_client: httpx.Client, base_url: str):
        """Health check succeeds even with invalid auth (auth is not required)."""
        response = http_client.get(
            f"{base_url}/api/v1/health",
            headers={"Authorization": "Bearer invalid-token-xyz"},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"

    def test_health_response_structure(self, http_client: httpx.Client, base_url: str):
        """Health response has required structure."""
        response = http_client.get(f"{base_url}/api/v1/health")
        assert response.status_code == 200

        data = response.json()
        # Verify response structure
        assert isinstance(data, dict)
        assert isinstance(data.get("status"), str)
        assert isinstance(data.get("timestamp"), str)
        assert isinstance(data.get("version"), str)
        assert isinstance(data.get("hard_stops"), dict)
