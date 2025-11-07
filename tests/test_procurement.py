import pytest

from procurement import (
    BudgetError,
    OrderStatus,
    PaymentStatus,
    ProcurementService,
    RequestStatus,
)
from procurement.models import PurchaseRequestItem


@pytest.fixture()
def service() -> ProcurementService:
    service = ProcurementService()
    service.create_category("office", "Office Supplies")
    service.create_category("it", "IT Equipment")
    service.create_item("paper", "office", "Printer Paper", unit_cost=5.0)
    service.create_item("laptop", "it", "Laptop", unit_cost=1200.0)
    service.configure_budget("budget-office", "office", 500.0)
    service.configure_budget("budget-it", "it", 5000.0)
    return service


def test_procurement_flow(service: ProcurementService) -> None:
    request = service.create_purchase_request(
        "PR-001",
        requester="Alice",
        justification="Restock supplies",
        items=[
            PurchaseRequestItem(item_id="paper", quantity=10, unit_price=4.5),
            PurchaseRequestItem(item_id="laptop", quantity=2, unit_price=1100.0),
        ],
    )
    assert request.status == RequestStatus.DRAFT

    service.submit_purchase_request("PR-001")
    assert request.status == RequestStatus.SUBMITTED

    service.approve_purchase_request("PR-001")
    assert request.status == RequestStatus.APPROVED

    order = service.create_purchase_order("PO-001", request_id="PR-001", supplier="ACME Corp")
    assert order.request_id == "PR-001"
    assert len(order.items) == 2
    assert order.items[0].item_id == "paper"

    service.submit_purchase_order("PO-001")
    assert order.status == OrderStatus.APPROVAL_PENDING

    service.approve_purchase_order("PO-001")
    assert order.status == OrderStatus.APPROVED

    payment = service.create_payment_request("PAY-001", "PO-001", amount=order.total_amount, payee="ACME Corp")
    assert payment.amount == order.total_amount
    assert payment.status == PaymentStatus.DRAFT

    service.submit_payment_request("PAY-001")
    service.approve_payment_request("PAY-001")
    assert payment.status == PaymentStatus.APPROVED


def test_budget_violation(service: ProcurementService) -> None:
    service.create_item("server", "it", "Server", unit_cost=8000.0)
    service.create_purchase_request(
        "PR-002",
        requester="Bob",
        justification="New server",
        items=[PurchaseRequestItem(item_id="server", quantity=1, unit_price=8000.0)],
    )
    service.submit_purchase_request("PR-002")
    with pytest.raises(BudgetError):
        service.approve_purchase_request("PR-002")
