"""Workflow helpers for approvals."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Dict, Iterable

from .models import OrderStatus, PaymentStatus, RequestStatus


@dataclass(frozen=True)
class Transition:
    """Represents a valid state transition."""

    source: str
    target: str
    validator: Callable[[object], None] | None = None
    post_action: Callable[[object], None] | None = None

    def execute(self, instance: object) -> None:
        if self.validator:
            self.validator(instance)
        if self.post_action:
            self.post_action(instance)


class Workflow:
    """Generic workflow engine for simple state transitions."""

    def __init__(self, transitions: Iterable[Transition]):
        self._transitions: Dict[tuple[str, str], Transition] = {
            (transition.source, transition.target): transition
            for transition in transitions
        }

    def transition(self, instance: object, source: str, target: str) -> None:
        key = (source, target)
        if key not in self._transitions:
            raise ValueError(f"Invalid transition {source} -> {target}")
        self._transitions[key].execute(instance)


request_workflow = Workflow(
    transitions=[
        Transition(
            source=RequestStatus.DRAFT,
            target=RequestStatus.SUBMITTED,
            post_action=lambda request: setattr(request, "submitted_at", datetime.utcnow()),
        ),
        Transition(
            source=RequestStatus.SUBMITTED,
            target=RequestStatus.APPROVED,
            post_action=lambda request: setattr(request, "approved_at", datetime.utcnow()),
        ),
        Transition(
            source=RequestStatus.SUBMITTED,
            target=RequestStatus.REJECTED,
            post_action=lambda request: setattr(request, "rejected_at", datetime.utcnow()),
        ),
        Transition(
            source=RequestStatus.APPROVED,
            target=RequestStatus.CANCELLED,
            post_action=lambda request: setattr(request, "rejected_at", datetime.utcnow()),
        ),
    ]
)

order_workflow = Workflow(
    transitions=[
        Transition(
            source=OrderStatus.DRAFT,
            target=OrderStatus.APPROVAL_PENDING,
            post_action=lambda order: None,
        ),
        Transition(
            source=OrderStatus.APPROVAL_PENDING,
            target=OrderStatus.APPROVED,
            post_action=lambda order: setattr(order, "approved_at", datetime.utcnow()),
        ),
        Transition(
            source=OrderStatus.APPROVAL_PENDING,
            target=OrderStatus.REJECTED,
            post_action=lambda order: setattr(order, "approved_at", datetime.utcnow()),
        ),
        Transition(
            source=OrderStatus.APPROVED,
            target=OrderStatus.CANCELLED,
            post_action=lambda order: setattr(order, "approved_at", datetime.utcnow()),
        ),
    ]
)

payment_workflow = Workflow(
    transitions=[
        Transition(
            source=PaymentStatus.DRAFT,
            target=PaymentStatus.SUBMITTED,
            post_action=lambda payment: setattr(payment, "approved_at", None),
        ),
        Transition(
            source=PaymentStatus.SUBMITTED,
            target=PaymentStatus.APPROVED,
            post_action=lambda payment: setattr(payment, "approved_at", datetime.utcnow()),
        ),
        Transition(
            source=PaymentStatus.SUBMITTED,
            target=PaymentStatus.REJECTED,
            post_action=lambda payment: setattr(payment, "approved_at", datetime.utcnow()),
        ),
    ]
)

__all__ = [
    "Transition",
    "Workflow",
    "request_workflow",
    "order_workflow",
    "payment_workflow",
]
