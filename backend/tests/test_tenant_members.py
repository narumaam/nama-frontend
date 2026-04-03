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


def test_upsert_tenant_member() -> None:
    response = client.post(
        "/api/v1/tenant-members/upsert",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "member": {
                "tenant_name": "Aurora Reserve Travel",
                "name": "Ritika Sen",
                "email": "ritika@aurora.example",
                "role": "sales",
                "designation": "Senior Executive",
                "team": "Sales Desk",
                "status": "Invited",
                "source": "manual",
                "reports_to": "Sales Manager",
                "responsibility": "Lead follow-up",
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Invited"
    assert body["source"] == "manual"
    assert body["role"] == "sales"


def test_bulk_upsert_tenant_members() -> None:
    response = client.post(
        "/api/v1/tenant-members/bulk",
        json={
            "tenant_name": "Aurora Reserve Travel",
            "members": [
                {
                    "tenant_name": "Aurora Reserve Travel",
                    "name": "Asha Rao",
                    "email": "asha@aurora.example",
                    "role": "operations",
                    "designation": "Trip Designer",
                    "team": "Luxury Desk",
                    "status": "Seeded",
                    "source": "employee-directory",
                    "reports_to": "Operations Lead",
                    "responsibility": "Trip design",
                },
                {
                    "tenant_name": "Aurora Reserve Travel",
                    "name": "Farah Khan",
                    "email": "farah@aurora.example",
                    "role": "finance",
                    "designation": "Accounts Lead",
                    "team": "Billing",
                    "status": "Active",
                    "source": "employee-directory",
                    "reports_to": "Finance Lead",
                    "responsibility": "Collections",
                },
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tenant_name"] == "Aurora Reserve Travel"
    assert len(body["members"]) >= 4
    assert any(member["email"] == "asha@aurora.example" for member in body["members"])
