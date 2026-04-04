from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
from typing import Any, Optional

from app.demo_data import get_demo_case, list_demo_cases
from app.schemas.bookings import BookingItemType, BookingStatus
from app.schemas.financials import TransactionStatus, TransactionType

LOCAL_TENANT_NAME = "NAMA Demo"

_STATE: dict[str, dict[str, Any]] = {}


def _normalize_tenant_name(tenant_name: Optional[str]) -> str:
    tenant = (tenant_name or LOCAL_TENANT_NAME).strip() or LOCAL_TENANT_NAME
    return tenant


def _tenant_key(tenant_name: Optional[str]) -> str:
    return _normalize_tenant_name(tenant_name).lower()


def _now() -> datetime:
    return datetime.utcnow()


def _booking_status_from_finance_status(finance_status: str) -> BookingStatus:
    normalized = finance_status.lower()
    if "settled" in normalized or "received" in normalized:
        return BookingStatus.CONFIRMED
    if "approved" in normalized or "pending" in normalized or "reminder" in normalized:
        return BookingStatus.PENDING_CONFIRMATION
    return BookingStatus.DRAFT


def _seed_booking_item(case: dict[str, Any], booking_id: int, status: BookingStatus) -> dict[str, Any]:
    first_day = case["itinerary"]["days"][0]
    first_block = first_day["blocks"][0]
    start_date = _now() + timedelta(days=30 + booking_id)
    end_date = start_date + timedelta(days=1)

    return {
        "id": booking_id * 100 + 1,
        "booking_id": booking_id,
        "type": BookingItemType(first_block["type"]),
        "item_name": first_block["title"],
        "status": status,
        "vendor_id": 100 + booking_id,
        "confirmation_number": None,
        "voucher_url": None,
        "start_date": start_date,
        "end_date": end_date,
        "cost_net": first_block.get("cost_net", case["finance"]["cost_total"]),
        "price_gross": first_block.get("price_gross", case["finance"]["quote_total"]),
        "currency": first_block.get("currency", "INR"),
    }


def _seed_case_record(case: dict[str, Any]) -> dict[str, Any]:
    booking_id = case["lead_id"]
    status = _booking_status_from_finance_status(case["finance"]["status"])
    item = _seed_booking_item(case, booking_id, status)
    inflow_status = TransactionStatus.RECONCILED if status == BookingStatus.CONFIRMED else TransactionStatus.PENDING

    return {
        "slug": case["slug"],
        "booking_id": booking_id,
        "lead_id": case["lead_id"],
        "itinerary_id": case["lead_id"],
        "guest_name": case["guest_name"],
        "destination": case["triage"]["destination"],
        "booking": {
            "id": booking_id,
            "itinerary_id": case["lead_id"],
            "lead_id": case["lead_id"],
            "status": status,
            "total_price": case["finance"]["quote_total"],
            "currency": case["finance"].get("currency", "INR"),
            "items": [item],
            "created_at": _now(),
            "updated_at": _now(),
        },
        "payment": {
            "booking_id": booking_id,
            "quote_total": case["finance"]["quote_total"],
            "deposit_due": case["finance"]["deposit_due"],
            "deposit_state": "Recorded" if inflow_status == TransactionStatus.RECONCILED else "Pending",
            "settlement_state": "Pending settlement" if inflow_status == TransactionStatus.PENDING else "Recorded",
            "bank_ref": None,
            "recorded_at": None,
            "updated_at": _now(),
        },
        "transactions": {
            booking_id * 100 + 1: {
                "id": booking_id * 100 + 1,
                "booking_id": booking_id,
                "tenant_id": None,
                "amount": case["finance"]["deposit_due"],
                "currency": case["finance"].get("currency", "INR"),
                "type": TransactionType.INFLOW,
                "status": inflow_status,
                "reference": None,
                "created_at": _now(),
                "updated_at": _now(),
            },
            booking_id * 100 + 2: {
                "id": booking_id * 100 + 2,
                "booking_id": booking_id,
                "tenant_id": None,
                "amount": case["finance"]["cost_total"],
                "currency": case["finance"].get("currency", "INR"),
                "type": TransactionType.OUTFLOW,
                "status": TransactionStatus.COMPLETED,
                "reference": None,
                "created_at": _now(),
                "updated_at": _now(),
            },
        },
        "finance": deepcopy(case["finance"]),
    }


def _seed_tenant_state(tenant_name: str) -> dict[str, Any]:
    return {
        "tenant_name": tenant_name,
        "bookings": {case["lead_id"]: _seed_case_record(case) for case in list_demo_cases()},
    }


def reset_founder_contract_state() -> None:
    _STATE.clear()


def _get_tenant_state(tenant_name: Optional[str]) -> dict[str, Any]:
    key = _tenant_key(tenant_name)
    tenant = _normalize_tenant_name(tenant_name)
    if key not in _STATE:
        _STATE[key] = _seed_tenant_state(tenant)
    return _STATE[key]


def _get_case_record(tenant_name: Optional[str], booking_id: int) -> dict[str, Any]:
    tenant_state = _get_tenant_state(tenant_name)
    record = tenant_state["bookings"].get(booking_id)
    if not record:
        raise KeyError(f"Unknown booking id: {booking_id}")
    return record


def _booking_response(record: dict[str, Any], tenant_id: int) -> dict[str, Any]:
    booking = deepcopy(record["booking"])
    booking["tenant_id"] = tenant_id
    return booking


def _transaction_response(record: dict[str, Any], tenant_id: int) -> dict[str, Any]:
    transaction = deepcopy(record)
    transaction["tenant_id"] = tenant_id
    return transaction


def list_founder_bookings(tenant_name: Optional[str]) -> list[dict[str, Any]]:
    tenant_state = _get_tenant_state(tenant_name)
    bookings = [deepcopy(record["booking"]) for record in tenant_state["bookings"].values()]
    bookings.sort(key=lambda booking: booking["id"] or 0)
    return bookings


def get_founder_booking(tenant_name: Optional[str], booking_id: int) -> dict[str, Any]:
    return deepcopy(_get_case_record(tenant_name, booking_id)["booking"])


def confirm_founder_booking(tenant_name: Optional[str], booking_id: int) -> dict[str, Any]:
    record = _get_case_record(tenant_name, booking_id)
    booking = record["booking"]
    if booking["status"] == BookingStatus.CANCELLED:
        raise ValueError("Cancelled bookings cannot be confirmed")
    booking["status"] = BookingStatus.CONFIRMED
    booking["updated_at"] = _now()
    for item in booking["items"]:
        item["status"] = BookingStatus.CONFIRMED
        if not item.get("confirmation_number"):
            item["confirmation_number"] = f"CNF-{booking_id:04d}"
    payment = record["payment"]
    payment["deposit_state"] = "Recorded"
    payment["settlement_state"] = "Recorded"
    payment["updated_at"] = _now()
    inflow = record["transactions"][booking_id * 100 + 1]
    inflow["status"] = TransactionStatus.RECONCILED
    inflow["updated_at"] = _now()
    return deepcopy(booking)


def cancel_founder_booking(tenant_name: Optional[str], booking_id: int) -> dict[str, Any]:
    record = _get_case_record(tenant_name, booking_id)
    booking = record["booking"]
    booking["status"] = BookingStatus.CANCELLED
    booking["updated_at"] = _now()
    for item in booking["items"]:
        item["status"] = BookingStatus.CANCELLED
    return deepcopy(booking)


def generate_founder_voucher(tenant_name: Optional[str], booking_id: int) -> dict[str, Any]:
    record = _get_case_record(tenant_name, booking_id)
    booking = record["booking"]
    if booking["status"] not in {BookingStatus.CONFIRMED, BookingStatus.COMPLETED}:
        raise PermissionError("Voucher can only be generated for confirmed bookings")

    voucher_id = f"VCH-{booking_id:04d}"
    voucher_url = f"https://api.nama.travel/v1/vouchers/{voucher_id}.pdf"
    for item in booking["items"]:
        item["voucher_url"] = voucher_url

    booking["updated_at"] = _now()
    return {
        "booking_id": booking_id,
        "voucher_id": voucher_id,
        "download_url": voucher_url,
        "generated_at": _now(),
    }


def list_founder_transactions(tenant_name: Optional[str]) -> list[dict[str, Any]]:
    tenant_state = _get_tenant_state(tenant_name)
    transactions: list[dict[str, Any]] = []
    for record in tenant_state["bookings"].values():
        transactions.extend(deepcopy(list(record["transactions"].values())))
    return transactions


def get_founder_booking_profit(tenant_name: Optional[str], booking_id: int) -> dict[str, Any]:
    record = _get_case_record(tenant_name, booking_id)
    finance = record["finance"]
    return {
        "booking_id": booking_id,
        "total_inflow": finance["quote_total"],
        "total_outflow": finance["cost_total"],
        "net_profit": finance["gross_profit"],
        "margin_percentage": finance["margin_percent"],
        "currency": finance.get("currency", "INR"),
    }


def reconcile_founder_transaction(tenant_name: Optional[str], transaction_id: int, bank_ref: str) -> dict[str, Any]:
    tenant_state = _get_tenant_state(tenant_name)
    for record in tenant_state["bookings"].values():
        transaction = record["transactions"].get(transaction_id)
        if not transaction:
            continue
        if transaction["type"] != TransactionType.INFLOW:
            raise ValueError("Only inflow transactions can be reconciled")
        if record["booking"]["status"] == BookingStatus.CANCELLED:
            raise ValueError("Cancelled bookings cannot be reconciled")

        transaction["status"] = TransactionStatus.RECONCILED
        transaction["reference"] = bank_ref
        transaction["updated_at"] = _now()
        record["payment"]["deposit_state"] = "Recorded"
        record["payment"]["settlement_state"] = "Recorded"
        record["payment"]["bank_ref"] = bank_ref
        record["payment"]["recorded_at"] = _now()
        record["payment"]["updated_at"] = _now()
        booking = record["booking"]
        if booking["status"] != BookingStatus.CANCELLED:
            booking["status"] = BookingStatus.CONFIRMED
            booking["updated_at"] = _now()
            for item in booking["items"]:
                item["status"] = BookingStatus.CONFIRMED
                if not item.get("confirmation_number"):
                    item["confirmation_number"] = f"CNF-{booking['id']:04d}"
        return deepcopy(transaction)
    raise KeyError(f"Unknown transaction id: {transaction_id}")


def get_founder_payment_snapshot(tenant_name: Optional[str], booking_id: int) -> dict[str, Any]:
    record = _get_case_record(tenant_name, booking_id)
    payment = deepcopy(record["payment"])
    payment["booking_id"] = booking_id
    payment["booking_status"] = record["booking"]["status"]
    payment["currency"] = record["booking"]["currency"]
    return payment


def record_founder_payment(tenant_name: Optional[str], booking_id: int, bank_ref: Optional[str] = None) -> dict[str, Any]:
    record = _get_case_record(tenant_name, booking_id)
    if record["booking"]["status"] == BookingStatus.CANCELLED:
        raise ValueError("Cancelled bookings cannot be marked as paid")
    inflow = record["transactions"][booking_id * 100 + 1]
    inflow["status"] = TransactionStatus.RECONCILED
    inflow["reference"] = bank_ref
    inflow["updated_at"] = _now()
    booking = record["booking"]
    booking["status"] = BookingStatus.CONFIRMED
    booking["updated_at"] = _now()
    for item in booking["items"]:
        item["status"] = BookingStatus.CONFIRMED
        if not item.get("confirmation_number"):
            item["confirmation_number"] = f"CNF-{booking_id:04d}"
    payment = record["payment"]
    payment["deposit_state"] = "Recorded"
    payment["settlement_state"] = "Recorded"
    payment["bank_ref"] = bank_ref
    payment["recorded_at"] = _now()
    payment["updated_at"] = _now()
    return get_founder_payment_snapshot(tenant_name, booking_id)


def summarize_founder_financials(tenant_name: Optional[str]) -> dict[str, Any]:
    transactions = list_founder_transactions(tenant_name)
    inflows = [transaction for transaction in transactions if transaction["type"] == TransactionType.INFLOW]
    outflows = [transaction for transaction in transactions if transaction["type"] == TransactionType.OUTFLOW]
    pending_settlements = sum(
        transaction["amount"] for transaction in inflows if transaction["status"] == TransactionStatus.PENDING
    )
    realized_inflow = sum(
        transaction["amount"]
        for transaction in inflows
        if transaction["status"] in {TransactionStatus.COMPLETED, TransactionStatus.RECONCILED}
    )
    realized_outflow = sum(
        transaction["amount"]
        for transaction in outflows
        if transaction["status"] in {TransactionStatus.COMPLETED, TransactionStatus.RECONCILED}
    )
    reconciled_at = max(
        [transaction["updated_at"] for transaction in transactions if transaction["status"] == TransactionStatus.RECONCILED],
        default=_now(),
    )

    return {
        "balance_available": realized_inflow - realized_outflow,
        "pending_settlements": pending_settlements,
        "currency": "INR",
        "last_reconciled": reconciled_at,
    }
