# StockFlow

Multi-tenant stock-management SaaS for cloth businesses (dresses, sarees, kidware, menswear). A **platform super admin** creates **businesses**; each business is an independent tenant with its own catalog, stock, orders, dispatches, reports and settings, and its own **members** (admin/staff) who run it. There is no data sharing between businesses.

> The customer-facing **storefront** (browse / cart / checkout / customer login) is **on hold** behind the `STOREFRONT_ENABLED` flag — its code is retained in the repo but unmounted. See "On Hold — Storefront & Customers".

## Stack

- **Frontend**: React + Vite + JavaScript + AdminLTE + Bootstrap + Zustand + TanStack Query + TanStack Form
- **Backend**: Express + JavaScript + mysql2 (raw parameterized SQL — no ORM)
- **Database**: MariaDB 10.4 (the real target — cPanel hosting and dev both run MariaDB; schema headers say `MariaDB 10.4+ / MySQL 8.0.19+`). Migrations use portable DDL (`DROP CONSTRAINT`, not `DROP CHECK`).
- **Frontend Docs**: none (there is no docs site — ignore any older "Docsify" mention)
- **API Docs**: none (Swagger was removed in Phase 0 — `swagger-jsdoc`/`swagger-ui-express` deps are gone; do not reintroduce a `/api-docs` route without a decision)
- **Hosting**: cPanel Linux hosting (Node.js Selector) — no Docker; deployed via a manually-triggered Jenkins pipeline (FTP + SSH + cPanel API). The `Jenkinsfile` is fully parameterized ("Build with Parameters") with generic example defaults — no hardcoded domain/user. See `Jenkinsfile` and `deployment_guide.md`.

## Repo Structure

- `backend/` — Express API
- `frontend/` — React app
- `database/init/` — numbered SQL migrations (`01_schema.sql` … `07_*.sql`)
- `multitenant_plan.md` — the full record of the single-tenant → multi-tenant migration (Phases 0–8)

## Tenancy Model

StockFlow is a multi-tenant SaaS. It is **not** "one warehouse vs. retailers" — it is **many independent businesses**.

### Actors

| Actor | How they exist | What they can do |
| --- | --- | --- |
| **Super admin** | a `users` row with `is_super_admin = 1` | Create / edit / deactivate businesses; assign a business's first admin; global user directory; view/terminate any user's sessions. Can act inside **any** business as an admin (synthetic membership). |
| **Business admin** | a `users` row **+** a `memberships` row `(user_id, business_id, role='admin')` | Full control of **that** business: products, stock, catalog, sizes, media, orders, dispatches, reports, business settings, storefront settings, and members. |
| **Business staff** | a `memberships` row `(user_id, business_id, role='staff')` | Operational subset of a business: products, stock, media, orders (place/accept), dispatches, reports, stock ledger. Cannot manage catalog/sizes, business settings, storefront settings, or members. Granular per-member `permissions` is **future scope** (the `memberships.permissions` column exists; nothing reads it yet). |
| **Customer** | a `users` row with `role='customer'` and **no membership** | **Dormant** — storefront + customer login are disabled this phase. Rows are kept intact. |

### Key rules

- **A user is ONE global `users` row.** "Admin of business A + staff of business B" = two `memberships` rows for one `user_id`. "Admin of many businesses" = many rows. No user duplication.
- **One login → every business.** The user authenticates once (email + password). The access token carries the full membership list. Switching business is a **URL change**, never a re-login.
- **Super admin is a flag, not a role** — orthogonal to memberships. A super admin can additionally be an explicit member of specific businesses.
- **Tenant context is the URL.** Backend tenant routes are `/api/b/:businessId/<resource>`; frontend back-office routes are nested under `/#/b/:businessId/…` (hash router).

### Backend routing & middleware

`backend/src/app.js` (note: **default export** — the one deliberate exception to the named-exports rule) mounts:

| Path | Guards | Purpose |
| --- | --- | --- |
| `/api/auth/*` | per-route | login, refresh, logout, me, change-password (+ disabled customer-auth routes) |
| `/api/businesses` | `authenticate` + `requireSuperAdmin` | platform business CRUD + `GET /:id/members` |
| `/api/b/:businessId/members` | `authenticate` + `resolveBusiness` + `requireBusinessRole('admin')` | per-business member management (business admin) |
| `/api/b/:businessId/<resource>` | `authenticate` + `resolveBusiness` (+ `requireBusinessRole(...)` per route) | every tenant module (catalog, sizes, media, stock-ledger, business-settings, notice, products, stock, orders, dispatches, reports, hero-slides, settings) |
| `/api/notice`, `/api/hero-slides`, `/api/settings` | none (each `/public` sub-route is `storefrontEnabled`-gated → 404) | storefront public reads — currently dead |
| `/api/users` | `authenticate` + `requireSuperAdmin` (self `/me/sessions` routes only `authenticate`) | global user directory (super admin) |
| `/api/admin/*` | `authenticate` + `requireSuperAdmin` | cross-user session management |

Middleware in `backend/src/middleware/`:

- `auth.js` — `authenticate`: verifies the Bearer access token, sets `req.user` (the decoded payload: `sub`, `role`, `isSuperAdmin`, `memberships`). Does **not** re-check `is_active` (accepted ≤15-min staleness on global routes).
- `resolveBusiness.js` — for `/api/b/:businessId/*` (routers use `Router({ mergeParams: true })`). One indexed DB lookup on `businesses`: **404** unknown/inactive business (a super admin still sees an inactive one), **403** authenticated non-member non-super-admin. Sets `req.business = { id }` and `req.membership = { businessId, role }` (a super admin who is not an explicit member gets a synthetic `role: 'admin'`). This live DB check is what protects **tenant data** immediately, even before the token refreshes.
- `requireBusinessRole.js` — `requireBusinessRole('admin', 'staff', …)`: asserts `req.membership.role` is allowed. Runs after `resolveBusiness`. Replaces `requireRole` inside every tenant module.
- `requireSuperAdmin.js` — asserts `req.user.isSuperAdmin === true`.
- `requireRole.js` — **retired**; still on disk but unused (no global non-super-admin route needs it).
- `storefrontEnabled.js` — 404s storefront/customer-auth routes unless `STOREFRONT_ENABLED === true` (default `false`).
- `errorHandler.js`, `rateLimiter.js`, `pagination.js` — unchanged in shape (see their sections).

### Access token payload

`buildAccessTokenPayload(userId)` in `auth.service.js` assembles it, rebuilt on **every** login and refresh:

```jsonc
{
  "sub": "<user uuid>",
  "role": "admin",            // transitional/legacy — the global users.role; meaningful only for dormant customer rows, ignored for back-office authz
  "isSuperAdmin": false,
  "memberships": [
    { "b": "<business uuid>", "r": "admin" },
    { "b": "<business uuid>", "r": "staff" }
  ]
}
```

- **Tradeoff (documented, accepted):** a membership/role change or revocation only reaches the token on the **next refresh (≤15 min)**. Mitigation: `resolveBusiness` hits the DB live, so **tenant data** is protected within the request; only "the nav item is still visible for ≤15 min" staleness remains, and only on global routes.
- `memberships` lists only businesses where **both** the membership and the business are `is_active = 1`.
- `permissions` is deliberately **not** in the token (future staff-granularity scope).

### `GET /auth/me`

Returns the safe profile plus `isSuperAdmin` and `businesses: [{ id, name, slug, role }]` — the user's active memberships, **plus every active business** for a super admin (reported with `role: 'admin'`). Also `profileComplete` (a dormant-customer concept). This drives the business switcher and the frontend route guards.

### Frontend tenancy

- Routes nested under `/b/:businessId` (`app/router.jsx`, `createHashRouter`).
- `app/BusinessGate.jsx` — layout for the `/b/:businessId` branch: validates membership via `useMe()` (redirects non-members to `/businesses`), mirrors `:businessId` into `store/business.store.js`, then renders `<AppShell />`. Children never mount until the store is in sync, so no tenant request fires without a business id.
- `store/business.store.js` — a tiny non-persisted Zustand store holding `currentBusinessId`; the **URL is the source of truth**, `BusinessGate` keeps the store in sync.
- `lib/axios.js` — the request interceptor rewrites tenant-scoped API paths (`/products`, `/orders`, `/categories`, `/sizes`, `/media`, `/notice`, `/business-settings`, `/settings/social`, …) to `/b/:businessId/…` using `useBusinessStore`, so feature `.api.js` files never pass a `businessId`. Flat paths (`/auth`, `/businesses`, `/users`, `/admin`, `.../public`) are left alone.
- **Business switch does `queryClient.clear()`** (in `Topbar`, `SuperAdminShell`, `BusinessPickerPage`, and on login) rather than threading `businessId` into every query key — the cache is wiped on switch, so stale cross-business data can't show.
- `lib/nav.jsx` (`Link`, `NavLink`, `Navigate`) and `hooks/use-app-navigate.js` (`useAppNavigate`) — drop-in wrappers that auto-prefix an absolute back-office path with `/b/:businessId`. Global routes (`GLOBAL_ROUTE_RE`: `/login`, `/change-password`, `/profile`, `/businesses`, `/admin/*`, `/b/*`) pass through untouched. `constants/routes.js` also exports `businessPath(id, subpath)` and `landingPath(me)`.
- `app/SuperAdminRoute.jsx` + `components/layout/SuperAdminShell.jsx` — the `/admin/*` platform area (its own shell, plain react-router nav, no business context).
- `app/BusinessAdminRoute.jsx` — gates per-business-admin pages (hero slides, notice, settings) by the caller's role in the current business from `useMe().businesses`; a staff member is redirected to the business dashboard.
- `app/ProtectedRoute.jsx` — token/initial-refresh gate only; per-business authorization is `BusinessGate`'s job.

## Folder and Naming Consistency

The folder structures defined in this file are mandatory — do not invent new patterns or deviate from them:

- Every backend feature lives in `backend/src/modules/<module-name>/` with exactly the four defined files — no more, no less
- Every frontend feature lives in `frontend/src/features/<feature-name>/` with exactly the defined files and subfolders
- Backend module names and their corresponding frontend feature names must match exactly (e.g. `modules/orders/` ↔ `features/orders/`). Documented mismatches: backend `modules/businesses/` maps to two frontend features — `features/businesses/` (super-admin business CRUD) and `features/members/` (business-admin member management); backend `modules/stockLedger/` ↔ frontend `features/stock-ledger/`; backend `modules/heroSlides/` ↔ frontend `features/heroSlides/`.
- File names within a module follow the `<module-name>.<role>.js` pattern — e.g. `orders.service.js`, never `orderService.js` or `service.js`. Hyphenated module names keep the hyphen: `business-settings.service.js`.
- Never create a file outside the defined structure without first updating this document to reflect the new pattern

## Backend Module Structure

Each feature module lives in `backend/src/modules/<module-name>/` and contains exactly four files:

- `<module>.schema.js` — Zod schemas for validating request input
- `<module>.service.js` — business logic and DB queries via `executeQuery()` / `withTransaction()`; no Express types, no `req`/`res`. Every tenant service function takes `businessId` as a parameter and scopes every SELECT/UPDATE/DELETE with `WHERE business_id = ?` and sets `business_id` on every INSERT (leaf rows included).
- `<module>.controller.js` — HTTP layer; parses request, passes `req.business.id` into the service, sends response, passes errors to `next()`
- `<module>.router.js` — Express router (`Router({ mergeParams: true })` for tenant modules); registers routes with `requireBusinessRole(...)` + controller handlers

```
backend/src/
  app.js                        # express app, mounts middleware + routers, error handler last (DEFAULT export)
  index.js                      # server bootstrap
  config/env.js                 # required()/optional() env loader (STOREFRONT_ENABLED, OTP_*, JWT_*, MEDIA_*, ...)
  db/pool.js                    # mysql2 pool
  db/query.js                   # executeQuery(sql, params) — pool-wide, one connection per call
  db/transaction.js             # withTransaction(cb) — cb gets an execute() bound to one connection; use for multi-statement atomic work
  middleware/
    auth.js                     # authenticate (verifies access token, sets req.user)
    resolveBusiness.js          # loads business + membership → req.business / req.membership
    requireBusinessRole.js      # requireBusinessRole('admin', 'staff') — tenant role guard
    requireSuperAdmin.js        # platform super-admin guard
    requireRole.js              # RETIRED (unused, kept on disk)
    storefrontEnabled.js        # 404s storefront/customer-auth routes unless STOREFRONT_ENABLED
    errorHandler.js             # AppError class + global handler (last middleware)
    rateLimiter.js              # generalLimiter, authLimiter, otpLimiter, orderLimiter
    pagination.js               # parses page/per_page/search/orderby/order + filters → req.listQuery
  modules/
    auth/            auth.router.js  auth.controller.js  auth.service.js  auth.schema.js
    businesses/      businesses.router.js (exports businessesRouter + businessMembersRouter) ...   # super-admin business CRUD + per-business member management
    business-settings/ ...   # was `warehouse` — per-business currency/phone-format/address/contact/bank-transfer settings
    users/           users.router.js (exports usersRouter + adminSessionsRouter) ...   # super-admin global user directory + session endpoints
    catalog/         ...   # categories, sub_categories (NO divisions — removed)
    sizes/           ...   # per-business predefined size picklist (drag-and-drop reorder)
    media/           ...   # per-business media library (WebP normalize, content-hash sharded on disk, media_usage tracking)
    products/        ...
    stock/           ...   # quantity-based stock intake: add batch + xlsx/csv import
    stockLedger/     ...
    orders/          ...
    dispatches/      ...   # outward dispatch of accepted orders, releases reserved quantity
    reports/         ...
    heroSlides/      ...   # storefront hero slider (ON HOLD — admin-editable per business, no live public surface)
    notice/          ...   # storefront notice board (ON HOLD — per business)
    settings/        ...   # social media links + site branding (both per business, storefront-only) + dev-only per-business delete-all-data
  utils/jwt.js, logger.js, msg91.js
```

## Frontend Feature Structure

Each domain feature lives in `frontend/src/features/<feature-name>/` and contains:

- `<feature>.api.js` — all API calls for this feature (plain axios functions that return data); the only place that talks to the backend. Tenant features do **not** pass `businessId` — `lib/axios.js` adds the `/b/:businessId` prefix.
- `<feature>.store.js` — Zustand store: **UI/client state only** (filters, selected rows, open modals, pagination cursor); never async data fetching
- `<feature>.schema.js` — Zod schemas for client-side form validation with TanStack Form; must be consistent with the backend schema for the same feature
- `hooks/` — TanStack Query hooks (e.g. `use-orders.js`, `use-order-detail.js`) wrapping the `.api.js` functions with `useQuery` / `useMutation`
- `components/` — UI components specific to this feature
- `pages/` — full page-level components the router points to

Active features: `auth`, `business-picker`, `businesses`, `members`, `business-settings`, `dashboard`, `catalog`, `sizes`, `media`, `products`, `stock`, `stock-ledger`, `orders`, `dispatches`, `reports`, `heroSlides`, `notice`, `settings`, `users`.
On-hold storefront features (present, unmounted): `home`, `product-detail`, `category-detail`, `cart`, `checkout`, `my-orders`.

Shared code goes into top-level folders, not inside any feature:

- `frontend/src/components/`
  - `components/ui/` — small generic primitives on AdminLTE/Bootstrap markup
  - `components/common/` — app-level reusable components (`ErrorBoundary`, `ConfirmDialog`, `EmptyState`, `PageHeader`, `DataTable`, `RouteErrorPage`); error pages live in `components/common/error-pages/`
  - `components/layout/` — AdminLTE shell (`AppShell`, `Sidebar`, `Topbar`, `PageWrapper`), the platform `SuperAdminShell`, and the on-hold storefront shell (`StoreShell`, `StoreTopbar`, `StoreNavMenu`, `Footer`, `StoreSearchBox`)
- `frontend/src/app/` — router + route guards (`router.jsx`, `providers.jsx`, `ProtectedRoute`, `BusinessGate`, `BusinessAdminRoute`, `SuperAdminRoute`, `RootRedirect`)
- `frontend/src/hooks/` — shared custom hooks (`use-app-navigate.js`, option hooks, `use-debounced-value.js`, …)
- `frontend/src/store/` — shared Zustand stores (`auth.store.js`, `business.store.js`, on-hold `cart.store.js`)
- `frontend/src/lib/` — shared utilities (`axios.js`, `nav.jsx`, `format.js`, `pricing.js`, `media.js`, `user.js`, `download.js`, `errors.js`)
- `frontend/src/constants/` — all magic strings, enums, route paths, API base URLs

**Key rules:**

- If a component is used by more than one feature, it belongs in `frontend/src/components/` — never duplicate it per feature
- A feature must never import from another feature's folder — cross-feature data goes through a shared Zustand store in `frontend/src/store/`
- Forms must validate with the feature's schema (via TanStack Form) before submitting — never send unvalidated data to the API
- All API calls go through the single axios instance in `frontend/src/lib/axios.js` — never a raw `fetch` or a second axios instance
- Date display must convert UTC → IST at the component level using the shared date helper — never in the API layer
- Always use `@/` alias imports in the frontend — never relative paths; `@` maps to `frontend/src/`
- For navigation/links, import the wrappers from `@/lib/nav` and `@/hooks/use-app-navigate` (not react-router directly) so tenant path-prefixing is automatic

## Server State vs UI State

Two separate state tools with distinct responsibilities — do not mix them:

| Concern | Tool | Where |
| --- | --- | --- |
| Server data (lists, detail records, aggregates from the API) | TanStack Query | `<feature>/hooks/` |
| UI/client state (filters, open modals, selected rows, pagination) | Zustand | `<feature>.store.js` |
| Auth state (current user, token) | Zustand | `frontend/src/store/auth.store.js` |
| Current business id (mirrored from the URL) | Zustand | `frontend/src/store/business.store.js` |

**TanStack Query rules:**

- Every `useQuery` hook lives in the feature's `hooks/` folder, named `use-<feature>.js`
- Query keys are constants at the top of the hook file — never inline strings. Business scoping is handled by `queryClient.clear()` on business switch, **not** by adding `businessId` to keys.
- Use `queryClient.invalidateQueries` after mutations; never `setQueryData` unless optimistic UI is explicitly needed
- `staleTime` is 5 minutes globally in `providers.jsx` — override per-query only with a clear reason (e.g. product search uses 30s)
- Never call axios directly inside a component — always go through a hook

**Zustand store rules:**

- Stores hold only synchronous, client-owned state — no `async` actions, no API calls
- If state is derived from server data, derive it inside the component from the TanStack Query result — don't copy server data into a store

## Forms

- Use TanStack Form (`useForm` from `@tanstack/react-form`) for all forms
- Define validation schemas in `<feature>.schema.js`; pass to `validators: { onSubmit: schema }`
- Build fields with plain AdminLTE/Bootstrap markup (`form-group`, `form-control`, `invalid-feedback`) — no UI form-primitive library
- Real-time field validation: `validators: { onChange: fieldSchema }` on `form.Field`; `onSubmit` by default
- Server-side errors must appear inline in the form — never as a toast-only error
- Never send unvalidated data to the API — always call `form.handleSubmit()`

## Dates and Timezones

- All dates stored and processed in UTC — frontend converts to IST for display only
- Never use locale-aware date methods (`toLocaleDateString`, `toLocaleString`) in the backend
- Order/dispatch number date parts use `new Date().toISOString().slice(0,10)` (UTC), never locale formatting

## Coding Rules

- Every function does exactly one job
- All raw values (URLs, enums, magic strings) go in `backend/src/config/env.js` or `frontend/src/constants/` — never inline
- All SQL goes through `backend/src/db/query.js` `executeQuery()` or `backend/src/db/transaction.js` `withTransaction()` — no string concatenation of SQL. Use `withTransaction` whenever multiple statements must be atomic (e.g. `SELECT … FOR UPDATE` then `UPDATE`, or a parent insert plus leaf-row inserts).
- Every tenant query is business-scoped: `WHERE business_id = ?` on reads/updates/deletes, `business_id` set on inserts (including leaf tables `order_items`, `product_gallery_images`, `media_usage`), and every uniqueness / duplicate check / number generator scoped per business
- Validate all external input with schemas (Zod on backend, matching schema on frontend)
- ECMA naming: camelCase for variables/functions, PascalCase for components, SCREAMING_SNAKE_CASE for constants
- Prefer named exports over default exports everywhere. Exceptions: React components where tooling requires a default; `backend/src/app.js` (`export default app`)
- No audit logging, no soft deletes — hard-delete rows and rely on `created_at`/`updated_at`. **Deliberate exceptions**: (1) deleting a `customer` user deactivates (`is_active=false`) instead of hard-deleting, keeping order history intact; (2) a `memberships` row is deactivated (`is_active=0`), not deleted, when a member is removed; (3) a business "delete" is deactivation (`is_active=0`) — a real cascade wipe stays dev-only.
- **Database migrations**: every schema change or data modification gets its own new numbered file in `database/init/`, continuing the sequence. Current head is `07_refresh_token_replaced_by.sql`; the next is `08_<description>.sql`. Sequence: `01_schema.sql`, `02_seed.sql`, `03_drop_divisions.sql`, `04_multitenant_core.sql`, `05_multitenant_business_id.sql`, `06_settings_per_business.sql`, `07_refresh_token_replaced_by.sql`. Each file is a runnable `ALTER TABLE`/backfill script for an already-provisioned DB — never a comment in `01_schema.sql`. In the same change, update `01_schema.sql`'s `CREATE TABLE` statements so a fresh install already matches head — `01_schema.sql` must always reflect current head, with no historical notes accumulating in it (the migrations folded into it are listed in its header). Never hand-run untracked SQL against any DB — write the migration file first, then run it.

## Error Handling

- Always throw `AppError(statusCode, message)` for expected errors (404, 400, 403, 409, …) — never plain `Error`. `AppError` takes an optional third arg for structured `details` (e.g. `{ code: 'OTP_INVALID' }`).
- Unexpected errors are caught by the global `errorHandler` middleware
- All middleware must either call `next()` or send a response — never both
- All async route handler errors must be passed to `next(err)` — never catch and swallow silently

## Auth Concept

JWT-based auth with access + refresh tokens. **One global identity per person**; back-office authorization comes from `memberships`, never from `users.role`.

- **Login — password** (`POST /auth/login`) — `{ identifier, password }` where `identifier` is an **email** (admin/staff/super-admin) or a **phone number** (dormant customers). Generic "Invalid credentials" — never reveal whether the account exists; a NULL `password_hash` gets the same generic error. On success issues the token pair (access JWT + refresh cookie), the payload assembled by `buildAccessTokenPayload()`.
- **Account lockout** — after 5 failed *password* attempts, lock for 15 minutes (`failed_login_attempts`, `locked_until`).
- **Refresh rotation** (`POST /auth/refresh`) — every refresh consumes (revokes) the old token and issues a new pair, with a **fresh** payload (so membership/role changes take effect here). Replay of an already-revoked token is treated as theft → **revoke all sessions for that user**, EXCEPT the benign multi-tab double-refresh: if the replayed token was revoked < ~15s ago (`REFRESH_REPLAY_GRACE_MS`) and its recorded successor (`refresh_tokens.replaced_by`) is still active, rotate from the successor chain instead. Outside that window, or if the successor is also gone, it is still treated as theft.
- **Logout** (`POST /auth/logout`) — revokes the refresh token, clears the cookie.
- **Me** (`GET /auth/me`) — safe profile + `isSuperAdmin` + `businesses[]` (see Tenancy Model).
- **Change password** (`POST /auth/change-password`, authenticated) — voluntary, self-service only. No forced/temporary-password concept. 400s if the account has no password (an OTP-created account must set one via the storefront profile flow, currently disabled). Policy: min 8 chars, upper, lower, number, special char.
- **Middleware**: `authenticate` — verifies the Bearer access token, attaches the decoded payload to `req.user`, 401 on missing/invalid/expired.
- **Rate limiting**: `authLimiter` on login/refresh/change-password; `otpLimiter` on `POST /auth/otp/send` (disabled); `orderLimiter` on `POST /orders`.

### Auth Implementation

- Access tokens are JWT — signed with `signAccessToken()`, verified in memory, never stored in DB. Payload: `{ sub, role, isSuperAdmin, memberships: [{ b, r }] }` (+ `iat`/`exp`).
- Refresh tokens are plain random strings (`generateRefreshToken()`), hashed with **HMAC-SHA256 keyed on `JWT_REFRESH_SECRET`** (`hashRefreshToken()`) before DB storage. Never store the raw token. (The schema column comment still says "SHA-256"; the code is HMAC-SHA256.)
- Refresh cookie: `httpOnly`, `sameSite=strict`, `secure` (prod), never sent in JSON body.
- `storeRefreshToken()` generates the row id in app code (not `UUID()` in SQL) so a rotated row can point `replaced_by` at its successor.

### Session Management

Each row in `refresh_tokens` is one active session. `last_used_at` is touched on every `/auth/refresh`.

- **List sessions** — `GET /users/me/sessions` (self, any authenticated role) and `GET /admin/sessions` (super admin, all users) — non-revoked, non-expired rows: device/user agent, ip, created_at, last_used_at, expires_at. Never the token hash.
- **Terminate a session** — `DELETE /users/me/sessions/:sessionId` (self) or `DELETE /admin/sessions/:sessionId` (super admin) — sets `revoked_at = NOW()`. The access token stays valid until it expires (~15m).
- **Terminate all sessions for a user** — `DELETE /admin/users/:id/sessions` (super admin).
- Viewing/terminating **another** user's sessions is **platform super admin only** (there is no per-business session administration).

### OTP (MSG91 widget, server-to-server) — DISABLED

The OTP login/registration flow is **on hold** (`storefrontEnabled` 404s `POST /auth/otp/send`, `POST /auth/otp/login`, `POST /auth/register`, `POST /auth/complete-profile`). The code and the `otp_requests` table are retained. When it is re-enabled:

- OTP delivery goes through the MSG91 **OTP Widget** REST API, driven entirely from the backend (`backend/src/utils/msg91.js`). No browser widget/SDK, no hCaptcha, no `tokenAuth` — only the account `authkey`.
- **The code is never generated, stored, hashed, or expired by this app.** MSG91 owns generation, delivery, expiry, and the per-code attempt cap.
- **`otp_requests` stores the binding, not the code**: MSG91's `reqId` paired with the phone it was issued for. The client only ever sends a phone number; `consumeOtp()` resolves the `reqId` from *our* row. **Never take a `reqId` from a request body.**
- `expires_at` on the row is a *defensive local ceiling* only (`OTP_TTL_MINUTES`).
- `purpose` (`login` | `register`) scopes each code.
- **Failures arrive at HTTP 200 with `type: "error"`** — branch on `type`, never on status.
- **`MSG91_SEND_PATH` must match the widget's dashboard configuration.** Diagnose with `npm run msg91:check -- 919876543210` (never `curl` — these endpoints answer 302 by design).
- The country code sent to MSG91 comes from a business's `business_settings.phone_country_code` with `+` stripped (the disabled path currently falls back to a static `+91` default — it needs per-business context when re-enabled).
- Frontend OTP input accepts 4–8 digits (code length is an MSG91 dashboard setting).

## Roles

Three real actor types plus one dormant one — see the Tenancy Model table. There is **no** "single warehouse, no scoping" — the opposite is true: every catalog/stock/order/dispatch/report/setting row belongs to exactly one business and every query is business-scoped.

- **Super admin** — platform level (`users.is_super_admin`). Businesses + global users + all sessions. Acts as an admin inside any business.
- **Business admin** — full control within one business, including members and settings.
- **Business staff** — operational subset within one business (see matrix). Granular `permissions` is future scope.
- **Customer** — dormant; storefront disabled.

Back-office (admin + staff) uses the AdminLTE sidebar shell under `/b/:businessId`; the platform area uses `SuperAdminShell` under `/admin`. Role within a business is read from `req.membership` (backend) / `useMe().businesses` (frontend); the platform flag is `req.user.isSuperAdmin` / `useMe().isSuperAdmin`.

### Data model

```sql
-- users  (GLOBAL — one row per person)
id                    PK
name                  -- NULL until an OTP-created customer completes their profile
email                 UNIQUE (globally), NULL
password_hash         -- NULL on an OTP-only account that never set one
role                  ENUM('admin','staff','customer')  -- LEGACY: kept for dormant customer rows, ignored for back-office authz
is_super_admin        BOOLEAN  -- platform flag, orthogonal to memberships
phone                 UNIQUE, NULL
profile_completed_at  -- NULL = minted by OTP login, still missing its profile
is_active             -- FALSE also doubles as the customer soft-delete flag
failed_login_attempts, locked_until, last_login_at
created_at, updated_at

-- businesses  (GLOBAL)
id          PK
name
slug        UNIQUE  -- url-safe, shown in the switcher
is_active           -- FALSE = deactivated ("delete")
created_at, updated_at

-- memberships  (GLOBAL — the user↔business join)
id           PK
user_id      FK users   ON DELETE CASCADE
business_id  FK businesses ON DELETE CASCADE
role         ENUM('admin','staff')          -- back-office role within THIS business
permissions  JSON NULL  -- future staff-permission granularity; on MariaDB 10.4 this is LONGTEXT + an auto JSON_VALID CHECK. NULL = role default. Nothing reads it yet.
is_active    BOOLEAN
UNIQUE (user_id, business_id)
created_at, updated_at

-- refresh_tokens
... token_hash (HMAC-SHA256), device_info, ip_address, expires_at, last_used_at, revoked_at
replaced_by  CHAR(36) NULL  -- successor row id, set on rotation; drives the multi-tab refresh grace window
```

The three nullable identity columns on `users` (`name`, `email`, `password_hash`) and `phone` are load-bearing (OTP sign-in creates an account from a verified phone and nothing else). Do not add `NOT NULL` back.

**Every tenant-owned table** has `business_id CHAR(36) NOT NULL` + FK `REFERENCES businesses(id) ON DELETE CASCADE` + an index: `categories`, `sub_categories`, `sizes`, `products`, `product_gallery_images`, `orders`, `order_items`, `stock`, `stock_ledger`, `dispatches`, `media`, `media_usage`, `hero_slides`, `business_settings`, `notice`, `social_links`, `site_branding`. Leaf tables (`order_items`, `product_gallery_images`, `media_usage`) carry a **denormalized** `business_id` (populated from the parent on insert) so every tenant query is a flat `WHERE business_id = ?` and cross-tenant JOIN leaks are impossible.

Formerly-global uniques are now **per-business composites**: `uq_products_business_product_code`, `uq_categories_business_name`, `uq_sub_categories_business_category_name`, `uq_sizes_business_value`, `uq_orders_business_order_number`, `uq_dispatches_business_dispatch_number`, `uq_media_business_file_hash` (media dedup is per-business — media is never shared), `uq_media_usage_business_ref`. `orders.idempotency_key` stays **globally** unique (it's a client-generated UUID).

The single-row settings tables (`business_settings`, `notice`, `social_links`, `site_branding`) lost their `CHECK (id = 1)` / `id TINYINT` PK and are now **per-business**: PK is `business_id`, one row per business, FK cascade. Their services return a **default object** (not a 404) when a business has no row yet, and **upsert** (`INSERT … ON DUPLICATE KEY UPDATE`) on write.

### Permission matrix (high level)

| Action | Super admin | Business admin | Business staff |
| --- | --- | --- | --- |
| Create / edit / deactivate businesses | ✅ | ❌ | ❌ |
| Global user directory (`/users`, `/admin/*`) | ✅ | ❌ | ❌ |
| View/terminate **any** user's sessions | ✅ | ❌ | ❌ |
| Act inside any business (as admin) | ✅ | — | — |
| Manage business settings (currency/phone-format/address/contact/bank) | ✅ | ✅ | ❌ (read only) |
| Manage members (add / change role / remove) | ✅ (also global `/businesses/:id/members`) | ✅ | ❌ |
| Manage catalog (categories / sub-categories) | ✅ | ✅ | ❌ (read only) |
| Manage sizes | ✅ | ✅ | ❌ (read only) |
| View / manage products & stock & media & stock ledger | ✅ | ✅ | ✅ |
| Place orders | ✅ | ✅ | ✅ |
| Accept / dispatch orders | ✅ | ✅ | ✅ |
| Update payment status | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ✅ |
| Manage hero slides / notice / social links / site branding | ✅ | ✅ | ❌ |
| Dev-only per-business "delete all data" | ✅ | ✅ | ❌ |
| View / terminate own sessions | ✅ | ✅ | ✅ |

All write routes go through `authenticate` → `resolveBusiness` → `requireBusinessRole(...)`; list/read tenant routes go through `authenticate` → `resolveBusiness` (+ `requireBusinessRole('admin','staff')` where reads are still back-office-gated) → `pagination`.

### Onboarding flow

1. A **super admin** signs in (seed: `admin@example.com` / `NewPassword@123`).
2. Super admin creates a **business** (`POST /api/businesses`) and optionally seeds its first admin in the same request — naming an existing user grants them an `admin` membership; naming a new email requires `initialAdminPassword` and creates the `users` row first. Business "delete" is deactivation.
3. A **business admin** adds **members** (`POST /api/b/:businessId/members`, by email — find-or-create the `users` row; a brand-new user needs an initial `password` set by the acting admin, communicated out-of-band — there is no email infrastructure). `PATCH …/members/:userId` changes role; `DELETE …/members/:userId` deactivates the membership. **Last-admin guards**: a business must always keep at least one active admin — demoting or removing the last one is rejected (409).
4. Members sign in once (email + password) and switch between their businesses via the topbar switcher (URL change, no re-login).

## Pagination & Filtering — WordPress REST API style

A shared `middleware/pagination.js` parses query params on every list (`GET /collection`) route and attaches a normalized `req.listQuery`, so list controllers/services never touch `req.query` directly.

| Query param | Meaning | Default | Notes |
| --- | --- | --- | --- |
| `page` | 1-based page number | `1` | |
| `per_page` | items per page | `10` | capped at `max=100` |
| `search` | free-text search | — | per-module whitelisted columns |
| `orderby` | sort column | module default (e.g. `created_at`) | per-module whitelist — never interpolate raw client input into `ORDER BY` |
| `order` | `asc` \| `desc` | `desc` | |
| _(module-specific filters)_ | e.g. `status`, `category_id`, `date_from`, `date_to`, `customer_id`, `scope=own` | — | declared per-route, validated by the route's schema |

Response **body** is the plain array of items (no wrapper). Pagination metadata is in **headers**: `X-WP-Total`, `X-WP-TotalPages` (both in the CORS `exposedHeaders` allowlist).

Service-layer pattern: each list service builds `WHERE`/`ORDER BY`/`LIMIT … OFFSET …` from `req.listQuery` using a per-module whitelist of allowed filter/sort columns (never string-concatenate user-controlled column names; values always parameterized) — and always with the tenant `business_id = ?` condition first.

## Feature Modules & Example Routes

All tenant routes below are under `/api/b/:businessId`. Frontend back-office routes are under `/#/b/:businessId`.

- **Businesses (platform)** — `backend/modules/businesses/` ↔ frontend `features/businesses/`. `GET/POST /api/businesses`, `GET/PUT/DELETE /api/businesses/:id`, `GET /api/businesses/:id/members` — all `requireSuperAdmin`. `POST /api/businesses` optionally seeds the first admin. `DELETE` = deactivate.
- **Members (per business)** — `businessMembersRouter` ↔ frontend `features/members/`. `GET/POST /api/b/:businessId/members`, `PATCH/DELETE /api/b/:businessId/members/:userId` — `requireBusinessRole('admin')`. Add-by-email find-or-create; last-admin guards on role change and removal.
- **Business Settings** — was `warehouse`. `GET /business-settings` (any member), `PUT /business-settings` (admin). Per-business currency symbol/decimals, phone country code/length, address, contact, and bank-transfer details (shown on the storefront checkout when enabled). Returns a default object for a business with no row; upserts on write. **Frontend route path is still `/b/:businessId/warehouse`** (`ROUTES.WAREHOUSE`) → `BusinessSettingsPage` — the path was kept to limit churn.
- **Dashboard** — summary widgets, backed by `GET /reports/*`.
- **Catalog** — `categories` (top-level — **there are no divisions**) and `sub_categories`. `GET /categories`, `GET /categories/:id`, `GET /sub-categories` (`category_id` filter); `POST`/`PUT`/`DELETE` + `PATCH /categories/reorder` and `PATCH /sub-categories/reorder` — **admin only** (staff read-only). Deleting a category/sub-category with children or products is rejected (`ON DELETE RESTRICT`) — deactivate (`is_active=false`) instead. Category names unique per business.
- **Sizes** — admin-managed predefined size picklist, flat drag-and-drop reorder (`value`, `is_active`, `sort_order`). `GET /sizes` (any member), `POST`/`PUT/:id`/`DELETE/:id`/`PATCH /sizes/reorder` — admin only. **`products.size` and `stock.size` store the picked value as plain text, not a FK** — deleting a size never fails and existing rows keep their string. Size values unique per business.
- **Media** — per-business media library. Uploads normalized to WebP ≤500KB, stored on disk sharded by content hash (`<hash[0:2]>/<hash[2:4]>/<hash>.webp`). `media_usage` tracks which entities reference each item; a media row can only be deleted at zero usage. `GET` any member; `POST`/`PATCH/:id`/`POST /:id/file`/`POST|DELETE /:id/usage`/`DELETE /:id` — admin/staff; `POST /sweep-orphans` — admin. Dedup key is `(business_id, file_hash)` — media is never shared between businesses. **Note (Phase 8 follow-up):** files on disk are content-hash sharded and could physically collide across businesses; `delete-all-data`'s `fs.unlink` is best-effort and does not yet ref-check across businesses (dev-only path, low priority).
- **Products** — `GET /products` (`search`, `category_id`, `sub_category_id`, `is_active`), CRUD — read any member, write admin/staff. Pricing is `price` + `discount_percent` (0–100); the price a customer pays is always **computed**, never stored: `price * (1 - discount_percent/100)` (`effectivePrice` on the product row; `effectivePriceAtOrder` on order snapshots). `product_code` unique per business. No `barcode`, no `brand_id`, no `mrp`/`wsp`. Creating a product may include an `initialStock` object (`quantity`, `invoiceNo`, `invoiceDate`, `note`) to add a first batch in the same request (calls the same `createStockBatch` as `POST /stock`, threaded through the product-create transaction).
- **Stock** — `GET /stock` (`search`, `product_id`, `invoice_no`, `date_from`, `date_to`), `GET /stock/:id`, `POST /stock`, `POST /stock/import` (`.xlsx`/`.csv`), `DELETE /stock/:id` — admin/staff. One row per intake batch, not per unit. `products.quantity_available`/`quantity_reserved` are the source of truth; every create/delete writes a `stock_ledger` row and keeps the counters in sync. Deleting a batch 409s if the product's `quantity_available` is less than the batch quantity. Each batch carries its own `price`/`discount_percent`/`size`. Invoice-dup guard is scoped per business.
- **Stock Ledger** — `GET /stock-ledger` (`product_id`, `movement_type`, `date_from`, `date_to`) — read-only append-only log (`change_type` in/out; `reference_type` in `order`/`adjustment`/`import`/`dispatch`). Admin/staff.
- **Orders** — `GET /orders` (`status`, `date_from`, `date_to`, `customer_id`, `scope=own`), `POST /orders` (checks `quantity_available` per line, all-or-nothing, does **not** reserve), `PATCH /orders/:id/status`, `PATCH /orders/:id/payment-status` — admin/staff (the storefront customer path is disabled, so every order is an internal/manual order). `order_number` is `ORD-YYYYMMDD-XXXXX` (random 5-char suffix), unique per business, regenerated on collision — **not** a sequential `ORD-00001`. Lifecycle: `pending` → `accepted` → `dispatched` → `completed`, with `rejected`/`cancelled` as terminal exits from `pending`. Stock is locked/reserved only on `pending` → `accepted` (all-or-nothing; stays `pending` with a 409 if stock ran out; per-product counter move). `accepted` → `dispatched` is **not** allowed via PATCH — only via `POST /dispatches`. Acceptance is blocked while `payment_status = 'rejected'`.
- **Dispatches** — `GET /dispatches`, `GET /dispatches/:id`, `POST /dispatches` (`orderId` + optional courier/AWB/note) — admin/staff. Creates a `dispatches` row, releases the order's reserved quantity per product, writes a `stock_ledger` row per product, flips the order to `dispatched` — all in one transaction. `dispatch_number` is `DSP-YYYYMMDD-XXXXX`, unique per business. One dispatch per order (`uq_dispatches_order_id`).
- **Reports** — `GET /reports/stock-summary` (includes low-stock: `quantity_available <= reorder_level`), `GET /reports/order-history` (`days`), `GET /reports/stock-movement` (`days`), `GET /reports/monthly-orders` — aggregate queries, admin/staff, all business-scoped.
- **Users / Sessions (platform)** — `GET /users` (`role`, `search`), `GET/POST/PUT/DELETE /users/:id` — **super admin only**, a global directory (no business context). Deleting a `customer` soft-deletes; deleting `admin`/`staff` hard-deletes. `UserViewPage` (`features/users/pages/UserViewPage.jsx`) shows one user's tabs. Self session endpoints: `GET|DELETE /users/me/sessions[/:sessionId]` (any authenticated role). Cross-user session endpoints under `/api/admin/*` (super admin).

### On Hold — Storefront & Customers

Everything in this section is **disabled** (`STOREFRONT_ENABLED` defaults to `false`). Backend routes 404 via `storefrontEnabled`; frontend routes are unmounted from `app/router.jsx`. Code is **retained, not deleted** — re-enabling is meant to be a small change plus per-business wiring.

- **Storefront (Home)** — customer-facing landing (`features/home/`), was `/store` and the default `/` redirect. Lists active products grouped by category, a 16:9 hero slider above the grid. Product detail (`features/product-detail/`) with related products; category detail (`features/category-detail/`); cart (`features/cart/`, guest-persisted client-side); checkout (`features/checkout/`); order history (`features/my-orders/`). Rendered in `StoreShell` (top navbar, no admin sidebar). **All routes currently unmounted.**
- **Customer auth** — `POST /auth/register` (OTP-gated self-signup), `POST /auth/otp/send` → `POST /auth/otp/login` (passwordless phone sign-in, creates a `customer` account for a new verified number), `POST /auth/complete-profile` (the profile an OTP-created account owes; also the customer profile editor; sets `profile_completed_at`, surfaced as `profileComplete`). All `storefrontEnabled`-gated → 404. See the OTP section for the MSG91 details to restore.
- **Homepage Sliders / Notice Board / Social Links / Site Branding** — admin-editable **per business** (`hero_slides`, `notice`, `social_links`, `site_branding` all have `business_id`), and the admin pages (`features/heroSlides/`, `features/notice/`, `features/settings/`) are live for a business admin. But their only consumers are the storefront public reads (`GET /hero-slides/public`, `/notice/public`, `/settings/social/public`, `/settings/branding/public`), which are `storefrontEnabled`-gated and additionally still need per-business context wired (they currently return static/empty defaults). So a business admin can configure them; nothing renders them yet.
- **Delete All Data** — `POST /api/b/:businessId/settings/delete-all-data` — dev-only (`NODE_ENV=development`), admin only, typed-"DELETE" confirmation in the UI. Wipes **one business's** products, orders, stock, stock ledger, dispatches, catalog tree, hero slides, media (rows + files on disk) and blanks its single-row settings. Global tables (`users`, `memberships`, `businesses`, `refresh_tokens`, `otp_requests`) are never touched.

### Future scope (documented, not built)

- **Staff granular permissions** — fill `memberships.permissions`, add a `can(permission)` helper + `requirePermission` middleware, build the per-staff permission UI. Purely additive — no migration.
- **Storefront re-enable, per business** — `/store/:businessSlug` or per-business subdomain; wire `notice`/`social_links`/`site_branding`/`hero_slides`/public product reads/customer login/cart/checkout to the business in the URL. Flip `STOREFRONT_ENABLED`.
- **Per-business billing / subscription / plan limits.**

## Security

- JWT access tokens (~15min) + refresh tokens (~7d, HttpOnly `sameSite=strict` cookie, HMAC-SHA256 hashed at rest)
- `resolveBusiness` does a live DB check on every tenant request — a revoked membership or deactivated business stops protecting tenant data immediately, not only on the next token refresh
- Helmet for HTTP security headers; CORS allows configured origins plus private LAN origins outside production
- Rate limiting on all routes, stricter on auth routes
- Parameterized queries only — never raw string SQL; every tenant query carries `WHERE business_id = ?`

## Testing

- Use HTML `id` attributes so tests can target elements easily.
- Multi-tenant API E2E (`multitenant_plan.md` Phase 8): super-admin create-business + first-admin, business switch, cross-tenant 403/404, order→accept→dispatch, per-business wipe isolation, super-admin-only user directory, storefront-off — 25/25 passing against a live backend.
- Backend has no working ESLint config yet (Phase 8 follow-up).
