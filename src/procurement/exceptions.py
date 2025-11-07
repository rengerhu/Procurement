"""Custom exceptions for procurement workflows."""


class ProcurementError(RuntimeError):
    """Base class for procurement errors."""


class InvalidStatusTransition(ProcurementError):
    """Raised when a workflow transition is not allowed."""


class EntityNotFound(ProcurementError):
    """Raised when an entity cannot be located."""


__all__ = ["ProcurementError", "InvalidStatusTransition", "EntityNotFound"]
