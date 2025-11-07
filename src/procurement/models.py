"""Core domain models for the procurement system."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, Iterable, List, Optional


class RequestStatus(str, Enum):
    """Lifecycle of a purchase request."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class OrderStatus(str, Enum):
    """Lifecycle of a purchase order."""

    DRAFT = "draft"
    APPROVAL_PENDING = "approval_pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    """Lifecycle of a payment request."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass
class ProductCategory:
    """Represents a grouping for similar product items."""

    id: str
    name: str
    description: Optional[str] = None


@dataclass
class ProductItem:
    """Defines a purchasable item."""

    id: str
    category_id: str
    name: str
    unit_cost: float
    description: Optional[str] = None


@dataclass
class BudgetRecord:
    """Represents the financial constraints for a category."""

    id: str
    category_id: str
    allocated: float
    committed: float = 0.0
    spent: float = 0.0

    @property
    def available(self) -> float:
        return self.allocated - self.committed - self.spent

    def reserve(self, amount: float) -> None:
        if amount < 0:
            raise ValueError("Amount to reserve must be positive")
        if amount > self.available + 1e-9:
            raise ValueError("Insufficient available budget to reserve")
        self.committed += amount

    def release(self, amount: float) -> None:
        if amount < 0:
            raise ValueError("Amount to release must be positive")
        if amount > self.committed + 1e-9:
            raise ValueError("Cannot release more than committed")
        self.committed -= amount

    def spend(self, amount: float) -> None:
        if amount < 0:
            raise ValueError("Amount to spend must be positive")
        if amount > self.committed + self.available + 1e-9:
            raise ValueError("Insufficient budget to spend")
        # Spending may come from either committed or directly available.
        committed_reduction = min(self.committed, amount)
        self.committed -= committed_reduction
        self.spent += amount


@dataclass
class PurchaseRequestItem:
    """Line item for a purchase request."""

    item_id: str
    quantity: int
    unit_price: float

    @property
    def total_price(self) -> float:
        return self.quantity * self.unit_price


@dataclass
class PurchaseRequest:
    """Aggregates requested items and approval metadata."""

    id: str
    requester: str
    justification: str
    items: List[PurchaseRequestItem] = field(default_factory=list)
    status: RequestStatus = RequestStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None

    @property
    def total_amount(self) -> float:
        return sum(item.total_price for item in self.items)

    def by_category_totals(self, item_catalogue: Dict[str, ProductItem]) -> Dict[str, float]:
        totals: Dict[str, float] = {}
        for line in self.items:
            if line.item_id not in item_catalogue:
                raise KeyError(f"Unknown item '{line.item_id}' referenced by request {self.id}")
            category_id = item_catalogue[line.item_id].category_id
            totals.setdefault(category_id, 0.0)
            totals[category_id] += line.total_price
        return totals


@dataclass
class PurchaseOrderItem:
    """Line item on a purchase order."""

    item_id: str
    quantity: int
    unit_price: float

    @property
    def total_price(self) -> float:
        return self.quantity * self.unit_price


@dataclass
class PurchaseOrder:
    """Formal order issued to a supplier."""

    id: str
    request_id: str
    supplier: str
    items: List[PurchaseOrderItem] = field(default_factory=list)
    status: OrderStatus = OrderStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None

    @property
    def total_amount(self) -> float:
        return sum(item.total_price for item in self.items)


@dataclass
class PaymentRequest:
    """Request to disburse funds for a purchase order."""

    id: str
    purchase_order_id: str
    amount: float
    payee: str
    status: PaymentStatus = PaymentStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None


def clone_request_items(request: PurchaseRequest) -> List[PurchaseOrderItem]:
    """Clone purchase request items into order items."""

    return [
        PurchaseOrderItem(item_id=line.item_id, quantity=line.quantity, unit_price=line.unit_price)
        for line in request.items
    ]


def ensure_positive_quantity(items: Iterable[PurchaseRequestItem]) -> None:
    """Validate that each item has a positive quantity and price."""

    for item in items:
        if item.quantity <= 0:
            raise ValueError("Item quantity must be positive")
        if item.unit_price <= 0:
            raise ValueError("Item unit price must be positive")
