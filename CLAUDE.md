# StockFlow

Stock management webapp for a cloth business (dresses, sarees, kidware, menswear). A single warehouse holds stock; users place orders against it, admin/staff accept and dispatch them.

## Stack

- **Frontend**: React + Vite + JavaScript + AdminLTE + Bootstrap + Zustand + TanStack Query + TanStack Form
- **Backend**: Express + JavaScript + mysql2 (raw parameterized SQL — no ORM)
- **Database**: MySQL
- **API Docs**: Swagger (swagger-jsdoc + swagger-ui-express)
- **Frontend Docs**: Docsify
- **Hosting**: cPanel Linux hosting (Node.js Selector) — no Docker; deployed via a manually-triggered Jenkins pipeline (FTP + SSH + cPanel API) — see `Jenkinsfile` and `deployment_guide.md`

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
    stock/       ...   # quantity-based stock intake: add batch + xlsx/csv import
    stockLedger/ ...
    heroSlides/  ...   # homepage hero slider (16:9 images), admin-managed via the media library
    orders/      ...
    dispatches/  ...   # outward dispatch of accepted orders, releases reserved quantity
    reports/     ...
    settings/    ...   # system administration (dev-only delete-all-data reset)
  utils/jwt.js, logger.js
```

## Frontend Feature Structure

Each domain feature lives in `frontend/src/features/<feature-name>/` and contains:

- `<feature>.api.js` — all API calls for this feature (plain axios functions that return data); the only place that talks to the backend
- `<feature>.store.js` — Zustand store for this feature: **UI/client state only** (filters, selected rows, open modals, pagination cursor); never async data fetching
- `<feature>.schema.js` — Zod (or Yup) schemas used for client-side form validation with TanStack Form; must be consistent with the backend schema for the same feature
- `hooks/` — TanStack Query hooks for this feature (e.g. `use-orders.js`, `use-order-detail.js`); these wrap the `.api.js` functions with `useQuery` / `useMutation`
- `components/` — UI components specific to this feature and with no meaning outside it (e.g. `OrderStatusBadge`, `OrderTimeline`)
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
- No audit logging, no soft deletes — hard-delete rows and rely on `created_at`/`updated_at` only. **One deliberate exception**: deleting a `customer` user deactivates (`is_active=false`) instead of hard-deleting, so their order history stays intact; admin/staff deletes remain hard deletes
- **Database migrations**: every schema change or data modification, no matter how small, gets its own new numbered file in `database/init/` — `04_<description>.sql`, `05_<description>.sql`, etc., continuing the sequence after the last existing file (currently `03_add_catalog_sort_order.sql`). The file is a runnable `ALTER TABLE`/backfill script for an already-provisioned DB — never a comment embedded in `01_schema.sql`. In the same change, also update `01_schema.sql`'s `CREATE TABLE` statements so a fresh install already matches head — `01_schema.sql` must always reflect current head, with no historical notes accumulating in it. Never hand-run untracked SQL against any DB (dev included) — write the migration file first, then run it, so dev/prod/every clone can replay the exact same history

## Error Handling

- Always throw `AppError(statusCode, message)` for expected errors (404, 400, 403, etc.) — never plain `Error`
- Unexpected errors (crashes, unhandled cases) are caught by the global `errorHandler` middleware automatically
- All middleware must either call `next()` or send a response — never both
- All async route handler errors must be passed to `next(err)` — never catch and swallow silently

## Auth Concept

JWT-based auth with access + refresh tokens.

- **Register** (`POST /auth/register`) — public, rate-limited customer self-signup (name, email, phone, `otp`, address fields, password; same password policy as change-password). **The OTP is mandatory** — the phone must be verified first via `POST /auth/otp/send` with `purpose: 'register'`, and registration consumes that code before any row is written, so an account is never created for a number the caller hasn't proven they hold. Role is hard-coded to `customer` server-side. On success the customer is auto-logged-in (issues the token pair + refresh cookie). Duplicate email/phone returns a generic 409.
- **Login — password** (`POST /auth/login`) — takes `{ identifier, password }` where `identifier` is an **email** (how admin/staff sign in) or a **phone number** (customers, who may use either this or the OTP path). Both columns are unique so one lookup serves both. Generic "Invalid credentials" error — never reveal whether the account exists. A NULL `password_hash` (an OTP-created account that never set one) gets that same generic error, never a "this account has no password" hint.
- **Login — OTP, and sign-up by the same door** (`POST /auth/otp/send` → `POST /auth/otp/login`) — passwordless phone sign-in via MSG91 (below). `otp/send` answers `204` and sends a code to **any** phone; there is no registered/unregistered branch anywhere in this flow. **A verified number with no account behind it creates one** (`createCustomerFromPhone`, role hard-coded to `customer`) and signs it in, rather than being turned away with "register first" — the caller has already proven they hold the number, and making them prove it a second time through a different form buys nothing. The account starts with *only* that phone: `name`, `email` and `password_hash` are all NULL, which is why all three columns are nullable.
  - Because every number behaves identically, this flow leaks nothing about who is registered. That is now structural rather than a guard to maintain — do not reintroduce an "account exists?" check in `issueOtp`.
  - A **deactivated** account is never resurrected by signing in (403, as before). Only an admin re-enables it, or the customer re-registers through the form, which is an explicit act of signing up again.
- **Complete profile** (`POST /auth/complete-profile`, authenticated) — the profile an OTP-created account still owes: name, email, address fields, optional business name, and an **optional** password. Optional because such an account can always sign in with a code; demanding one would put a remembered secret back into the one flow whose point is not having any. Sets `profile_completed_at`, which every session payload surfaces as `profileComplete`. Also serves as the customer's own profile editor, and is the only way a passwordless account can later set a password (`change-password` needs a current one and 400s when there is none).
  - **Skippable, enforced at checkout.** The customer lands on the form straight after an account-creating OTP login, and `StoreShell` keeps a standing banner while `profileComplete === false`, but browsing works without it. `CheckoutPage` is where it becomes mandatory — the first thing that genuinely needs a name and an address. Admin edits count too: filling in a name and email through `PUT /users/:id` marks the profile complete.
  - Anything rendering a customer must therefore tolerate a NULL name/email — use `lib/user.js` `userDisplayName()`, which falls back to the phone number.
- **Account lockout** — after 5 failed *password* attempts, lock the account for 15 minutes (`failed_login_attempts`, `locked_until` columns). OTP login has no local lockout: MSG91 owns the per-code attempt cap, and there is no local code to guess against.
- **Tokens**:
  - Access token (JWT, short-lived e.g. 15m) — carries `sub` (user id) and `role`, used to authorize requests via `Authorization: Bearer <token>`.
  - Refresh token (random opaque string, long-lived e.g. 7d) — stored **hashed** (SHA-256) in a `refresh_tokens` table, set as an `httpOnly`, `sameSite=strict`, `secure` (prod) cookie. Never sent in JSON body.
- **Refresh rotation** (`POST /auth/refresh`) — every refresh consumes (revokes) the old token and issues a new pair. If a revoked/already-used token is replayed, treat it as token theft: revoke **all** sessions for that user.
- **Logout** (`POST /auth/logout`) — revokes the refresh token and clears the cookie.
- **Me** (`GET /auth/me`) — returns the authenticated user's safe profile (excludes password hash, token data).
- **Change password** (`POST /auth/change-password`) — voluntary, self-service only. There is no forced/temporary-password concept: a password set by self-registration or by an admin creating/resetting a user is permanent from the start; a user is never forced through this endpoint before continuing to use the app. Password policy: min 8 chars, upper, lower, number, special char.
- **Middleware**: `authenticate` — verifies the Bearer access token, attaches decoded payload to `req.user`, rejects with 401 on missing/invalid/expired token.
- **Rate limiting**: login/refresh/change-password endpoints behind a stricter limiter to slow brute-force attempts. `POST /auth/otp/send` gets its own tighter `otpLimiter` (every call spends a real SMS) **plus** a per-phone quota in the service, which a rotating IP cannot bypass.

### Auth Implementation

- Access tokens are JWT — signed with `signAccessToken()`, verified in memory, never stored in DB
- Refresh tokens are plain random strings — generated with `generateRefreshToken()`, hashed with SHA-256 via `hashRefreshToken()` before DB storage
- Never store raw refresh tokens in the DB — always store the hash
- Protected routes use the `authenticate` middleware which attaches `req.user` (contains `sub` and `role`)

### OTP (MSG91 widget, server-to-server)

OTP delivery goes through the MSG91 **OTP Widget** REST API, driven entirely from the backend (`backend/src/utils/msg91.js`). There is no browser widget/SDK, no hCaptcha, and `tokenAuth` is never used — only the account `authkey`.

- **The code is never generated, stored, hashed, or expired by this app.** MSG91 owns generation, delivery, expiry, and the per-code attempt cap. Never build a local code/attempt counter — there is nothing on our side to check against.
- **`otp_requests` stores the binding, not the code**: MSG91's `reqId` paired with the phone it was issued for. The client only ever sends a phone number; `consumeOtp()` resolves the `reqId` from *our* row. **Never take a `reqId` from a request body** — that discards the whole security model, since a client could then verify a code for number A and claim number B.
- `expires_at` on the row is a *defensive local ceiling* only (`OTP_TTL_MINUTES`), never the real expiry.
- `purpose` (`login` | `register`) scopes each code — a login code can never be spent on a registration, or vice versa. Both purposes now send to any number (login creates the account on verify), so the field is purely about which endpoint may spend the code.
- **Failures arrive at HTTP 200 with `type: "error"`, not as a 4xx** — always branch on `type`, never on response status.
- **`MSG91_SEND_PATH` must match the widget's dashboard configuration** and nothing in the widget id reveals which it is: `sendOtp` needs Integration=`web` **and** Captcha Validation **OFF**; `sendOtpMobile` needs Integration=`Mobile`. A mismatch fails silently at HTTP 200 with `"Invalid Captcha Token."` or `"Mobile requests are not allowed for this widget."` Diagnose with `npm run msg91:check -- 919876543210` (**never with `curl`** — these endpoints answer 302 by design, which makes curl report a false failure).
- The country code sent to MSG91 comes from the admin-configured `warehouse.phone_country_code` with the `+` stripped — never hardcode `91`.
- Frontend OTP input accepts 4–8 digits rather than a fixed length: **code length is an MSG91 dashboard setting**, and pinning it here would silently reject every real code if it were changed.
- **Both OTP forms are stepped, phone first.** Login is phone → code; registration is phone → code → profile. The code input is never in the DOM until a code has actually been sent (`useOtpSender` resolves `true` only after the send succeeds), and the profile fields are never asked for before the phone is verified — collecting a full profile up front would risk throwing all of it away at the last step. Shared pieces: `hooks/use-otp.js` `useOtpSender()` owns the send mutation plus the resend cooldown (it lives in the hook, not a step component, because the two steps are never mounted together and a component-owned cooldown would reset into a free resend), and `components/OtpCodeStep.jsx` is the code step for both pages.
- The registration code is only judged when `POST /auth/register` spends it, so the code step can only check the code's *shape*; a rejected code comes back as `details.code === 'OTP_INVALID'`, which the form uses to reopen the code step. **Branch on that code, never on the message text** — the message is deliberately generic and interchangeable.

### Session Management

Each row in `refresh_tokens` represents one active session (one login on one device). A `last_used_at` column (touched on every `/auth/refresh`) lets sessions show recency, not just creation time.

- **List sessions** — `GET /users/:id/sessions` (self) and `GET /admin/sessions` (admin, all users) — return non-revoked, non-expired `refresh_tokens` rows: device/user agent, ip address, created_at, last_used_at, expires_at. Never expose the token hash itself.
- **Terminate a session** — `DELETE /admin/sessions/:sessionId` (or self `/users/me/sessions/:sessionId`) — sets `revoked_at = NOW()` on that row. The corresponding access token remains valid until it naturally expires (short-lived, e.g. 15m).
- **Terminate all sessions for a user** — `DELETE /admin/users/:id/sessions` — revokes every active `refresh_tokens` row for that user (admin "force logout everywhere").
- Only the **Admin** role can view/terminate other users' sessions; any user can view/terminate their own.

## Roles

Three roles — no scoping. There's a single warehouse, so no per-user or per-request warehouse filtering exists anywhere:

- **Admin** — full access: manages Users/Staff, warehouse settings, products/stock, orders/dispatches, and reports.
- **Staff** — operational role: places orders, accepts/dispatches orders, manages stock. Cannot manage users or warehouse settings.
- **Customer** — self-registered storefront shopper. Browse-only access to the product catalog through the separate storefront UI; no back-office access at all. Customers sign up themselves via the public `POST /auth/register` endpoint (role is hard-coded server-side to `customer` — never taken from the request).

Admin and staff are the internal back-office (AdminLTE sidebar shell); customers get a separate top-navbar storefront shell (`StoreShell`) mounted at `/store`. Role is embedded in the access token payload (`{ sub, role }`) so every route handler can authorize without an extra DB lookup.

### Data model

```sql
-- users
id                    PK
name                  -- NULL until an OTP-created customer completes their profile
email                 UNIQUE, NULL -- same; MySQL allows many NULLs in a unique index
password_hash         -- NULL on an OTP-only account that never set a password
phone                 UNIQUE, NULL -- the customer login identifier; admin/staff have none
role                  ENUM('admin','staff','customer')
profile_completed_at  -- NULL = minted by OTP login and still missing its profile
is_active             -- FALSE also doubles as the customer soft-delete flag (see Coding Rules)
failed_login_attempts, locked_until
created_at, updated_at
```

The three nullable identity columns are load-bearing, not laziness: OTP sign-in creates an account
from a verified phone number and nothing else. Do not add `NOT NULL` back to any of them.

### Permission matrix (high level)

| Action                                           | Admin | Staff | Customer |
| ------------------------------------------------ | ----- | ----- | -------- |
| Manage warehouse settings (name/address/contact) | ✅    | ❌    | ❌       |
| Manage homepage hero sliders                     | ✅    | ❌    | ❌       |
| Manage users (create/edit/deactivate)            | ✅    | ❌    | ❌       |
| View/manage products & stock                     | ✅    | ✅    | ❌       |
| Browse product catalog (storefront)              | ✅    | ✅    | ✅ (also guests, no login required) |
| Place orders                                     | ✅    | ✅    | ✅ (via storefront cart/checkout) |
| Accept/dispatch orders                           | ✅    | ✅    | ❌       |
| View reports                                     | ✅    | ✅    | ❌       |
| View/terminate sessions — own                    | ✅    | ✅    | ✅       |
| View/terminate sessions — others                 | ✅    | ❌    | ❌       |

### Onboarding flow

1. Admin sets up the Warehouse record (`PUT /warehouse`) — name, address, contact details.
2. Admin creates Users, choosing `role` (`admin` or `staff`) and setting a permanent password directly — there is no temporary-password/forced-change step.
3. Customers arrive one of two ways, both public and both ending in an auto-login to the storefront, with no admin involvement:
   - **Phone + OTP** (the main door) — `POST /auth/otp/send` → `POST /auth/otp/login`. If the number is new, the account is created right there and the customer lands on the profile-completion form already signed in. There is no "you must register first" state.
   - **The registration form** (`POST /auth/register`) — collects the whole profile up front, still OTP-gated, and arrives complete.

   Registering (or an admin re-adding a user) with the same email/phone as a previously deactivated (soft-deleted) customer reactivates that same account instead of creating a duplicate. Thereafter a customer signs in with phone + OTP, or phone + password if they chose to set one; admin/staff sign in with email + password.

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

- **Storefront (Home)** — customer-facing ecommerce landing at `/store`, which is also what the home URL (`/`) redirects to by default for every visitor (frontend `features/home/`). Lists active products grouped by category using the existing `GET /products` endpoint; browse-only, no new backend routes. Browsing (home + product detail) requires no login — `GET /products`, `GET /products/:id`, `GET /divisions`, `GET /categories`, `GET /sub-categories` are public reads; only cart/checkout/order-history need an account. Renders inside `StoreShell` (top navbar, no admin sidebar). Logged-in admin/staff reach the back office via a "Dashboard" link in the account dropdown, not the default landing page. A full-width 16:9 hero slider (`features/home/components/HeroSlider.jsx`) renders above the product grid, fed by the public, unauthenticated `GET /hero-slides/public` endpoint (active slides only, in `sort_order`).
- **Homepage Sliders** — admin-only management of the storefront hero slider (`backend/modules/heroSlides/` ↔ `frontend/features/heroSlides/`). Each slide references one image from the shared media library (`media_id`, denormalized `media_url`) plus an optional click-through `link_url`, an `is_active` toggle, and a manual `sort_order`. `GET /hero-slides/public` (unauthenticated, active only) feeds the storefront; `GET /hero-slides`, `POST /hero-slides`, `PUT /hero-slides/:id`, `PATCH /hero-slides/reorder`, `DELETE /hero-slides/:id` are admin-only, mirroring the catalog's drag-and-drop reorder pattern. Deleting a slide detaches its `media_usage` row but does not delete the underlying media item.
  - Product detail (`features/product-detail/`) shows up to 4 "Related Products" from the same category (client-side filter over `GET /products?category_id=`), rendered with the shared `components/common/ProductCard.jsx` (also used by `features/home`).
  - Clicking "Add to Cart" while logged out shows a `LoginRequiredModal` (`components/common/`) instead of adding the item — the cart itself is always guest-persisted client-side, but building it up is gated behind login.
  - Checkout (`features/checkout/`) prefills the shipping form from the logged-in customer's saved profile (`GET /auth/me`) — still editable per order. A customer whose `profileComplete` is false is redirected to `/store/complete-profile` first (with `state.from` so they come straight back); this is the only place an incomplete profile actually blocks anything.
- **Dashboard** — summary widgets, no dedicated routes beyond `GET /reports/*`.
- **Warehouse** — `GET /warehouse`, `PUT /warehouse` — single-record settings (name, address, contact); admin only for write.
- **Notice Board** — admin-only single-record scrolling announcement text shown at the top of the storefront (`backend/modules/notice/` ↔ `frontend/features/notice/`), mirroring the Warehouse single-row settings pattern. `GET /notice/public` (unauthenticated, returns an empty message unless `is_active` is on) feeds a scrolling bar in `StoreShell`; `GET /notice` (any authenticated role) and `PUT /notice` (admin only) manage it from the admin `NoticePage`.
- **Catalog** — `divisions`, `categories`, `sub_categories` — `GET /divisions`, `GET /categories` (`division_id`), `GET /sub-categories` (`category_id`), CRUD on each — admin only for write; staff read-only. Deleting a division/category/sub-category that still has children or products is rejected (`ON DELETE RESTRICT`) — deactivate (`is_active=false`) instead.
- **Sizes** — admin-managed predefined size picklist (`backend/modules/sizes/` ↔ `frontend/features/sizes/`), same flat drag-and-drop-reorder shape as a catalog division (`value`, `is_active`, `sort_order`). `GET /sizes`, `POST /sizes`, `PUT /sizes/:id`, `PATCH /sizes/reorder`, `DELETE /sizes/:id` all require an authenticated admin/staff session (unlike catalog, this isn't customer-facing); writes are admin-only. **`products.size` and `stock.size` store the picked value directly as plain text, not a foreign key** — so deleting a size never fails with a restriction error, and existing rows keep whatever size string they already had even if it's later removed from the list. The Product edit and Stock intake forms both populate their size field from this list via a `<select>` instead of free text.
- **Products** — `GET /products` (`search`, `division_id`, `category_id`, `sub_category_id`, `brand_id`, `is_active`), CRUD — admin/staff for write. Pricing is `price` (listed price) + `discount_percent` (0-100); the customer-facing price a customer actually pays is always computed, never stored, as `price * (1 - discount_percent/100)` (backend exposes this as `effectivePrice` on the product row; order snapshots as `effectivePriceAtOrder`). `product_code` unique. `products` has no `barcode` column. Creating a product may optionally include an `initialStock` object (`quantity`, `invoiceNo`, `invoiceDate`, `note`) to add a first stock batch in the same request, using the product's own `price`/`discountPercent`/`size` — this calls the same `createStockBatch` used by `POST /stock`, just server-side from `products.service.js` (frontend features never import each other's hooks, so this stays out of the Stock feature's client code).
- **Stock** — `GET /stock` (`search`, `product_id`, `invoice_no`, `date_from`, `date_to`), `GET /stock/:id`, `POST /stock` (create one intake batch against a product: quantity, invoice no/date, price/discount_percent, size, note), `POST /stock/import` (bulk `.xlsx`/`.csv`), `DELETE /stock/:id` — admin/staff; one row per intake batch, not per unit — `stock` is a receipt/batch ledger, and `products.quantity_available`/`quantity_reserved` are the source of truth for stock on hand; every create/delete writes a `stock_ledger` row and keeps the counters in sync. Deleting a batch is rejected with a 409 if the product's `quantity_available` is less than the batch's quantity (some of it is reserved or dispatched). Each batch carries its own `price`/`discount_percent` (can vary within the same product, e.g. by size) — `products.price`/`discount_percent` are only the default used when a product is first created manually.
- **Stock Ledger** — `GET /stock-ledger` (`product_id`, `movement_type`, `date_from`, `date_to`) — read-only, append-only log of every stock movement (import, order reserve/release, dispatch, adjustment).
- **Orders** — `GET /orders` (`status`, `date_from`, `date_to`, `customer_id` — admin/staff filtering to one user's orders, used by `UserViewPage`), `POST /orders` (checks `quantity_available` per line, all-or-nothing, but does **not** reserve stock; admin/staff may pass `requestedFor` + `paymentMethod: 'offline'` for manual walk-in/phone orders), `PATCH /orders/:id/status`. Lifecycle: `pending` → `accepted` → `dispatched` → `completed`, with `rejected`/`cancelled` as terminal exits from `pending`. The ordered quantity is only locked and reserved on the `pending` → `accepted` transition (all-or-nothing; the order stays `pending` with a 409 if stock ran out in the meantime) — this is a per-product counter move, not a lock on specific physical units. `rejected`/`cancelled` happen only from `pending`, before anything is reserved, so there's nothing to release. The `accepted` → `dispatched` transition is NOT allowed via PATCH — it only happens through `POST /dispatches`.
- **Dispatches** — `GET /dispatches`, `GET /dispatches/:id`, `POST /dispatches` (orderId + optional courier/AWB/note — a one-step confirmation, no scanning) — admin/staff. Creates a `dispatches` row, releases the order's reserved quantity per product, writes a `stock_ledger` row per product, and flips the order to `dispatched` in the same transaction.
- **Reports** — `GET /reports/stock-summary` (includes low-stock: `quantity_available <= reorder_level`), `GET /reports/order-history` (`days`), `GET /reports/stock-movement` (`days` — daily physical in/out from `stock_ledger`, counting only `import`/`adjustment`/`dispatch` rows) — aggregate queries.
- **Users / Staff** — `GET /users` (`role`, `search`), CRUD — admin only. Create/edit accept the same profile fields as customer self-registration (phone, business name, address, town, district, state, pincode) in addition to name/email/role/password, though they're only meaningful for `role='customer'`. Deleting a `customer` soft-deletes (see Coding Rules); deleting `admin`/`staff` hard-deletes. `UserViewPage` (frontend `features/users/pages/UserViewPage.jsx`) shows one user's Details/Orders/Payments in tabs, backed by `GET /orders?customer_id=` (admin/staff only). Plus session endpoints above.

All write routes (`POST`/`PUT`/`PATCH`/`DELETE`) go through `authenticate` + `requireRole(...)`; list/read routes go through `authenticate` + `pagination`.

## Security

- JWT access tokens (15min) + refresh tokens (7d, HttpOnly cookie)
- Helmet for HTTP security headers
- Rate limiting on all routes, stricter on auth routes
- Parameterized queries only — never raw string SQL

## Testing

- Use HTML id attribute so that it will be easy for testing.
