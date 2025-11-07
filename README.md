# Procurement

This repository provides a lightweight procurement management system implemented in Python. It models
core procurement workflows such as purchase requests, purchase orders, and payment requests with
multi-step approvals and category-based budget control.

## Features

- **Master data** for product categories, product items, and category budgets.
- **Purchase requests** with multiple line items, submission, approval, rejection, and cancellation
  workflows.
- **Purchase orders** generated from approved requests, preserving line item details and enabling
  approval workflows.
- **Payment requests** tied to approved purchase orders with submission and approval states.
- **Budget management** that tracks allocated, committed, and spent amounts per product category.
- An in-memory **repository and service layer** that encapsulate business rules and workflow
  transitions.

## Project layout

```
src/procurement/        # Library source code
├── budget.py           # Budget reservation and spending logic
├── exceptions.py       # Custom exception hierarchy
├── models.py           # Dataclasses describing procurement entities
├── repository.py       # Simple in-memory persistence layer
├── service.py          # High-level façade orchestrating workflows
└── workflows.py        # State machine helpers for approvals

tests/                  # Pytest-based unit tests covering the main flows
```

## Running the tests

```bash
pytest
```

The project has no external dependencies beyond the Python standard library, so you can run the tests
with `pytest` directly in a Python 3.11 environment.
