"""In-memory repositories for procurement entities."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, Optional

from .models import (
    BudgetRecord,
    PaymentRequest,
    ProductCategory,
    ProductItem,
    PurchaseOrder,
    PurchaseRequest,
)


@dataclass
class ProcurementRepository:
    """Stores procurement data in memory."""

    categories: Dict[str, ProductCategory] = field(default_factory=dict)
    items: Dict[str, ProductItem] = field(default_factory=dict)
    budgets: Dict[str, BudgetRecord] = field(default_factory=dict)
    purchase_requests: Dict[str, PurchaseRequest] = field(default_factory=dict)
    purchase_orders: Dict[str, PurchaseOrder] = field(default_factory=dict)
    payment_requests: Dict[str, PaymentRequest] = field(default_factory=dict)

    def add_category(self, category: ProductCategory) -> None:
        if category.id in self.categories:
            raise ValueError(f"Category {category.id} already exists")
        self.categories[category.id] = category

    def add_item(self, item: ProductItem) -> None:
        if item.category_id not in self.categories:
            raise KeyError(f"Category {item.category_id} does not exist")
        if item.id in self.items:
            raise ValueError(f"Item {item.id} already exists")
        self.items[item.id] = item

    def add_budget(self, budget: BudgetRecord) -> None:
        if budget.category_id not in self.categories:
            raise KeyError(f"Category {budget.category_id} does not exist")
        if budget.id in self.budgets:
            raise ValueError(f"Budget {budget.id} already exists")
        self.budgets[budget.id] = budget

    def get_budget_by_category(self, category_id: str) -> Optional[BudgetRecord]:
        return next((b for b in self.budgets.values() if b.category_id == category_id), None)

    def save_purchase_request(self, request: PurchaseRequest) -> None:
        self.purchase_requests[request.id] = request

    def get_purchase_request(self, request_id: str) -> PurchaseRequest:
        if request_id not in self.purchase_requests:
            raise KeyError(f"Purchase request {request_id} not found")
        return self.purchase_requests[request_id]

    def save_purchase_order(self, order: PurchaseOrder) -> None:
        self.purchase_orders[order.id] = order

    def get_purchase_order(self, order_id: str) -> PurchaseOrder:
        if order_id not in self.purchase_orders:
            raise KeyError(f"Purchase order {order_id} not found")
        return self.purchase_orders[order_id]

    def save_payment_request(self, request: PaymentRequest) -> None:
        self.payment_requests[request.id] = request

    def get_payment_request(self, request_id: str) -> PaymentRequest:
        if request_id not in self.payment_requests:
            raise KeyError(f"Payment request {request_id} not found")
        return self.payment_requests[request_id]

    def iter_purchase_orders_for_request(self, request_id: str) -> Iterable[PurchaseOrder]:
        return (order for order in self.purchase_orders.values() if order.request_id == request_id)


__all__ = ["ProcurementRepository"]
