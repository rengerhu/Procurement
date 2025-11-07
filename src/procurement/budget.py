"""Budget management utilities."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from .models import BudgetRecord, PurchaseOrder, PurchaseRequest
from .repository import ProcurementRepository


class BudgetError(RuntimeError):
    """Raised when budget constraints are violated."""


@dataclass
class BudgetController:
    """Handles reservation and spending of budget amounts."""

    repository: ProcurementRepository

    def _totals_by_category(self, request: PurchaseRequest) -> Dict[str, float]:
        return request.by_category_totals(self.repository.items)

    def validate_request_affordability(self, request: PurchaseRequest) -> None:
        """Ensure that enough budget exists for each category."""

        for category_id, total in self._totals_by_category(request).items():
            record = self.repository.get_budget_by_category(category_id)
            if record is None:
                raise BudgetError(
                    f"No budget defined for category {category_id} (required {total:.2f})"
                )
            if record.available < total - 1e-9:
                raise BudgetError(
                    f"Insufficient funds in budget {record.id} for category {category_id}: "
                    f"available {record.available:.2f}, required {total:.2f}"
                )

    def reserve_for_request(self, request: PurchaseRequest) -> None:
        """Reserve funds for an approved purchase request."""

        for category_id, total in self._totals_by_category(request).items():
            record = self.repository.get_budget_by_category(category_id)
            if record is None:
                raise BudgetError(f"No budget configured for category {category_id}")
            record.reserve(total)

    def release_for_request(self, request: PurchaseRequest) -> None:
        """Release reserved funds when a request is cancelled or rejected."""

        for category_id, total in self._totals_by_category(request).items():
            record = self.repository.get_budget_by_category(category_id)
            if record is None:
                continue
            record.release(total)

    def spend_for_order(self, order: PurchaseOrder) -> None:
        """Spend committed funds when a purchase order is approved."""

        request = self.repository.get_purchase_request(order.request_id)
        totals = request.by_category_totals(self.repository.items)
        for category_id, total in totals.items():
            record = self.repository.get_budget_by_category(category_id)
            if record is None:
                raise BudgetError(f"No budget configured for category {category_id}")
            record.spend(total)


__all__ = ["BudgetController", "BudgetError"]
