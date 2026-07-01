# Cloth Inventory DB Schema

Single warehouse. No branches, no separate wholesaler accounts — every person who places
an order is just a row in `users` (`role = admin | staff`, see `CLAUDE.md`). Stock lives in
one place: on the `products` row itself (`quantity_available` / `quantity_reserved`),
not in a per-location join table.

Product catalog hierarchy: **divisions → categories → sub_categories → products**.
Divisions are the top-level business lines (`KIDS WEAR`, `MENS WEAR`, `LADIES WEAR`, …).
Every category belongs to exactly one division; every sub_category belongs to exactly
one category. Admin manages all three levels.

## Catalog hierarchy (lookup tables)

### divisions

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| name | varchar(100) | Unique. `KIDS WEAR`, `MENS WEAR`, `LADIES WEAR`… |
| is_active | boolean | Default true; inactive divisions are hidden from new-product/order pickers |
| created_at, updated_at | timestamp | |

### categories

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| division_id (FK → divisions.id) | bigint unsigned | `ON DELETE RESTRICT` — can't delete a division while categories reference it |
| name | varchar(100) | e.g. Topwear, Bottomwear, Ethnic, Saree |
| is_active | boolean | Default true |
| created_at, updated_at | timestamp | |

Unique constraint on `(division_id, name)` — same category name can exist under a
different division (e.g. "Ethnic" under both Kids Wear and Ladies Wear) but not twice
under the same one.

### sub_categories

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| category_id (FK → categories.id) | bigint unsigned | `ON DELETE RESTRICT` |
| name | varchar(100) | e.g. Casual Shirts, Party Wear |
| is_active | boolean | Default true |
| created_at, updated_at | timestamp | |

Unique constraint on `(category_id, name)`.

### brands (optional, kept from original catalog)

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| name | varchar(100) | Unique |
| is_active | boolean | Default true |
| created_at, updated_at | timestamp | |

## Core stock tables

### products — master catalog (one row per sellable SKU, i.e. per color+size)

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| product_code | varchar(50) | Unique, human-readable SKU code (e.g. `MW-SHRT-0042`); shown on-screen instead of the numeric `id`; app-generated, not user-typed, to avoid collisions |
| barcode | varchar(50) | Unique; nullable (not every SKU is barcoded yet) |
| division_id (FK → divisions.id) | bigint unsigned | Denormalized for fast filtering; must match `category.division_id` (enforced in service layer, not just via category) |
| category_id (FK → categories.id) | bigint unsigned | `ON DELETE RESTRICT` |
| sub_category_id (FK → sub_categories.id) | bigint unsigned | Nullable — some products may not need a sub-category; `ON DELETE RESTRICT` when set |
| brand_id (FK → brands.id) | bigint unsigned | Nullable |
| name | varchar(200) | T-shirt / Jeans / Saree / Combo… |
| description | text | Nullable |
| color | varchar(50) | Nullable |
| size | varchar(10) | S / M / L / XL / 28 / 30 / Free Size… |
| mrp | decimal(10,2) | Maximum retail price; `CHECK (mrp >= 0)` |
| wsp | decimal(10,2) | Wholesale/order price charged to users; `CHECK (wsp >= 0 AND wsp <= mrp)` |
| quantity_available | int unsigned | Sellable stock on hand right now; `CHECK (quantity_available >= 0)` |
| quantity_reserved | int unsigned | Held against pending/accepted orders not yet dispatched; `CHECK (quantity_reserved >= 0)` |
| reorder_level | int unsigned | Default 0; used by low-stock reports (`quantity_available <= reorder_level`) instead of a separate reorder-request workflow |
| unit | varchar(20) | `pc`, `set`, `pair`… default `pc` |
| product_photo_url | text | Nullable |
| is_active | boolean | Default true; inactive products can't be ordered but stay visible in history/reports (no soft-delete column needed — `is_active` is a business state, not a delete flag) |
| created_at, updated_at | timestamp | |

Notes / edge cases:
- "Sellable stock" = `quantity_available`. Total physical stock in the warehouse is
  `quantity_available + quantity_reserved`.
- `wsp <= mrp` is enforced both in the Zod schema and as a DB `CHECK` (MySQL 8.0.16+),
  since two safety nets are cheap and this number reaches invoices.
- Ordering an inactive product must be rejected at the service layer (`AppError(400, ...)`),
  not just hidden in the UI.

### inward_entries — stock receipt log

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| product_id (FK → products.id) | bigint unsigned | `ON DELETE RESTRICT` |
| quantity_received | int unsigned | `CHECK (quantity_received > 0)` |
| supplier_name | varchar(200) | |
| invoice_number | varchar(100) | Nullable |
| received_by (FK → users.id) | bigint unsigned | |
| received_at | timestamp | Default now |
| notes | text | Nullable |

On insert: `products.quantity_available += quantity_received` in the same transaction,
plus a `stock_ledger` row (see below). This is the only way stock enters the system.

### stock_ledger — append-only movement log (backs the Stock Ledger module)

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| product_id (FK → products.id) | bigint unsigned | `ON DELETE RESTRICT` |
| movement_type | enum | `inward` · `order_reserved` · `order_released` · `dispatched` · `adjustment` |
| quantity_change | int | Signed: positive for stock in, negative for stock out |
| reference_type | enum | `inward_entry` · `order` · `dispatch` · `adjustment` |
| reference_id | bigint unsigned | Points at the row named by `reference_type`; no DB-level FK (polymorphic) — validated in the service layer |
| created_by (FK → users.id) | bigint unsigned | |
| created_at | timestamp | Default now |

Every write to `products.quantity_available` / `quantity_reserved` happens inside a
transaction that also inserts exactly one `stock_ledger` row, so the ledger is always a
reconstructable audit trail of *why* stock moved — this is core business record-keeping
for a stock-tracking app, not the kind of user-action audit log `CLAUDE.md` says to skip.

## Order tables

Replaces the old `branch_orders` / `wholesale_orders` split — there is exactly one
order table now, since there's exactly one kind of user.

### orders

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| order_number | varchar(50) | Unique, app-generated (e.g. `ORD-2026-000123`) |
| ordered_by (FK → users.id) | bigint unsigned | |
| status | enum | `pending` · `accepted` · `rejected` · `partially_dispatched` · `dispatched` · `cancelled` |
| total_mrp | decimal(12,2) | Sum of `mrp_at_order * qty_ordered`; snapshot, not recomputed later |
| total_wsp | decimal(12,2) | Sum of `wsp_at_order * qty_ordered` — the amount actually owed |
| notes | text | Nullable |
| created_at, updated_at | timestamp | |

### order_items

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| order_id (FK → orders.id) | bigint unsigned | `ON DELETE CASCADE` (items are meaningless without the order) |
| product_id (FK → products.id) | bigint unsigned | `ON DELETE RESTRICT` |
| quantity_ordered | int unsigned | `CHECK (quantity_ordered > 0)` |
| quantity_dispatched | int unsigned | Default 0; filled incrementally as dispatches happen; `CHECK (quantity_dispatched <= quantity_ordered)` |
| mrp_at_order | decimal(10,2) | Snapshot of `products.mrp` at order time |
| wsp_at_order | decimal(10,2) | Snapshot of `products.wsp` at order time |

Edge cases / lifecycle:
- **Placing an order** (`POST /orders`, status → `pending`): for each line item, inside one
  transaction, lock the product row (`SELECT ... FOR UPDATE`), verify
  `quantity_available >= quantity_ordered`, then move stock:
  `quantity_available -= qty`, `quantity_reserved += qty`, insert an `order_reserved`
  ledger row. If any line fails the stock check, the whole order is rejected — no partial
  reservation. This prevents two concurrent orders from overselling the same SKU.
- **Rejecting / cancelling** (`PATCH /orders/:id/status`, only from `pending` or
  `accepted`, and only for the not-yet-dispatched quantity): reverse the reservation —
  `quantity_reserved -= remaining`, `quantity_available += remaining`, insert an
  `order_released` ledger row.
- **Accepting**: status `pending → accepted`. Stock was already reserved at placement
  time, so acceptance doesn't move stock — it's a staff sign-off gate before dispatch.
- **Dispatching** (see `dispatches` below) consumes reserved stock; it never touches
  `quantity_available` directly.
- A product can't be deleted while any `order_items` row references it — `ON DELETE
  RESTRICT`. Deactivate (`is_active = false`) instead.

## Dispatch tables

### dispatches

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| order_id (FK → orders.id) | bigint unsigned | `ON DELETE RESTRICT` |
| dispatch_number | varchar(50) | Unique, app-generated challan/reference number |
| status | enum | `pending` · `dispatched` · `delivered` |
| dispatched_by (FK → users.id) | bigint unsigned | |
| dispatched_at | timestamp | Nullable until status moves to `dispatched` |
| notes | text | Nullable — shortages, damage remarks, etc. |
| created_at | timestamp | |

An order can have more than one dispatch (partial fulfillment across multiple trips).

### dispatch_items

| Column | Type | Notes |
|---|---|---|
| id (PK) | bigint unsigned auto_increment | |
| dispatch_id (FK → dispatches.id) | bigint unsigned | `ON DELETE CASCADE` |
| order_item_id (FK → order_items.id) | bigint unsigned | `ON DELETE RESTRICT` |
| product_id (FK → products.id) | bigint unsigned | `ON DELETE RESTRICT` — denormalized for reporting even if the order_item is old |
| quantity_dispatched | int unsigned | `CHECK (quantity_dispatched > 0)` |

On insert, in the same transaction:
1. `CHECK`: `quantity_dispatched <= (order_items.quantity_ordered - order_items.quantity_dispatched)`
   for the referenced `order_item_id` — can't dispatch more than what's still owed.
2. `products.quantity_reserved -= quantity_dispatched`; insert a `dispatched` ledger row
   (stock has now physically left the warehouse — it does **not** go back into
   `quantity_available`).
3. `order_items.quantity_dispatched += quantity_dispatched`.
4. Recompute the parent order's `status`: all items fully dispatched → `dispatched`;
   some but not all → `partially_dispatched`.

## Reference

### users

Defined in full in `CLAUDE.md` (`role ENUM('admin','staff')`, auth/session columns).
Both roles can place orders and can accept/dispatch orders — there is no longer a
distinct "branch user" or "wholesaler" role; `ordered_by`, `received_by`,
`dispatched_by`, `created_by` above all point at this single table.

## What was removed from the previous version of this schema

- `branches`, `branch_orders`, `branch_order_items`, `branch_stock`, `branch_returns` —
  no branch concept; there's one warehouse.
- `wholesalers`, `wholesale_orders`, `wholesale_order_items` — no separate wholesaler
  account type; folded into `users` + `orders`.
- `warehouse_stock` as a separate table — collapsed onto `products` since there's only
  ever one location to hold stock for.
- `reorder_requests` — replaced by a `reorder_level` column on `products` plus a
  low-stock report query; a full request/notify workflow was over-engineered for a
  single warehouse with no branches to request *from*.
