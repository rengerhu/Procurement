# Procurement Demo

A static procurement management experience that combines a browser-based front-end with the
underlying Python domain model. The front-end is designed for GitHub Pages deployment and persists
sample data directly in the browser so you can explore procurement workflows without a backend.

## Live-ready front-end

The `/index.html` entry point and accompanying pages can be hosted from the repository root (for
example via `https://rengerhu.github.io/Procurement/`). Each page includes a `<base href="/Procurement/">`
so relative links work when published under the project namespace.

### Pages

| Path | Purpose |
| --- | --- |
| `/index.html` | Overview, feature highlights, and navigation |
| `/requests.html` | Manage purchase requests, line items, and approvals |
| `/orders.html` | Create purchase orders from approved requests |
| `/payments.html` | Track payment requests and mark invoices paid |
| `/about.html` | Project background and contact links |

### Assets

All shared resources live under `/assets`:

- `styles.css` — modern responsive styling, optimized for desktop and mobile layouts.
- `utils.js` — formatting helpers and ID utilities.
- `ui.js` — table rendering, modal dialogs, toasts, and form utilities.
- `app.js` — localStorage data store, seed data, workflow validation, and budget recalculation.

Each page also includes a "Reset demo data" button to reseed the local dataset.

## Data model

The seeded data covers:

- **Categories** with allocated, committed, spent, and available budgets.
- **Products** linked to categories with per-unit pricing.
- **Purchase Requests** with Draft → Submitted → Approved → Rejected/Cancelled transitions.
- **Purchase Orders** generated from approved requests with the ability to close orders.
- **Payment Requests** tied to purchase orders and transitioning through Submitted → Approved → Paid.

Budget figures recompute automatically whenever requests, orders, or payments change so the category
cards always reflect the latest commitments.

## Running locally

No build tooling is required. Because every page sets `<base href="/Procurement/">`, serve the
repository from a parent directory so the site resolves under `/Procurement/`:

```bash
cd ..
python -m http.server 8000
```

Then navigate to <http://localhost:8000/Procurement/index.html>.

## Python domain model & tests

The original Python procurement library remains available under `src/procurement/` with unit tests in
`tests/`. To exercise those workflows run:

```bash
pytest
```

Both the Python module and the static front-end are self-contained, so you can explore the
application either in the browser or through the automated tests.
