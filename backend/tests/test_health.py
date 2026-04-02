from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root_is_live() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "NAMA OS Backend API is live"}


def test_global_health_endpoint_is_platform_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["mode"] == "demo"
    assert body["timestamp"].startswith("2026-04-02T")


def test_auth_health_is_scoped_under_auth() -> None:
    response = client.get("/api/v1/auth/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "module": "AUTH"}


def test_key_module_health_endpoints_are_reachable() -> None:
    for path in (
        "/api/v1/queries/health",
        "/api/v1/itineraries/health",
        "/api/v1/analytics/health",
        "/api/v1/portals/health",
        "/api/v1/content/health",
        "/api/v1/rsi/health",
        "/api/v1/sentinel/health",
    ):
        response = client.get(path)
        assert response.status_code == 200, path
