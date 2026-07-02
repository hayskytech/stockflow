# StockFlow

Tagline: "From Warehouse to Store — Seamlessly"

## Concept

I want to make a webapp for stock management. There is a single warehouse in which stock is stored. It is cloth business (dresses, sarees, kidware, menswear etc). Users place orders for items from the warehouse. Staff/admin accept the order and dispatch items. Our dashboard / webapp tracks these orders and stock management.

## Feature Module Names

- Dashboard
- Warehouse (single-record settings: name, address, contact, and bank transfer details shown to customers at checkout)
- Catalog (divisions → categories → sub_categories — admin-managed product taxonomy)
- Products (mrp, wsp, product_code, barcode, stock, category… see `cloth_inventory_db_schema.md`)
- Inward (stock receipt entries against a product)
- Stock Ledger
- Orders
- Dispatches
- Reports
- Users / Staff
- Media Library (shared image uploads, reused across features)
- Storefront (customer-facing ecommerce home, product detail page, cart, checkout — products browsed category-wise)

## Stack

- **Frontend**: React + Vite + JavaScript + AdminLTE + Bootstrap + Zustand + TanStack Query + TanStack Form
- **Backend**: Express + JavaScript + mysql2 (raw parameterized SQL — no ORM)
- **Database**: MySQL
- **API Docs**: Swagger (swagger-jsdoc + swagger-ui-express)
- **Frontend Docs**: Docsify
- **Hosting**: cPanel Linux hosting (Node.js Selector) — no Docker, no CI/CD

See `CLAUDE.md` for the full folder structure, auth implementation, roles/permissions, and coding conventions — this file only tracks product concept and feature scope.

## Media Concept

A single, centralized media library (WordPress-style) instead of per-feature image fields — any image uploaded anywhere in the app becomes one reusable row, so a product photo can be picked from existing uploads instead of re-uploading the same file.

- **Uppy** (Dashboard UI) handles the upload experience in the browser — drag-drop, progress, previews — and posts the file straight to `POST /api/media`.
- The server is the source of truth: it re-validates the file is really an image, strips EXIF data, converts it to **WebP**, and compresses it down to **under 500KB**, regardless of what the client sent.
- Identical uploads are deduplicated by content hash, so the same image is never stored twice.
- Files are sharded on disk by hash (not by upload date) to keep folders evenly sized and support reuse.
- A `media_usage` join table tracks which records (e.g. a product) reference which image, so unused media can be found and safely deleted, and in-use media can't be deleted by mistake.

## Auth Concept

JWT-based auth with access + refresh tokens.

- **Login** (`POST /auth/login`) — validates email/password against `users` table (bcrypt hash). Generic "Invalid email or password" error — never reveal whether the email exists.
- **Account lockout** — after 5 failed attempts, lock the account for 15 minutes (`failed_login_attempts`, `locked_until` columns).
- **Tokens**:
  - Access token (JWT, short-lived e.g. 15m) — carries `sub` (user id) and `role`, used to authorize requests via `Authorization: Bearer <token>`.
  - Refresh token (random opaque string, long-lived e.g. 7d) — stored **hashed** in a `refresh_tokens` table, set as an `httpOnly`, `sameSite=strict`, `secure` (prod) cookie. Never sent in JSON body.
- **Refresh rotation** (`POST /auth/refresh`) — every refresh consumes (revokes) the old token and issues a new pair. If a revoked/already-used token is replayed, treat it as token theft: revoke **all** sessions for that user.
- **Logout** (`POST /auth/logout`) — revokes the refresh token and clears the cookie.
- **Me** (`GET /auth/me`) — returns the authenticated user's safe profile (excludes password hash, token data).
- **Forced password change** — `must_change_password` flag on user (e.g. first login / admin reset) forces `POST /auth/change-password` before normal use. New password policy: min 8 chars, upper, lower, number, special char.
- **Middleware**: `authenticate` — verifies the Bearer access token, attaches decoded payload to `req.user`, rejects with 401 on missing/invalid/expired token.
- **Rate limiting**: login/refresh/change-password endpoints behind a stricter limiter to slow brute-force attempts.

### Session Management (Admin)

Each row in `refresh_tokens` represents one active session (one login on one device). A `last_used_at` column (touched on every `/auth/refresh`) lets sessions show recency, not just creation time.

- **List sessions** — `GET /users/:id/sessions` (self) and `GET /admin/sessions` (admin, all users) — return non-revoked, non-expired `refresh_tokens` rows: device/user agent, ip address, created_at, last_used_at, expires_at. Never expose the token hash itself.
- **Terminate a session** — `DELETE /admin/sessions/:sessionId` (or self `/users/me/sessions/:sessionId`) — sets `revoked_at = NOW()` on that row. The corresponding access token remains valid until it naturally expires (short-lived, e.g. 15m), so termination is effective within one access-token lifetime — acceptable since access tokens are short-lived by design.
- **Terminate all sessions for a user** — `DELETE /admin/users/:id/sessions` — revokes every active `refresh_tokens` row for that user (admin "force logout everywhere", e.g. on suspected compromise or staff offboarding).
- Only the **Admin** role can view/terminate other users' sessions; any user can view/terminate their own.

### Roles for StockFlow

Three roles, no per-user scoping, since there's no branch concept and only a single warehouse:

- **Admin** — full access: manages Users/Staff, warehouse settings, products/stock, orders/dispatches, and reports.
- **Staff** — operational role: places orders, accepts/dispatches orders, manages stock. Cannot manage users or warehouse settings.
- **Customer** — self-registered storefront shopper. Browse-only access to the product catalog via a separate storefront UI; no back-office access.

Role is embedded in the access token payload (`{ sub, role }`) so every route handler can authorize without an extra DB lookup.

### Storefront (Customer) Concept

Customers are a distinct audience from the back-office team, so they get a **separate ecommerce experience**, not the AdminLTE dashboard:

- **Signup** — customers self-register at the public `POST /auth/register` (role hard-coded server-side to `customer`) and are auto-logged-in. Admins can also create users of any role (`admin`/`staff`/`customer`) from the Users page.
- **Storefront shell** — a top-navbar layout (`StoreShell`, mounted at `/store`) with **no admin sidebar**. The home page lists active products grouped by category, ecommerce-style (image, name, WSP price with MRP struck-through, stock badge).
- **Product detail, cart, checkout** — clicking a product opens a detail page to add it to the cart; the cart (Zustand, persisted to localStorage) is reviewed/edited on `/store/cart` and finalized on `/store/checkout` (shipping details form).
- **Placing an order** — bank transfer is the only payment method: the checkout page shows the warehouse's bank account details (from `GET /warehouse`) and the customer enters the transaction ID from their transfer. `POST /orders` re-validates price/stock server-side, reserves stock transactionally, and creates the order (`status=pending`, `paymentStatus=pending`). Customers can view their own order history at `/store/orders` and cancel a still-pending order themselves.
- **Role-based landing** — after login, customers land on `/store`; admin/staff land on the dashboard. Route guards keep each audience out of the other's area.
- **Scope** — browsing, product detail, cart, checkout, and order placement are all implemented end-to-end.

## Users & Roles — Enhanced Plan

### Data model

```sql
-- users
id               PK
name
email            UNIQUE
password_hash
role             ENUM('admin','staff','customer')
is_active
must_change_password
failed_login_attempts, locked_until
created_at, updated_at
```

### Authorization middleware

- **`requireRole(...roles)`** — checks `req.user.role` is one of the allowed roles (e.g. `requireRole('admin')`).

### Permission matrix (high level)

| Action                                                                 | Admin | Staff | Customer |
| ---------------------------------------------------------------------- | ----- | ----- | -------- |
| Manage warehouse settings (name/address/contact)                       | ✅    | ❌    | ❌       |
| Manage users (create admin/staff/customer, reset password, deactivate) | ✅    | ❌    | ❌       |
| View/manage products & stock                                           | ✅    | ✅    | ❌       |
| Browse product catalog (storefront)                                    | ✅    | ✅    | ✅       |
| Place orders                                                           | ✅    | ✅    | ✅       |
| Accept/dispatch orders                                                 | ✅    | ✅    | ❌       |
| View/manage payment status (bank transfer verification)                | ✅    | ✅    | ❌       |
| Cancel own order (while pending)                                       | ✅    | ✅    | ✅       |
| View reports                                                           | ✅    | ✅    | ❌       |
| View/terminate sessions — own                                          | ✅    | ✅    | ✅       |
| View/terminate sessions — others                                       | ✅    | ❌    | ❌       |

### Onboarding flow

1. Admin sets up the Warehouse record (`PUT /warehouse`) — name, address, contact details.
2. Admin creates Users, choosing `role` (`admin`, `staff`, or `customer`).
3. New user logs in with a temporary password and is forced through `must_change_password` before normal use (existing Auth Concept flow).
4. Customers may also self-register at `POST /auth/register` (public) and are auto-logged-in into the storefront — no admin involvement, no forced password change.

## Backend Routes Implementation Plan

Folder structure mirrors `CLAUDE.md` (just JS instead of TS, no build-step concerns since it's not compiled):

```
backend/src/
  app.js                        # express app, mounts middleware + routers, error handler last
  index.js                      # server bootstrap
  config/env.js                 # required()/optional() env loader
  db/pool.js                    # mysql2 pool
  db/query.js                   # executeQuery(sql, params) — only place raw SQL runs
  middleware/
    auth.js                     # authenticate (verifies access token, sets req.user)
    requireRole.js               # requireRole('admin', 'staff', ...) — role guard
    errorHandler.js              # AppError class + global handler (last middleware)
    rateLimiter.js                # generalLimiter, authLimiter
    pagination.js                 # parses page/per_page/search/orderby/order + filters → req.listQuery
  modules/
    auth/        auth.router.js  auth.controller.js  auth.service.js  auth.schema.js
    users/       ...
    warehouse/   ...
    catalog/     ...   # divisions, categories, sub_categories
    products/    ...
    inward/      ...
    stockLedger/ ...
    orders/      ...
    dispatches/  ...
    reports/     ...
  utils/jwt.js, logger.js
```

Each module follows the same 4-file split as `auth`: **router** (wires path → middleware → controller), **controller** (req/res, calls service, no SQL), **service** (SQL via `executeQuery`, business logic), **schema** (input validation, e.g. with `zod` or `joi`).

DB design for these modules — divisions/categories/sub_categories hierarchy, `products` fields (`mrp`, `wsp`, `product_code`, `barcode`, `quantity_available`/`quantity_reserved`, `reorder_level`), the `stock_ledger` append-only movement log, and the single unified `orders`/`order_items`/`dispatches`/`dispatch_items` tables (no branch or wholesaler tables — every orderer is just a `users` row) — is defined in `cloth_inventory_db_schema.md`.

### Pagination & filtering — WordPress REST API style

A shared `middleware/pagination.js` parses query params on every list (`GET /collection`) route and attaches a normalized `req.listQuery` object, so list controllers/services never touch `req.query` directly:

| Query param                 | Meaning                                           | Default                            | Notes                                                                                  |
| --------------------------- | ------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `page`                      | 1-based page number                               | `1`                                |                                                                                        |
| `per_page`                  | items per page                                    | `10`                               | capped at `max=100` to prevent abuse                                                   |
| `search`                    | free-text search                                  | —                                  | matched against a per-module whitelisted set of columns (e.g. product name/SKU)        |
| `orderby`                   | sort column                                       | module default (e.g. `created_at`) | must be in a per-module whitelist — never interpolate raw client input into `ORDER BY` |
| `order`                     | `asc` \| `desc`                                   | `desc`                             |                                                                                        |
| _(module-specific filters)_ | e.g. `status`, `category`, `date_from`, `date_to` | —                                  | declared per-route, validated by the route's schema                                    |

Mirroring the WP REST API response convention:

- Response **body** is the plain array of items (no wrapper object).
- Pagination metadata goes in **response headers**: `X-WP-Total` (total matching rows) and `X-WP-TotalPages` (total pages given `per_page`).

Service-layer pattern: each list service builds `WHERE`/`ORDER BY`/`LIMIT ... OFFSET ...` from `req.listQuery` using a whitelist of allowed filter/sort columns per module (never string-concatenate user-controlled column names; values always go through parameterized placeholders).

### Example routes per module

- **Warehouse** — `GET /warehouse`, `PUT /warehouse` — single-record settings (name, address, contact); admin only for write.
- **Catalog** — `GET/POST/PUT/DELETE /divisions`, `GET/POST/PUT/DELETE /categories` (`division_id`), `GET/POST/PUT/DELETE /sub-categories` (`category_id`) — admin only for write, staff read-only; deletes are blocked (`ON DELETE RESTRICT`) while children/products still reference the row — use `is_active=false` instead.
- **Products** — `GET /products` (`search`, `division_id`, `category_id`, `sub_category_id`, `brand_id`, `is_active`), CRUD — admin/staff for write. Enforces `wsp <= mrp` and unique `product_code`/`barcode`.
- **Inward** — `GET /inward` (`product_id`, `date_from`, `date_to`), `POST /inward` — admin/staff; increments product stock inside a transaction that also writes a `stock_ledger` row.
- **Stock Ledger** — `GET /stock-ledger` (`product_id`, `movement_type`, `date_from`, `date_to`) — read-only, append-only log of every stock movement.
- **Orders** — `GET /orders` (`status`, `date_from`, `date_to` — scoped to the requester's own orders for customers, all orders for admin/staff), `POST /orders` (locks + reserves stock per line item, all-or-nothing on insufficient stock; captures shipping details, the bank transfer `transaction_id`, and an idempotency key so a retried submit can't double-reserve stock), `PATCH /orders/:id/status` (accept/reject/cancel — reject/cancel releases reserved stock back to `quantity_available`; a customer may cancel their own still-pending order), `PATCH /orders/:id/payment-status` (admin/staff mark a bank transfer verified/rejected, independent of the accept/reject decision). Payment is bank transfer only for now — account details come from the Warehouse settings.
- **Dispatches** — `GET /dispatches` (`order_id`, `status`), `POST /dispatches` (creates a dispatch against an accepted order; supports partial fulfillment — order status becomes `partially_dispatched` until every line is fully dispatched; consumes reserved stock, never re-adds to `quantity_available`).
- **Reports** — `GET /reports/stock-summary` (includes low-stock via `quantity_available <= reorder_level`), `GET /reports/order-history` (`date_from`, `date_to`) — aggregate queries, no full pagination needed (or paginated same way if rows can be large).
- **Users / Staff** — `GET /users` (`role`, `search`), CRUD — admin only. Plus the session endpoints from **Session Management (Admin)** above.

All write routes (`POST`/`PUT`/`PATCH`/`DELETE`) go through `authenticate` + `requireRole(...)`; list/read routes go through `authenticate` + `pagination`.

## Testing

`testing/` is a separate, isolated npm install (Playwright) for end-to-end frontend tests — Page Object Model (`pages/`), reusable login fixtures (`fixtures/`), specs under `tests/`. Demo credentials live in a gitignored `.env.test`. Backend API verification within the same specs is planned next.

## Repo Structure

- `backend/` — Express API
- `frontend/` — React App
- `testing/` — Playwright (e2e tests)
