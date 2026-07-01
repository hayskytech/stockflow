# StockFlow

Stock management webapp for a cloth business (dresses, sarees, kidware, menswear). A single warehouse holds stock; users place orders against it, admin/staff accept and dispatch them.

## Stack

- **Frontend**: React + Vite + JavaScript + AdminLTE + Bootstrap + Zustand + TanStack Query + TanStack Form
- **Backend**: Express + JavaScript + mysql2 (raw parameterized SQL — no ORM)
- **Database**: MySQL
- **API Docs**: Swagger (swagger-jsdoc + swagger-ui-express)
- **Frontend Docs**: Docsify
- **Hosting**: cPanel Linux hosting (Node.js Selector) — no Docker, no CI/CD pipelines

## Repo Structure

- `backend/` — Express API
- `frontend/` — React app

## Folder and Naming Consistency

The folder structures defined in this file are mandatory — do not invent new patterns or deviate from them:

- Every backend feature lives in `backend/src/modules/<module-name>/` with exactly the four defined files — no more, no less
- Every frontend feature lives in `frontend/src/features/<feature-name>/` with exactly the defined files and subfolders
- Backend module names and their corresponding frontend feature names must match exactly (e.g. `modules/orders/` ↔ `features/orders/`)
- File names within a module follow the `<module-name>.<role>.js` pattern — e.g. `orders.service.js`, never `orderService.js` or `service.js`
- Never create a file outside the defined structure without first updating this document to reflect the new pattern

## Backend Module Structure

Each feature module lives in `backend/src/modules/<module-name>/` and contains exactly four files:

- `<module>.schema.js` — Zod (or Joi) schemas for validating request input
- `<module>.service.js` — business logic and DB queries via `executeQuery()`; no Express types, no `req`/`res`
- `<module>.controller.js` — HTTP layer; parses request, calls service, sends response, passes errors to `next()`
- `<module>.router.js` — Express router; registers routes with their middleware and controller handlers

```
backend/src/
  app.js                        # express app, mounts middleware + routers, error handler last
  index.js                      # server bootstrap
  config/env.js                 # required()/optional() env loader
  db/pool.js                    # mysql2 pool
  db/query.js                   # executeQuery(sql, params) — only place raw SQL runs
  middleware/
    auth.js                     # authenticate (verifies access token, sets req.user)
    requireRole.js              # requireRole('admin', 'staff', ...) — role guard
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

## Frontend Feature Structure

Each domain feature lives in `frontend/src/features/<feature-name>/` and contains:

- `<feature>.api.js` — all API calls for this feature (plain axios functions that return data); the only place that talks to the backend
- `<feature>.store.js` — Zustand store for this feature: **UI/client state only** (filters, selected rows, open modals, pagination cursor); never async data fetching
- `<feature>.schema.js` — Zod (or Yup) schemas used for client-side form validation with TanStack Form; must be consistent with the backend schema for the same feature
- `hooks/` — TanStack Query hooks for this feature (e.g. `use-orders.js`, `use-order-detail.js`); these wrap the `.api.js` functions with `useQuery` / `useMutation`
- `components/` — UI components specific to this feature and with no meaning outside it (e.g. `OrderStatusBadge`, `DispatchSummaryCard`)
- `pages/` — full page-level components that compose the feature's components; these are what the router points to

Code that is shared across features goes into top-level folders, not inside any feature:

- `frontend/src/components/` — reusable UI components used by more than one feature; split into three subfolders:
  - `components/ui/` — small generic primitives built on AdminLTE/Bootstrap markup (buttons, badges, modals wrappers)
  - `components/common/` — app-level reusable components that are not feature-specific (e.g. `ErrorBoundary`, `ConfirmDialog`, `EmptyState`, `PageHeader`, `DataTable`); error pages live in `components/common/error-pages/`
  - `components/layout/` — AdminLTE structural shell components (`AppShell`, `Sidebar`, `Topbar`, `PageWrapper`)
- `frontend/src/hooks/` — shared custom hooks
- `frontend/src/store/` — shared Zustand stores (e.g. auth state, global UI state) used across multiple features
- `frontend/src/lib/` — shared utilities (axios instance, date helpers, formatters)
- `frontend/src/constants/` — all magic strings, enums, route paths, API base URLs

**Key rules:**

- If a component is used by more than one feature, it belongs in `frontend/src/components/` — never duplicate it per feature
- A feature must never import from another feature's folder — cross-feature data goes through a shared Zustand store in `frontend/src/store/`
- Forms must validate with the feature's schema (via TanStack Form) before submitting — never send unvalidated data to the API
- All API calls go through the single axios instance in `frontend/src/lib/` — never create a raw `fetch` or second axios instance
- Date display must convert UTC → IST at the component level using the shared date helper — never in the API layer
- Always use `@/` alias imports in the frontend — never relative paths like `../../components/Button`; `@` maps to `frontend/src/`

## Server State vs UI State

Two separate state tools with distinct responsibilities — do not mix them:

| Concern                                                           | Tool           | Where                 |
| ----------------------------------------------------------------- | -------------- | --------------------- |
| Server data (lists, detail records, aggregates from the API)      | TanStack Query | `<feature>/hooks/`    |
| UI/client state (filters, open modals, selected rows, pagination) | Zustand        | `<feature>.store.js`  |
| Auth state (current user, role)                                   | Zustand        | `frontend/src/store/` |

**TanStack Query rules:**

- Every `useQuery` hook lives in the feature's `hooks/` folder, named `use-<feature>.js`
- Query keys must be defined as constants at the top of the hook file — never inline strings
- Use `queryClient.invalidateQueries` after mutations to keep cache consistent; never manually update cache with `setQueryData` unless optimistic UI is explicitly needed
- `staleTime` is set globally to 5 minutes in `providers.jsx` — override per-query only when there's a clear reason (e.g. dashboard summary can be shorter)
- Never call axios directly inside a component — always go through a TanStack Query hook

**Zustand store rules:**

- Stores hold only synchronous, client-owned state — no `async` actions, no API calls
- If state is derived from server data, derive it inside the component from the TanStack Query result — don't copy server data into a Zustand store

## Forms

- Use TanStack Form (`useForm` from `@tanstack/react-form`) for all forms
- Define validation schemas in `<feature>.schema.js`; pass them to `validators: { onSubmit: schema }` on the form
- Build fields with plain AdminLTE/Bootstrap markup (`form-group`, `form-control`, `invalid-feedback`) — no UI form-primitive library
- For real-time validation on a specific field: pass `validators: { onChange: fieldSchema }` on `form.Field`; use `onSubmit` by default
- Server-side errors must appear inline in the form (next to the field or below the submit button) — never as a toast-only error
- Never send unvalidated data to the API — always call `form.handleSubmit()` which runs validators before `onSubmit` fires

## Dates and Timezones

- All dates stored and processed in UTC — frontend converts to IST for display only
- Never use locale-aware date methods (`toLocaleDateString`, `toLocaleString`) in the backend

## Coding Rules

- Every function does exactly one job
- All raw values (URLs, enums, magic strings) go in `backend/src/config/env.js` or `frontend/src/constants/` — never inline
- All SQL goes through `backend/src/db/query.js` `executeQuery()` helper — no string concatenation
- Validate all external input (request bodies, form data) with schemas (Zod/Joi on backend, matching schema on frontend)
- ECMA naming: camelCase for variables/functions, PascalCase for components, SCREAMING_SNAKE_CASE for constants
- Prefer named exports over default exports everywhere — `export const authRouter = Router()` not `export default router`. Exception: React components may use default exports where tooling requires it
- No audit logging, no soft deletes — hard-delete rows and rely on `created_at`/`updated_at` only

## Error Handling

- Always throw `AppError(statusCode, message)` for expected errors (404, 400, 403, etc.) — never plain `Error`
- Unexpected errors (crashes, unhandled cases) are caught by the global `errorHandler` middleware automatically
- All middleware must either call `next()` or send a response — never both
- All async route handler errors must be passed to `next(err)` — never catch and swallow silently

## Auth Concept

JWT-based auth with access + refresh tokens.

- **Login** (`POST /auth/login`) — validates email/password against `users` table (bcrypt hash). Generic "Invalid email or password" error — never reveal whether the email exists.
- **Account lockout** — after 5 failed attempts, lock the account for 15 minutes (`failed_login_attempts`, `locked_until` columns).
- **Tokens**:
  - Access token (JWT, short-lived e.g. 15m) — carries `sub` (user id) and `role`, used to authorize requests via `Authorization: Bearer <token>`.
  - Refresh token (random opaque string, long-lived e.g. 7d) — stored **hashed** (SHA-256) in a `refresh_tokens` table, set as an `httpOnly`, `sameSite=strict`, `secure` (prod) cookie. Never sent in JSON body.
- **Refresh rotation** (`POST /auth/refresh`) — every refresh consumes (revokes) the old token and issues a new pair. If a revoked/already-used token is replayed, treat it as token theft: revoke **all** sessions for that user.
- **Logout** (`POST /auth/logout`) — revokes the refresh token and clears the cookie.
- **Me** (`GET /auth/me`) — returns the authenticated user's safe profile (excludes password hash, token data).
- **Forced password change** — `must_change_password` flag on user (e.g. first login / admin reset) forces `POST /auth/change-password` before normal use. Password policy: min 8 chars, upper, lower, number, special char.
- **Middleware**: `authenticate` — verifies the Bearer access token, attaches decoded payload to `req.user`, rejects with 401 on missing/invalid/expired token.
- **Rate limiting**: login/refresh/change-password endpoints behind a stricter limiter to slow brute-force attempts.

### Auth Implementation

- Access tokens are JWT — signed with `signAccessToken()`, verified in memory, never stored in DB
- Refresh tokens are plain random strings — generated with `generateRefreshToken()`, hashed with SHA-256 via `hashRefreshToken()` before DB storage
- Never store raw refresh tokens in the DB — always store the hash
- Protected routes use the `authenticate` middleware which attaches `req.user` (contains `sub` and `role`)

### Session Management

Each row in `refresh_tokens` represents one active session (one login on one device). A `last_used_at` column (touched on every `/auth/refresh`) lets sessions show recency, not just creation time.

- **List sessions** — `GET /users/:id/sessions` (self) and `GET /admin/sessions` (admin, all users) — return non-revoked, non-expired `refresh_tokens` rows: device/user agent, ip address, created_at, last_used_at, expires_at. Never expose the token hash itself.
- **Terminate a session** — `DELETE /admin/sessions/:sessionId` (or self `/users/me/sessions/:sessionId`) — sets `revoked_at = NOW()` on that row. The corresponding access token remains valid until it naturally expires (short-lived, e.g. 15m).
- **Terminate all sessions for a user** — `DELETE /admin/users/:id/sessions` — revokes every active `refresh_tokens` row for that user (admin "force logout everywhere").
- Only the **Admin** role can view/terminate other users' sessions; any user can view/terminate their own.

## Roles

Two roles only — no scoping. There's a single warehouse, so no per-user or per-request warehouse filtering exists anywhere:

- **Admin** — full access: manages Users/Staff, warehouse settings, products/stock, orders/dispatches, and reports.
- **Staff** — operational role: places orders, accepts/dispatches orders, manages stock. Cannot manage users or warehouse settings.

Role is embedded in the access token payload (`{ sub, role }`) so every route handler can authorize without an extra DB lookup.

### Data model

```sql
-- users
id               PK
name
email            UNIQUE
password_hash
role             ENUM('admin','staff')
is_active
must_change_password
failed_login_attempts, locked_until
created_at, updated_at
```

### Permission matrix (high level)

| Action                                           | Admin | Staff |
| ------------------------------------------------ | ----- | ----- |
| Manage warehouse settings (name/address/contact) | ✅    | ❌    |
| Manage users (create/edit/deactivate)            | ✅    | ❌    |
| View/manage products & stock                     | ✅    | ✅    |
| Place orders                                     | ✅    | ✅    |
| Accept/dispatch orders                           | ✅    | ✅    |
| View reports                                     | ✅    | ✅    |
| View/terminate sessions — own                    | ✅    | ✅    |
| View/terminate sessions — others                 | ✅    | ❌    |

### Onboarding flow

1. Admin sets up the Warehouse record (`PUT /warehouse`) — name, address, contact details.
2. Admin creates Users, choosing `role` (`admin` or `staff`).
3. New user logs in with a temporary password and is forced through `must_change_password` before normal use.

## Pagination & Filtering — WordPress REST API style

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

## Feature Modules & Example Routes

- **Dashboard** — summary widgets, no dedicated routes beyond `GET /reports/*`.
- **Warehouse** — `GET /warehouse`, `PUT /warehouse` — single-record settings (name, address, contact); admin only for write.
- **Catalog** — `divisions`, `categories`, `sub_categories` — `GET /divisions`, `GET /categories` (`division_id`), `GET /sub-categories` (`category_id`), CRUD on each — admin only for write; staff read-only. Deleting a division/category/sub-category that still has children or products is rejected (`ON DELETE RESTRICT`) — deactivate (`is_active=false`) instead.
- **Products** — `GET /products` (`search`, `division_id`, `category_id`, `sub_category_id`, `brand_id`, `is_active`), CRUD — admin/staff for write. `mrp`/`wsp` validated `wsp <= mrp`; `product_code`/`barcode` unique.
- **Inward** — `POST /inward` (receive stock against a product: qty, supplier, invoice) — admin/staff; increments `products.quantity_available` and writes a `stock_ledger` row.
- **Stock Ledger** — `GET /stock-ledger` (`product_id`, `movement_type`, `date_from`, `date_to`) — read-only, append-only log of every stock movement (inward, order reserve/release, dispatch, adjustment).
- **Orders** — `GET /orders` (`status`, `date_from`, `date_to`), `POST /orders` (reserves stock per line, all-or-nothing), `PATCH /orders/:id/status` (accept/reject/cancel — reject/cancel releases reserved stock).
- **Dispatches** — `GET /dispatches` (`order_id`, `status`), `POST /dispatches` (creates a dispatch against an accepted order; can be partial — order status becomes `partially_dispatched` until fully fulfilled; consumes reserved stock, never touches `quantity_available` directly).
- **Reports** — `GET /reports/stock-summary` (includes low-stock: `quantity_available <= reorder_level`), `GET /reports/order-history` (`date_from`, `date_to`) — aggregate queries.
- **Users / Staff** — `GET /users` (`role`, `search`), CRUD — admin only. Plus session endpoints above.

All write routes (`POST`/`PUT`/`PATCH`/`DELETE`) go through `authenticate` + `requireRole(...)`; list/read routes go through `authenticate` + `pagination`.

## Security

- JWT access tokens (15min) + refresh tokens (7d, HttpOnly cookie)
- Helmet for HTTP security headers
- Rate limiting on all routes, stricter on auth routes
- Parameterized queries only — never raw string SQL

## Testing

- Use HTML id attribute so that it will be easy for testing.
