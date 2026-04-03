from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def tenant_admin_headers(tenant_name: str) -> dict[str, str]:
    tenant_token = "".join(character for character in tenant_name.lower() if character.isalnum())[:8].upper()
    session_response = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": f"admin@{''.join(character for character in tenant_name.lower() if character.isalnum())}.demo",
            "scope": "tenant",
            "tenant_name": tenant_name,
            "access_code": f"NAMA-{tenant_token}-ADMIN",
        },
    )
    assert session_response.status_code == 200
    return {"x-nama-session-id": session_response.json()["id"]}


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
        headers=tenant_admin_headers("Aurora Reserve Travel"),
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
        headers=tenant_admin_headers("Aurora Reserve Travel"),
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
