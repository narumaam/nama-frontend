from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def issue_tenant_session(tenant_name: str, email: str, access_code: str) -> str:
    response = client.post(
        "/api/v1/sessions/tenant",
        json={
            "email": email,
            "scope": "tenant",
            "tenant_name": tenant_name,
            "access_code": access_code,
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_demo_workflow_can_be_read_with_contract_session() -> None:
    session_id = issue_tenant_session(
        "Aurora Reserve Travel",
        "sales@aurorareservetravel.demo",
        "NAMA-AURORARE-SALES",
    )

    response = client.get(
        "/api/v1/demo/workflow",
        params={"tenant_name": "Aurora Reserve Travel"},
        headers={"x-nama-session-id": session_id},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "backend-demo"
    assert body["cases"]["maldives-honeymoon"]["slug"] == "maldives-honeymoon"


def test_demo_workflow_record_deposit_updates_case_state() -> None:
    session_id = issue_tenant_session(
        "Aurora Reserve Travel",
        "admin@aurorareservetravel.demo",
        "NAMA-AURORARE-ADMIN",
    )

    response = client.post(
        "/api/v1/demo/workflow",
        headers={"x-nama-session-id": session_id},
        json={
            "tenant_name": "Aurora Reserve Travel",
            "slug": "maldives-honeymoon",
            "action": "finance.record-deposit",
            "patch": {
                "leadStage": "Won",
                "financeStatus": "Deposit received and finance release approved",
                "paymentState": "Deposit confirmed",
                "bookingState": "Ready for handoff",
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["cases"]["maldives-honeymoon"]["leadStage"] == "Won"
    assert body["cases"]["maldives-honeymoon"]["paymentState"] == "Deposit confirmed"


def test_demo_workflow_sales_can_advance_lead_stage() -> None:
    session_id = issue_tenant_session(
        "Aurora Reserve Travel",
        "sales@aurorareservetravel.demo",
        "NAMA-AURORARE-SALES",
    )

    response = client.post(
        "/api/v1/demo/workflow",
        headers={"x-nama-session-id": session_id},
        json={
            "tenant_name": "Aurora Reserve Travel",
            "slug": "dubai-bleisure",
            "action": "lead.set-stage",
            "patch": {
                "leadStage": "Won",
                "nextAction": "Release into bookings and share traveler documents",
                "nextActionAt": "Ready now",
                "financeStatus": "Deposit received and finance release approved",
                "paymentState": "Deposit confirmed",
                "bookingState": "Ready for handoff",
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["cases"]["dubai-bleisure"]["leadStage"] == "Won"


def test_demo_workflow_rejects_disallowed_role_for_finance_release() -> None:
    session_id = issue_tenant_session(
        "Aurora Reserve Travel",
        "sales@aurorareservetravel.demo",
        "NAMA-AURORARE-SALES",
    )

    response = client.post(
        "/api/v1/demo/workflow",
        headers={"x-nama-session-id": session_id},
        json={
            "tenant_name": "Aurora Reserve Travel",
            "slug": "maldives-honeymoon",
            "action": "finance.record-deposit",
            "patch": {
                "paymentState": "Deposit confirmed",
            },
        },
    )

    assert response.status_code == 403
