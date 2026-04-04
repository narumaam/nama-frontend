from datetime import datetime

from fastapi.testclient import TestClient

from app.main import app
from app.runtime import APP_ENV


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
    assert body["mode"] == APP_ENV
    datetime.fromisoformat(body["timestamp"].replace("Z", "+00:00"))


def test_auth_health_is_scoped_under_auth() -> None:
    response = client.get("/api/v1/auth/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "module": "AUTH"}


def test_cors_allows_local_frontend_origin() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


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
