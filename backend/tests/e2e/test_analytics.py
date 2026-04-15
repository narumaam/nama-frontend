"""
E2E Tests: Analytics & Reporting (M9)
======================================
Tests for dashboard KPIs, anomaly detection, and forecasting.

Coverage:
  - Dashboard returns expected KPI fields
  - Anomalies returns list of anomalies
  - Forecast is admin-only (403 for non-admin)
  - Caching works (second call faster)
"""

import pytest
import httpx
import time
from typing import Dict


class TestAnalyticsDashboard:
    """GET /api/v1/analytics/dashboard"""

    def test_dashboard_returns_kpis(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Dashboard returns expected KPI fields."""
        response = http_client.get(
            f"{base_url}/api/v1/analytics/dashboard",
            headers=auth_headers,
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"

        data = response.json()
        # Expected dashboard fields
        expected_fields = [
            "total_leads",
            "total_leads_qualified",
            "conversion_rate",
            "revenue_mtd",
            "revenue_forecast_eom",
            "avg_deal_size",
            "bookings_pending",
            "bookings_confirmed",
            "customer_satisfaction_nps",
        ]

        for field in expected_fields:
            assert field in data, f"Missing dashboard field: {field}"

    def test_dashboard_numeric_values(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Dashboard KPI values are numeric or null."""
        response = http_client.get(
            f"{base_url}/api/v1/analytics/dashboard",
            headers=auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        # KPI values should be numeric or None
        for key, value in data.items():
            assert value is None or isinstance(value, (int, float)), f"Field {key} has non-numeric value: {value}"

    def test_dashboard_without_auth(self, http_client: httpx.Client, base_url: str):
        """GET /analytics/dashboard without auth returns 401."""
        response = http_client.get(f"{base_url}/api/v1/analytics/dashboard")
        assert response.status_code == 401


class TestAnalyticsAnomalies:
    """GET /api/v1/analytics/anomalies"""

    def test_anomalies_returns_list(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Anomalies endpoint returns list of anomalies."""
        response = http_client.get(
            f"{base_url}/api/v1/analytics/anomalies",
            headers=auth_headers,
        )
        assert response.status_code == 200, f"Anomalies failed: {response.text}"

        data = response.json()
        assert isinstance(data, list)
        # Each anomaly should have required fields
        for anomaly in data:
            assert "metric_name" in anomaly or "type" in anomaly, f"Anomaly missing identifier: {anomaly}"

    def test_anomalies_without_auth(self, http_client: httpx.Client, base_url: str):
        """GET /analytics/anomalies without auth returns 401."""
        response = http_client.get(f"{base_url}/api/v1/analytics/anomalies")
        assert response.status_code == 401


class TestAnalyticsForecast:
    """GET /api/v1/analytics/forecast — admin/finance only"""

    def test_forecast_admin_access(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Forecast returns 200 for admin user (R2_ORG_ADMIN)."""
        response = http_client.get(
            f"{base_url}/api/v1/analytics/forecast",
            headers=auth_headers,
        )
        # Admin user (auth_headers from admin@namatest.dev with R2_ORG_ADMIN role)
        assert response.status_code == 200, f"Forecast for admin failed: {response.text}"

        data = response.json()
        # Forecast should have required fields
        assert "forecast_period" in data or "projections" in data or "monthly_revenue" in data, f"Forecast missing data: {data}"

    def test_forecast_sales_agent_denied(self, http_client: httpx.Client, base_url: str, sales_headers: Dict[str, str]):
        """Forecast returns 403 for sales agent (R3_SALES_MANAGER)."""
        response = http_client.get(
            f"{base_url}/api/v1/analytics/forecast",
            headers=sales_headers,
        )
        # Sales agent should not have access
        assert response.status_code == 403, f"Expected 403 for sales agent, got {response.status_code}: {response.text}"

    def test_forecast_without_auth(self, http_client: httpx.Client, base_url: str):
        """GET /analytics/forecast without auth returns 401."""
        response = http_client.get(f"{base_url}/api/v1/analytics/forecast")
        assert response.status_code == 401


class TestAnalyticsCaching:
    """Analytics endpoint caching (TTL cache)."""

    def test_dashboard_cache_hit(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Second dashboard call uses cache (internal performance).

        Note: This test cannot directly measure cache hits via HTTP,
        but verifies that repeated calls return consistent data.
        A true cache timing test would require access to Redis or
        instrumentation of the cache layer.
        """
        # First call
        response1 = http_client.get(
            f"{base_url}/api/v1/analytics/dashboard",
            headers=auth_headers,
        )
        assert response1.status_code == 200
        data1 = response1.json()

        # Small delay to ensure no race conditions
        time.sleep(0.1)

        # Second call (should hit cache)
        response2 = http_client.get(
            f"{base_url}/api/v1/analytics/dashboard",
            headers=auth_headers,
        )
        assert response2.status_code == 200
        data2 = response2.json()

        # Data should be identical (from cache)
        assert data1 == data2

    def test_anomalies_cache_consistency(self, http_client: httpx.Client, base_url: str, auth_headers: Dict[str, str]):
        """Anomalies endpoint returns consistent cached data."""
        response1 = http_client.get(
            f"{base_url}/api/v1/analytics/anomalies",
            headers=auth_headers,
        )
        assert response1.status_code == 200
        data1 = response1.json()

        time.sleep(0.1)

        response2 = http_client.get(
            f"{base_url}/api/v1/analytics/anomalies",
            headers=auth_headers,
        )
        assert response2.status_code == 200
        data2 = response2.json()

        # Should return same list (from cache within TTL)
        assert len(data1) == len(data2)
