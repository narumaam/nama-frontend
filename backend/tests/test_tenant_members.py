from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_tenant_members_health() -> None:
    response = client.get("/api/v1/tenant-members/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "module": "TENANT_MEMBERS"}


def test_tenant_members_list_contract() -> None:
    response = client.get("/api/v1/tenant-members", params={"tenant_name": "Aurora Reserve Travel"})
    assert response.status_code == 200
    body = response.json()
    assert body["tenant_name"] == "Aurora Reserve Travel"
    assert body["source"] == "backend-demo"
    assert len(body["members"]) >= 4
    assert any(member["role"] == "customer-admin" for member in body["members"])


def test_promote_invite_returns_active_member() -> None:
    response = client.post(
        "/api/v1/tenant-members/promote",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "invite_id": "invite-ritika",
            "name": "Ritika Sen",
            "email": "ritika@aurora.example",
            "role": "sales",
            "designation": "Senior Executive",
            "team": "Sales Desk",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Active"
    assert body["source"] == "accepted-invite"
    assert body["role"] == "sales"
