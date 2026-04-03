from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_tenant_sessions_health() -> None:
    response = client.get("/api/v1/sessions/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "module": "TENANT_SESSIONS"}


def test_issue_tenant_session() -> None:
    response = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": "sales@aurora.example",
            "display_name": "Sales Lead",
            "role": "sales",
            "scope": "tenant",
            "tenant_name": "Aurora Reserve Travel",
            "member_id": "aurora-sales-1",
            "member_status": "Active",
            "designation": "Travel Consultant",
            "team": "Sales Desk",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "sales"
    assert body["scope"] == "tenant"
    assert body["tenant_name"] == "Aurora Reserve Travel"
    assert body["member_id"] == "aurora-sales-1"


def test_issue_super_admin_session() -> None:
    response = client.post(
        "/api/v1/sessions/super-admin",
        json={
            "email": "control@nama.internal",
            "display_name": "NAMA Super Admin",
            "role": "super-admin",
            "scope": "platform",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "super-admin"
    assert body["scope"] == "platform"
    assert body["tenant_name"] is None
