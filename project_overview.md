# StockFlow

Tagline: "Stock management for every business, in one place."

## Concept

StockFlow is a **multi-tenant SaaS** for stock management, aimed at cloth businesses (dresses,
sarees, kidware, menswear, etc.). Each business gets its own catalog, stock, orders, dispatches,
reports and settings — there is **no data sharing between businesses**.

Within a business, stock lives in one place; members place orders against it, and admins/staff
accept and dispatch them. Dashboards track orders and stock movement per business.

> This file tracks product concept and scope only.
> For folder structure, auth implementation, roles/permissions and coding conventions, see `CLAUDE.md`.
> For the migration from the old single-tenant app to this model and its current status, see `multitenant_plan.md`.

## Tenancy model

- **Super admin** — a global flag on a user (`is_super_admin`). Creates/edits/deactivates businesses,
  assigns each business its first admin, and can act inside any business as an admin. Owns the global
  user directory.
- **Business admin** — a user with a `memberships` row `(user, business, role='admin')`. Full control
  of *that* business.
- **Business staff** *(future scope — data model built now, UI later)* — a `memberships` row with
  `role='staff'` and a per-membership `permissions` JSON for an operational subset of a business.
- **Customer / storefront** — **disabled for now** (on hold). The storefront UI, customer login,
  registration and OTP flows are unmounted; the code is retained for a future per-business storefront.

Key rules:

- **One global user account.** "Admin of business A + staff of business B" is two `memberships` rows
  for the same user — no user duplication.
- **One login serves every business.** The user authenticates once (email + password); the access
  token carries the full membership list. Switching business is a URL change, not a re-login.
- **Business context is in the URL** — back-office routes are nested under a business segment
  (`/b/:businessId/...` on the frontend, `/api/b/:businessId/...` on the backend). Non-tenant routes
  (`/login`, `/businesses`, `/admin/businesses`, `/admin/users`) stay flat.

## Feature Modules

Per-business back-office (AdminLTE shell):

- **Dashboard** — summary widgets for the current business.
- **Business Settings** *(formerly "Warehouse")* — single per-business settings record: name, address,
  contact, currency/format, phone country code, and bank-transfer details.
- **Catalog** — categories → sub-categories (admin-managed product taxonomy). **No divisions** — the
  divisions layer has been removed.
- **Sizes** — admin-managed predefined size picklist (reorderable); `products.size` / `stock.size`
  store the picked value as plain text, not a foreign key.
- **Products** — `price` + `discount_percent` pricing; the customer-facing price is always computed
  (`price * (1 - discount_percent/100)`), never stored. `product_code` unique per business.
- **Stock** — quantity-based intake batches received against a product (see Stock Concept).
- **Stock Ledger** — append-only log of every stock movement.
- **Media Library** — shared image uploads, reused across features (see Media Concept).
- **Orders** — lifecycle `pending → accepted → dispatched → completed`, with `rejected`/`cancelled`
  as terminal exits from `pending`. Reservation happens only on `pending → accepted`.
- **Dispatches** — outward flow: one-step confirmation that releases reserved quantity, writes a
  ledger row per product and flips the order to `dispatched`.
- **Reports** — stock summary (incl. low-stock), order history, stock movement — aggregate queries.
- **Users / Members** — manage the members of the current business (and their roles).

Global / super-admin:

- **Businesses** — super admin creates/edits/deactivates businesses and assigns their admins.
- **User directory** — global list of all user accounts across businesses.

## Stock Concept

Stock is tracked as quantities, not per physical unit. `products.quantity_available` /
`products.quantity_reserved` are the source of truth for stock on hand; the `stock` table is a
receipt/batch ledger — one row per intake event (e.g. one line of a supplier invoice), with a
quantity — not a table of individually-trackable items. All stock records are scoped to a business.

- **Add Stock** — pick a product and enter a quantity, invoice no/date, price/discount, size, and
  note to create one intake batch; no barcodes are entered anywhere. Each batch carries its own
  price/discount (can vary within a product, e.g. by size).
- **Bulk import** — upload an `.xlsx`/`.csv` file to create many batches at once; rows are matched to
  existing products by name + category, and the whole file is rejected if any row is invalid,
  unmatched, or the invoice number was already imported for that business.
- Every stock create/delete writes a `stock_ledger` row and keeps `products.quantity_available` in
  sync. Deleting a batch is rejected (409) if the product's `quantity_available` is less than the
  batch quantity (some of it is reserved or dispatched).

**Outward (dispatch)** is the mirror of intake: all stock leaves through orders. Placing an order
does not reserve stock; accepting it locks and reserves the ordered quantity against each product
(all-or-nothing; the order stays `pending` with a 409 if stock ran out). Dispatching an accepted
order is a one-step confirmation (courier/AWB/note, no scanning) that releases the reserved quantity,
writes a `stock_ledger` row per product, and flips the order to `dispatched` in the same
transaction. For walk-in/phone sales, admin/staff create a manual order (`requestedFor` +
`offline` payment) and dispatch it the same way.

## Media Concept

A single, centralized media library (WordPress-style) instead of per-feature image fields — any
image uploaded anywhere in a business becomes one reusable row, so a product photo can be picked
from existing uploads instead of re-uploading the same file. **Media is per-business, never shared
across businesses.**

- **Uppy** (Dashboard UI) handles the upload experience in the browser — drag-drop, progress,
  previews — and posts the file straight to `POST /api/b/:businessId/media`.
- The server is the source of truth: it re-validates the file is really an image, strips EXIF data,
  converts it to **WebP**, and compresses it to **under 500KB**, regardless of what the client sent.
- Identical uploads are deduplicated by content hash **within a business**, so the same image is
  never stored twice for one tenant.
- Files are sharded on disk by hash (not by upload date) to keep folders evenly sized.
- A `media_usage` join table tracks which records reference which image, so unused media can be
  found and safely deleted, and in-use media can't be deleted by mistake.

## Pagination & Filtering — WordPress REST API style

A shared `middleware/pagination.js` parses query params on every list (`GET /collection`) route and
attaches a normalized `req.listQuery` object, so list controllers/services never touch `req.query`
directly. Tenant list routes additionally filter every query by the business resolved from the URL.

| Query param                 | Meaning                        | Default                            | Notes                                                                                  |
| --------------------------- | ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `page`                      | 1-based page number            | `1`                                |                                                                                        |
| `per_page`                  | items per page                 | `10`                               | capped at `max=100`                                                                    |
| `search`                    | free-text search               | —                                  | matched against a per-module whitelisted set of columns                               |
| `orderby`                   | sort column                    | module default (e.g. `created_at`) | must be in a per-module whitelist — never interpolate raw client input into `ORDER BY` |
| `order`                     | `asc` \| `desc`                | `desc`                             |                                                                                        |
| _(module-specific filters)_ | e.g. `status`, `date_from`     | —                                  | declared per-route, validated by the route's schema                                    |

Response convention (mirroring the WP REST API):

- Response **body** is the plain array of items (no wrapper object).
- Pagination metadata goes in **response headers**: `X-WP-Total` and `X-WP-TotalPages`.

Service-layer pattern: each list service builds `WHERE`/`ORDER BY`/`LIMIT ... OFFSET ...` from
`req.listQuery` using a per-module whitelist of allowed filter/sort columns (never string-concatenate
user-controlled column names; values always go through parameterized placeholders), scoped to
`business_id`.

## Stack

- **Frontend**: React + Vite + JavaScript + AdminLTE + Bootstrap + Zustand + TanStack Query + TanStack Form
- **Backend**: Express + JavaScript + mysql2 (raw parameterized SQL — no ORM)
- **Database**: MySQL
- **Hosting**: cPanel Linux hosting (Node.js Selector) — no Docker; deployed via a manually-triggered
  Jenkins pipeline (FTP for files + SSH for `npm install` + cPanel API for restart). See `Jenkinsfile`
  and `deployment_guide.md`.

## Repo Structure

- `backend/` — Express API
- `frontend/` — React app
- `database/` — schema + numbered migrations
- `testing/` — Playwright (e2e tests)
