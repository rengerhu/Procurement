"""High level services for the procurement system."""
from __future__ import annotations

from dataclasses import replace
from typing import Optional, Sequence

from .budget import BudgetController, BudgetError
from .exceptions import EntityNotFound, InvalidStatusTransition
from .models import (
    BudgetRecord,
    OrderStatus,
    PaymentRequest,
    PaymentStatus,
    ProductCategory,
    ProductItem,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseRequest,
    PurchaseRequestItem,
    RequestStatus,
    clone_request_items,
    ensure_positive_quantity,
)
from .repository import ProcurementRepository
from .workflows import order_workflow, payment_workflow, request_workflow


class ProcurementService:
    """Facade exposing procurement workflows."""

    def __init__(self, repository: Optional[ProcurementRepository] = None):
        self.repository = repository or ProcurementRepository()
        self.budget_controller = BudgetController(self.repository)

    # Master data operations -------------------------------------------------
    def create_category(self, category_id: str, name: str, description: Optional[str] = None) -> ProductCategory:
        category = ProductCategory(id=category_id, name=name, description=description)
        self.repository.add_category(category)
        return category

    def create_item(
        self, item_id: str, category_id: str, name: str, unit_cost: float, description: Optional[str] = None
    ) -> ProductItem:
        if unit_cost <= 0:
            raise ValueError("Unit cost must be greater than zero")
        item = ProductItem(id=item_id, category_id=category_id, name=name, unit_cost=unit_cost, description=description)
        self.repository.add_item(item)
        return item

    def configure_budget(self, budget_id: str, category_id: str, amount: float) -> BudgetRecord:
        if amount <= 0:
            raise ValueError("Budget amount must be positive")
        budget = BudgetRecord(id=budget_id, category_id=category_id, allocated=amount)
        self.repository.add_budget(budget)
        return budget

    # Purchase request -------------------------------------------------------
    def create_purchase_request(
        self,
        request_id: str,
        requester: str,
        justification: str,
        items: Sequence[PurchaseRequestItem],
    ) -> PurchaseRequest:
        ensure_positive_quantity(items)
        for item in items:
            if item.item_id not in self.repository.items:
                raise EntityNotFound(f"Unknown product item {item.item_id}")
        request = PurchaseRequest(
            id=request_id,
            requester=requester,
            justification=justification,
            items=list(items),
        )
        self.repository.save_purchase_request(request)
        return request

    def submit_purchase_request(self, request_id: str) -> PurchaseRequest:
        request = self.repository.get_purchase_request(request_id)
        if request.status != RequestStatus.DRAFT:
            raise InvalidStatusTransition("Only draft requests can be submitted")
        request_workflow.transition(request, request.status, RequestStatus.SUBMITTED)
        request.status = RequestStatus.SUBMITTED
        return request

    def approve_purchase_request(self, request_id: str) -> PurchaseRequest:
        request = self.repository.get_purchase_request(request_id)
        if request.status != RequestStatus.SUBMITTED:
            raise InvalidStatusTransition("Only submitted requests can be approved")
        self.budget_controller.validate_request_affordability(request)
        request_workflow.transition(request, request.status, RequestStatus.APPROVED)
        request.status = RequestStatus.APPROVED
        self.budget_controller.reserve_for_request(request)
        return request

    def reject_purchase_request(self, request_id: str) -> PurchaseRequest:
        request = self.repository.get_purchase_request(request_id)
        if request.status != RequestStatus.SUBMITTED:
            raise InvalidStatusTransition("Only submitted requests can be rejected")
        request_workflow.transition(request, request.status, RequestStatus.REJECTED)
        request.status = RequestStatus.REJECTED
        return request

    def cancel_purchase_request(self, request_id: str) -> PurchaseRequest:
        request = self.repository.get_purchase_request(request_id)
        if request.status != RequestStatus.APPROVED:
            raise InvalidStatusTransition("Only approved requests can be cancelled")
        request_workflow.transition(request, request.status, RequestStatus.CANCELLED)
        request.status = RequestStatus.CANCELLED
        self.budget_controller.release_for_request(request)
        return request

    # Purchase order ---------------------------------------------------------
    def create_purchase_order(
        self,
        order_id: str,
        request_id: str,
        supplier: str,
        items: Optional[Sequence[PurchaseOrderItem]] = None,
    ) -> PurchaseOrder:
        request = self.repository.get_purchase_request(request_id)
        if request.status != RequestStatus.APPROVED:
            raise InvalidStatusTransition("Purchase orders can only be raised from approved requests")
        if items is None:
            order_items = clone_request_items(request)
        else:
            order_items = [replace(item) for item in items]
        order = PurchaseOrder(id=order_id, request_id=request_id, supplier=supplier, items=order_items)
        self.repository.save_purchase_order(order)
        return order

    def submit_purchase_order(self, order_id: str) -> PurchaseOrder:
        order = self.repository.get_purchase_order(order_id)
        if order.status != OrderStatus.DRAFT:
            raise InvalidStatusTransition("Only draft orders can be submitted for approval")
        order_workflow.transition(order, order.status, OrderStatus.APPROVAL_PENDING)
        order.status = OrderStatus.APPROVAL_PENDING
        return order

    def approve_purchase_order(self, order_id: str) -> PurchaseOrder:
        order = self.repository.get_purchase_order(order_id)
        if order.status != OrderStatus.APPROVAL_PENDING:
            raise InvalidStatusTransition("Only orders pending approval can be approved")
        order_workflow.transition(order, order.status, OrderStatus.APPROVED)
        order.status = OrderStatus.APPROVED
        self.budget_controller.spend_for_order(order)
        return order

    def reject_purchase_order(self, order_id: str) -> PurchaseOrder:
        order = self.repository.get_purchase_order(order_id)
        if order.status != OrderStatus.APPROVAL_PENDING:
            raise InvalidStatusTransition("Only orders pending approval can be rejected")
        order_workflow.transition(order, order.status, OrderStatus.REJECTED)
        order.status = OrderStatus.REJECTED
        return order

    # Payment requests -------------------------------------------------------
    def create_payment_request(
        self,
        payment_id: str,
        purchase_order_id: str,
        amount: float,
        payee: str,
    ) -> PaymentRequest:
        order = self.repository.get_purchase_order(purchase_order_id)
        if order.status != OrderStatus.APPROVED:
            raise InvalidStatusTransition("Payments can only be requested for approved orders")
        if amount <= 0:
            raise ValueError("Payment amount must be positive")
        if amount > order.total_amount + 1e-9:
            raise ValueError("Payment amount cannot exceed order total")
        payment = PaymentRequest(id=payment_id, purchase_order_id=purchase_order_id, amount=amount, payee=payee)
        self.repository.save_payment_request(payment)
        return payment

    def submit_payment_request(self, payment_id: str) -> PaymentRequest:
        payment = self.repository.get_payment_request(payment_id)
        if payment.status != PaymentStatus.DRAFT:
            raise InvalidStatusTransition("Only draft payments can be submitted")
        payment_workflow.transition(payment, payment.status, PaymentStatus.SUBMITTED)
        payment.status = PaymentStatus.SUBMITTED
        return payment

    def approve_payment_request(self, payment_id: str) -> PaymentRequest:
        payment = self.repository.get_payment_request(payment_id)
        if payment.status != PaymentStatus.SUBMITTED:
            raise InvalidStatusTransition("Only submitted payments can be approved")
        payment_workflow.transition(payment, payment.status, PaymentStatus.APPROVED)
        payment.status = PaymentStatus.APPROVED
        return payment

    def reject_payment_request(self, payment_id: str) -> PaymentRequest:
        payment = self.repository.get_payment_request(payment_id)
        if payment.status != PaymentStatus.SUBMITTED:
            raise InvalidStatusTransition("Only submitted payments can be rejected")
        payment_workflow.transition(payment, payment.status, PaymentStatus.REJECTED)
        payment.status = PaymentStatus.REJECTED
        return payment


__all__ = ["ProcurementService", "BudgetError", "InvalidStatusTransition", "EntityNotFound"]
