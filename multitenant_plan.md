# StockFlow → Multi-Tenant SaaS — Implementation Plan

Status / progress (branch `multi-tenant-saas`):

- ✅ **Phase 0** — divisions removal finished, de-branded, safe cleanup (`9e8768e`)
- ✅ **Phase 1** — storefront + customer login disabled behind `STOREFRONT_ENABLED` (`798dd0d`)
- ✅ **Phase 2** — tenancy schema & seed; `04`–`06` migrations + rewritten `01`/`02`, validated
  against the real DB (fresh install, upgrade path, and fresh≡upgraded all pass)
- ✅ **Phase 3** — token carries `{sub,role,isSuperAdmin,memberships}`; resolveBusiness / requireBusinessRole / requireSuperAdmin middleware; /auth/me business list; multi-tab refresh grace window (migration 07)
- ✅ **Phase 4** — businesses CRUD (super admin) + per-business member management (business admin); last-admin guards
- ⬜ **Phase 5** — convert tenant modules to business scope  ← next

- ⬜ **Phase 5** — convert tenant modules to business scope
- ⬜ **Phase 6** — frontend tenancy
- ⬜ **Phase 7** — super-admin frontend
- ⬜ **Phase 8** — tests, docs, polish

**DB engine note:** the dev DB and the cPanel host both run **MariaDB 10.4**, not MySQL 8.0 as the
old schema header claimed. Migrations use portable syntax (`DROP CONSTRAINT`, not `DROP CHECK`).
`memberships.permissions JSON` is stored as `LONGTEXT` with a JSON-valid CHECK on MariaDB — fine for
our use. Headers now say `MariaDB 10.4+ / MySQL 8.0.19+`.

---

## 1. Target architecture

### 1.1 Concept

StockFlow becomes a multi-tenant SaaS. It is no longer "one warehouse vs. retailers" — it is
**many independent businesses**, each with its own catalog, stock, orders, dispatches, reports and
settings. There is no data sharing between businesses.

Actors:

| Actor | How they exist | What they can do |
| --- | --- | --- |
| **Super admin** | a `users` row with `is_super_admin = 1` | Create / edit / deactivate businesses. Assign the first admin to a business. Global user directory. Can act inside any business as an admin. |
| **Business admin** | a `users` row + a `memberships` row `(user, business, role='admin')` | Full control of **that** business: products, stock, catalog, orders, dispatches, reports, business settings, and (future) staff & their permissions. |
| **Business staff** *(future scope — data model built now, UI later)* | `memberships` row `(user, business, role='staff', permissions=…)` | Operational subset of a business, gated by a per-membership `permissions` JSON. |
| **Customer** | existing `role='customer'` rows | **Dormant.** Storefront and customer login are disabled in this phase. Rows are left intact for later. |

Key rules that fall straight out of this model (and match the stated vision):

- **A user is ONE global `users` row.** "Admin of business A + staff of business B" = two `memberships`
  rows for the same `user_id`. "Admin of many businesses" = many `memberships` rows. No user duplication.
- **One login → every business.** The user authenticates once (email + password). The access token
  carries the full membership list. Switching business is a URL change, not a re-login.
- **Super admin is a flag, not a role** — orthogonal to memberships, so a super admin can additionally
  be a normal member of specific businesses without special-casing.

### 1.2 Tenant context = URL (decided)

Back-office routes are nested under a business segment:

```
frontend   /#/b/:businessId/dashboard   /#/b/:businessId/products   …
backend    /api/b/:businessId/products  /api/b/:businessId/orders   …
```

- Frontend: a `business.store.js` Zustand store mirrors `:businessId` from the route. A **business
  switcher** dropdown in the topbar lists the user's memberships and navigates to the same sub-path
  under the new business id.
- Every tenant `*.api.js` function takes `businessId` as its first argument; every TanStack Query key
  includes it, so cache is per-business and switching never shows stale data.
- Non-tenant routes stay flat: `/login`, `/businesses` (picker/landing), `/admin/businesses`,
  `/admin/users`.

### 1.3 Authorization = memberships baked into the token (decided)

Access-token payload changes from `{ sub, role }` to:

```jsonc
{
  "sub": "<user uuid>",
  "isSuperAdmin": false,
  "memberships": [
    { "b": "<business uuid>", "r": "admin" },
    { "b": "<business uuid>", "r": "staff" }
  ]
}
```

- Zero DB lookups for the common authz check — the middleware reads `req.user.memberships`.
- **Tradeoff (documented, accepted):** a role/permission change or a membership revocation takes
  effect only on the next token refresh (≤ 15 min). Mitigation: `resolveBusiness` (below) *does* hit
  the DB to confirm the business and membership are still active, so **tenant data** is protected
  immediately; only the 15-min window of "still shows the nav item" staleness remains, on global
  routes.
- `permissions` is deliberately **left out of the token for now** (staff-permissions is future scope).
  When it lands it will be read in `resolveBusiness` from the membership row, not the token.

### 1.4 New middleware

| Middleware | Responsibility |
| --- | --- |
| `authenticate` *(existing, minimally changed)* | verify Bearer JWT → `req.user = { sub, isSuperAdmin, memberships }` |
| `resolveBusiness` *(new)* | read `:businessId` (route param, `mergeParams:true`). Confirm the business exists and `is_active`. Resolve the caller's role: membership role, or `admin` if `isSuperAdmin`. Set `req.business = { id }` and `req.membership = { role, permissions }`. `404` unknown business, `403` non-member non-super-admin. |
| `requireBusinessRole(...roles)` *(new)* | assert `req.membership.role` ∈ roles. Replaces `requireRole('admin'|'staff')` inside every tenant module. |
| `requireSuperAdmin` *(new)* | assert `req.user.isSuperAdmin`. Guards `/api/businesses` and `/api/users`. |

`requireRole` is retired from tenant modules; it may remain only if some truly global non-super-admin
route needs it (none identified).

---

## 2. Data model changes

### 2.1 New tables

```sql
CREATE TABLE businesses (
  id          CHAR(36)      NOT NULL,
  name        VARCHAR(150)  NOT NULL,
  slug        VARCHAR(64)   NOT NULL,           -- url-safe, shown in switcher
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_businesses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE memberships (
  id           CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  business_id  CHAR(36)     NOT NULL,
  role         ENUM('admin','staff') NOT NULL,
  permissions  JSON         NULL,               -- future staff granularity; NULL = role default
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_memberships_user_business (user_id, business_id),
  KEY idx_memberships_business (business_id),
  CONSTRAINT fk_memberships_user     FOREIGN KEY (user_id)     REFERENCES users (id)      ON DELETE CASCADE,
  CONSTRAINT fk_memberships_business FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 `users` table

- **ADD** `is_super_admin BOOLEAN NOT NULL DEFAULT FALSE`.
- **KEEP** `role` column as-is for now (still meaningful for `customer`; ignored for back-office authz).
  Do not migrate it away in this project — it keeps dormant customer rows valid and avoids a large
  churn. Back-office role comes exclusively from `memberships`.
- `email` stays **globally unique** — correct and desired (one user, one login, many businesses).
- Nullable identity columns (`name`, `email`, `password_hash`, `phone`) stay nullable.

### 2.3 `business_id` on tenant-owned tables

Add `business_id CHAR(36) NOT NULL` + FK `REFERENCES businesses(id) ON DELETE CASCADE` + index to:

`categories`, `sub_categories`, `sizes`, `products`, `product_gallery_images`, `orders`,
`order_items`, `stock`, `stock_ledger`, `dispatches`, `hero_slides`, `media`, `media_usage`.

**Leaf tables (`order_items`, `product_gallery_images`, `media_usage`) get `business_id` too**, even
though it's derivable from the parent. Rationale: every tenant query becomes a flat
`WHERE business_id = ?` filter, and cross-tenant JOIN-leak bugs become impossible. Small
denormalization, large safety win. Populated from the parent on insert.

### 2.4 Composite-uniqueness changes (currently global, must be per-business)

| Table | Was | Becomes |
| --- | --- | --- |
| `products.product_code` | `UNIQUE (product_code)` | `UNIQUE (business_id, product_code)` |
| `categories.name` | `UNIQUE (name)` | `UNIQUE (business_id, name)` |
| `sub_categories (category_id, name)` | already parent-scoped | add `business_id` to the key for consistency |
| `sizes.value` | `UNIQUE (value)` | `UNIQUE (business_id, value)` |
| `orders.order_number` | `UNIQUE (order_number)` | `UNIQUE (business_id, order_number)` |
| `dispatches.dispatch_number` | `UNIQUE (dispatch_number)` | `UNIQUE (business_id, dispatch_number)` |
| `media.file_hash` | `UNIQUE (file_hash)` (global dedup) | `UNIQUE (business_id, file_hash)` (per-business dedup) |
| `media_usage (media_id, entity_type, entity_id)` | ok | add `business_id` |
| `orders.idempotency_key` | `UNIQUE` | keep global (it's a client UUID) |
| `orders.transaction_id` dup-check | service-level, global | scope to `business_id` |
| `stock` invoice-dup guard | service-level, global | scope to `business_id` |

**Order / dispatch / (implicit) numbering restarts per business** — `ORD-00001` is per-tenant.
(Assumed desirable; flag in review if not.)

### 2.5 Single-row settings tables → per-business

`warehouse`, `notice`, `social_links`, `site_branding`:

- Drop the `CHECK (id = 1)` constraint and the `id TINYINT DEFAULT 1` PK.
- Add `business_id CHAR(36) NOT NULL` as PK (one settings row per business), FK cascade.
- `warehouse` is renamed in concept to **"business settings"** (currency symbol/decimals, phone
  country code/length, address, contact, bank-transfer details). The table/module MAY keep the name
  `warehouse` to limit churn, or be renamed to `business_settings` — **decision for review** (rename
  is cleaner; costs a module rename + frontend feature rename).
- `notice`, `social_links`, `site_branding`, `hero_slides` are **storefront-only**. Their schema gets
  `business_id` now, but their code is only fully wired for tenancy when the storefront is
  re-enabled (future scope). Until then they remain admin-editable per business but unused by any
  public surface.

### 2.6 Migration & seed

- New migration file(s) continuing the numbered sequence. Current head is `02_seed.sql`, but see
  **Phase 0** — the `divisions` removal still owes a `03_*.sql`. Sequence will be:
  - `03_drop_divisions.sql` (Phase 0)
  - `04_multitenant_core.sql` (businesses, memberships, users.is_super_admin)
  - `05_multitenant_business_id.sql` (business_id columns, FKs, composite uniques, backfill, NOT NULL)
  - `06_settings_per_business.sql` (single-row settings → per-business)
- **Backfill strategy** in `05`:
  1. Insert one `businesses` row — "Default Business" (slug `default`).
  2. `UPDATE <each tenant table> SET business_id = '<default id>'` (all rows, while column is nullable).
  3. `ALTER … MODIFY business_id … NOT NULL` + add FKs + composite uniques.
  4. `UPDATE users SET is_super_admin = 1 WHERE id = '<seed admin id>'`.
  5. Insert `memberships`: seed admin → Default Business (`admin`); seed staff → Default Business (`staff`).
- `01_schema.sql` is rewritten to reflect head after each migration (per the repo convention).
- `02_seed.sql` rewritten: a super-admin user, one demo business, a demo business-admin + membership,
  demo catalog/sizes/products/stock under that business. Fix the malformed seed phone numbers
  (`'+91-9000000003'` → local digits only).

---

## 3. Bugs found during exploration — disposition

### 3.1 Blocking prerequisite (Phase 0)

- **`divisions` table was removed from `01_schema.sql` / `02_seed.sql` in commit `6f542ec` but the
  code still uses it everywhere.** Right now `catalog` category-create, `products` list/create,
  `GET /reports/stock-summary`, and `POST /settings/delete-all-data` are **broken against the current
  schema.** The commit message itself says a follow-up is owed. This must be finished before any
  tenancy work — you cannot layer `business_id` onto code that doesn't run.
  - Backend: strip `division` from `catalog.service.js` / `catalog.router.js` / `catalog.schema.js`,
    `products.service.js` (`PRODUCT_JOINS`, `listProducts` filter, `importProducts`),
    `reports.service.js` (`getStockSummary` byDivision block), `settings.service.js` (`deleteAllData`
    `DELETE FROM divisions`).
  - Frontend: `features/catalog` divisions pages/hooks/modals, `features/division-detail`, sidebar
    "Divisions" item, `division_id` product filters, storefront `StoreNavMenu` division dropdowns.
  - Migration `03_drop_divisions.sql` for already-provisioned DBs (`DROP TABLE divisions`, drop
    `categories.division_id` FK + column).
  - Remove dead `brand_id` filter reference in `products` (no `brands` table exists).

### 3.2 Fix along the way (we're rewriting this code for tenancy anyway)

- **`Promise.all` over a single transaction connection** in `catalog.reorderDivisions/Categories/
  SubCategories`, `sizes.reorderSizes`, `heroSlides.reorderHeroSlides` — concurrent `execute()` on
  one mysql2 connection is unsafe. Convert to sequential `for` loops.
- **`products.createProduct` is not atomic** — product row, gallery rows, `media_usage` rows, and the
  nested `createStockBatch` (which opens its *own* separate transaction) run on independent pool
  connections. Wrap in one `withTransaction`; thread `execute` into `createStockBatch`. Same pattern
  for `updateProduct` / `deleteProduct` / `syncGalleryImages`.
- **Multi-tab silent-refresh nukes all sessions.** Two tabs load the app, both `POST /auth/refresh`
  with the same cookie; the second presents a just-rotated token and `refreshTokens` treats it as
  theft → revokes every session. Real hazard once teams use the app. Fix: add
  `refresh_tokens.replaced_by CHAR(36)` and a short grace window — replay of a token revoked < ~10 s
  ago whose successor is still active re-issues from the chain instead of triggering the theft
  response. (Do this in Phase 3.)
- **`stockLedger.schema.js` `referenceType` enum omits `'dispatch'`** — you can't filter the ledger
  to dispatch movements though the DB writes them. Add it.
- **Staff can open admin-only frontend pages** (`/users`, `/warehouse` have no `allow={[ADMIN]}`
  wrapper). Resolved by the Phase 6 route restructure — ensure new guards are complete.

### 3.3 Opportunistic cleanup (Phase 0, cheap and safe)

- Remove the unguarded `/__debug-upload` route that ships to production (`app/router.jsx:52`).
- Remove the forever-running dead-feature `localStorage` cleanup in `main.jsx:12-15`.
- `FRONTEND_URL` is `required()` in `env.js` but used nowhere — make it `optional()` or delete.
- Remove unused `dotenv` dependency (`--env-file` is used).
- Mount the defined-but-unused `ErrorBoundary` in `providers.jsx`; add a top-level `path:"*"`
  NotFound route; fix `RouteErrorPage` (both branches currently return `NotFoundページ`).
- Swagger is a claimed feature (`CLAUDE.md:10`) with installed deps but no mounted route — either
  mount `/api-docs` or drop the deps + the claim. **Decision for review** (recommend: drop for now,
  revisit when the API surface stabilises post-migration).

### 3.4 Documentation corrections (Phase 8, plus `project_overview.md` in Phase 0)

- `project_overview.md` is badly stale (divisions, `mrp`/`wsp`, `must_change_password`, "no CI/CD")
  — rewrite for multi-tenant reality.
- `CLAUDE.md`: refresh-token hashing is HMAC-SHA256 not "SHA-256"; self-session route is
  `/users/me/sessions` not `/users/:id/sessions`; module tree omits `media/`, `notice/`, `sizes/`,
  `db/transaction.js`; order-number format is `ORD-YYYYMMDD-XXXXX` not `ORD-00001`; `app.js` uses a
  default export; stale "Docsify" claim (no docs site exists). All rewritten in Phase 8 alongside the
  new multi-tenant sections.
- Remove stale "forced-change flag" JSDoc in `auth.service.js:475`.

### 3.5 Out of scope / deferred

- `CheckoutPage` hard-coded money formatting — storefront, disabled this phase.
- Storefront feature-folder structure not matching `CLAUDE.md` — storefront, disabled.
- `authenticate` not re-checking `is_active` on the access-token path — accepted 15-min staleness on
  global routes; tenant routes are covered by `resolveBusiness`. Revisit only if a shorter access-
  token TTL isn't enough.

---

## 4. "South Center" removal (Phase 0 — full cleanup, decided)

| File | Change |
| --- | --- |
| `frontend/index.html:6` | `<title>South Center</title>` → `<title>StockFlow</title>` |
| `frontend/src/styles/storefront.css:2` | genericise the "South Center — storefront design system" header comment |
| `Jenkinsfile` | replace hard-coded `southcenter` FTP id / remote dirs / SSH host / cPanel user / API host / app name / `VITE_API_URL` default with `parameters` + `environment` placeholders and Jenkins credentials; generic example defaults |
| `deployment_guide.md` | rewrite with `<your-domain>` / `<cpanel-user>` placeholders throughout |
| `main-website-landing-page.html` | **delete** (separate marketing site, "Southcenter — Coming Soon") |
| `project_overview.md` | rewrite (also clears the staleness bug) |
| `frontend/src/constants/app.js` | `APP_TAGLINE` "From Warehouse to Store — Seamlessly" → neutral SaaS tagline |
| `database/init/02_seed.sql` | already `@example.com`; just fix phone formats |

Backend `APP_NAME` already defaults to `StockFlow`. No env var is named for southcenter.

---

## 5. Phased execution

Each phase ends with a commit. Phases 0–4 are largely sequential; Phase 5 fans out to one sub-agent
per module; Phase 6 fans out to one sub-agent per feature. **Sub-agents are used for every
implementation phase to keep this chat's context small** — the main session reviews each agent's diff
and commits.

### Phase 0 — Prerequisite fixes & cleanup  *(no tenancy)*
0a. Finish the `divisions` removal (§3.1) — backend, frontend, migration `03_drop_divisions.sql`,
    update `01_schema.sql`.
0b. "South Center" full cleanup (§4), including rewriting `project_overview.md`.
0c. Safe cleanup (§3.3): debug route, `main.jsx` cruft, `FRONTEND_URL`, `dotenv`, `ErrorBoundary`,
    `*` route, `stockLedger` enum.
→ commit. App still single-tenant, but green against its own schema.

### Phase 1 — Disable storefront & customer login
- Backend: `STOREFRONT_ENABLED` env flag (default `false`). When off, return `404` from
  `POST /auth/register`, `POST /auth/otp/send`, `POST /auth/otp/login`,
  `POST /auth/complete-profile`, the public storefront reads (`/products` & `/products/:id` public
  access, `/hero-slides/public`, `/notice/public`, `/settings/social/public`,
  `/settings/branding/public`, `/warehouse/public`), and the customer path of `POST /orders`.
- Frontend: delete the `/store/*` route subtree, `/register`, and the OTP mode of `LoginPage`
  (password/email only) from `app/router.jsx`; drop `StoreShell` / `StoreTopbar` / `StoreNavMenu` /
  `Footer` / `StoreSearchBox` from the router; remove the "View Store" (Topbar) and "Dashboard"
  (StoreTopbar) cross-links. `/` → `/login`. Neutralise `landingPathForRole`.
- Storefront feature folders (`home`, `product-detail`, `division-detail`, `category-detail`, `cart`,
  `checkout`, `my-orders`) and storefront-only shared hooks/components are **left in the repo,
  unmounted** — reversible, matches "on hold". A short `// DISABLED: storefront on hold` note at each
  former mount point.
- Playwright: mark storefront specs `test.skip`.
→ commit.

### Phase 2 — Tenancy schema & seed
- Migrations `04_multitenant_core.sql`, `05_multitenant_business_id.sql`, `06_settings_per_business.sql`
  (§2). Backfill "Default Business". Rewrite `01_schema.sql` + `02_seed.sql`.
- No application code beyond what's needed to boot.
→ commit.

### Phase 3 — Backend auth & tenancy middleware
- `buildAccessTokenPayload(userId)` — assemble `{ sub, isSuperAdmin, memberships }`.
- Update `signAccessToken` call sites (`login`, `refresh`; the disabled register/otp paths too).
- `toSessionUser` → add `memberships`, `isSuperAdmin`.
- `GET /auth/me` → include `memberships` + a `businesses` array `(id, name, slug, role)` for the switcher.
- New `middleware/resolveBusiness.js`, `requireBusinessRole`, `requireSuperAdmin`.
- Multi-tab refresh hardening: `refresh_tokens.replaced_by` + grace window (migration `07_*.sql`).
→ commit.

### Phase 4 — Businesses & membership module  *(super admin)*
- `backend/src/modules/businesses/` (4 files):
  - `GET/POST/PUT/DELETE /api/businesses` (`requireSuperAdmin`). Delete = **deactivate**
    (`is_active=0`); a real cascade wipe stays dev-only.
  - `GET /api/businesses/:id/members`, `POST /api/businesses/:id/members` (add by email — find-or-
    create the `users` row, super admin sets an initial password for a new user, create the
    `memberships` row), `PATCH …/members/:userId` (role), `DELETE …/members/:userId`.
- `users` module → `requireSuperAdmin`, global directory only. (Business-admin-facing member
  management is the `/businesses/:id/members` routes above; a business admin may also call a scoped
  subset — decision for review on whether business admins can add members in Phase 1 or only super
  admin can.)
→ commit.

### Phase 5 — Convert tenant modules to business scope  *(one sub-agent per module)*
Order (respects the cross-module helper dependencies `products → catalog, media, stock`):
`catalog` → `sizes` → `media` → `stock` → `stockLedger` → `products` → `orders` → `dispatches` →
`reports` → `warehouse`/business-settings → `heroSlides` → `notice` → `settings` (social/branding) →
`settings` delete-all-data (now per-business).

Per module, the sub-agent:
1. Router: mount under `/api/b/:businessId/…` (`Router({ mergeParams: true })`),
   chain `authenticate` → `resolveBusiness` → `requireBusinessRole(...)` (replacing `requireRole`).
2. Controller: pass `req.business.id` into every service call.
3. Service: add `businessId` param to every function; `WHERE business_id = ?` on every
   SELECT/UPDATE/DELETE; set `business_id` on every INSERT (including leaf rows); scope every
   uniqueness / dup check; scope number generators.
4. Schema: mostly unchanged.
5. Fix the module's §3.2 bugs while in there.
6. Update `app.js` mounts.
→ commit per module (or per small batch).

### Phase 6 — Frontend tenancy  *(one sub-agent per feature)*
- `store/business.store.js` + `useCurrentBusinessId()` (from route param).
- `app/router.jsx`: `/b/:businessId` layout route wrapping `AppShell`; all back-office routes become
  its children. New flat routes: `/businesses` (picker/landing), `/admin/businesses`, `/admin/users`.
  `/` → `/businesses` when authed else `/login`. `landingPath(user)` — one business → straight to its
  dashboard; multiple / super admin → `/businesses`.
- `ProtectedRoute` → membership-aware (reads `user.memberships` for `:businessId`); `requireSuperAdmin`
  variant for `/admin/*`.
- `lib/axios.js` / every tenant `*.api.js`: `businessId` first arg; every query key prefixed with it.
- `Topbar`: business switcher dropdown; super-admin menu entry.
- `Sidebar`: items now link to `/b/:businessId/…`; gate by `req.membership` role (staff vs admin).
- Sub-agent per feature: `dashboard`, `products`, `stock`, `stock-ledger`, `orders`, `dispatches`,
  `reports`, `catalog`, `sizes`, `media`, `warehouse`, `heroSlides`, `notice`, `settings`, `users`.
→ commit per feature (or per batch).

### Phase 7 — Super-admin frontend
- `features/businesses/` — list / create / edit / deactivate businesses; manage members (assign
  admin, change role, remove).
- `features/admin-users/` (or extend `features/users`) — global user directory.
- The `/businesses` picker page (also the post-login landing).
→ commit.

### Phase 8 — Tests, docs, polish
- Rewrite `CLAUDE.md` for multi-tenancy (roles, `/api/b/:businessId` convention, `businesses` +
  `memberships` modules, middleware, per-business settings) and fix all §3.4 doc bugs.
- Playwright: login → business picker → per-business POM; add super-admin specs; new `.env.test`
  fixtures.
- `deployment_guide.md` final pass.
→ commit.

### Future scope (documented, not built here)
- **Staff granular permissions** — fill `memberships.permissions`, add a `can(permission)` helper +
  `requirePermission` middleware, build the per-staff permission UI. Purely additive — no migration.
- **Storefront re-enable, per business** — `/store/:businessSlug` or per-business subdomain;
  re-wire `notice` / `social_links` / `site_branding` / `hero_slides` / public product reads /
  customer login / cart / checkout to the business in the URL. Flip `STOREFRONT_ENABLED`.
- **Per-business billing / subscription / plan limits.**

---

## 6. Decisions (locked)

1. **Rename `warehouse` module/table → `business_settings`.** ✅ Done in Phase 5 (backend module
   rename, frontend `features/warehouse` → `features/business-settings`, constants, routes).
2. **Media is per-business, never shared.** ✅ `media.business_id NOT NULL`, dedup key
   `(business_id, file_hash)`, `media_usage.business_id`.
3. **Business admins can add members.** ✅ `POST /api/b/:businessId/members` is available to
   `requireBusinessRole('admin')` (business admin) as well as super admin. Super admin also has the
   global `/api/businesses/:id/members` route. Adding a member finds-or-creates the `users` row; the
   acting admin sets an initial password for a brand-new user (communicated out-of-band — no email
   infra; MSG91 is SMS-only).
4. **Per-business numbering restart.** ✅ `ORD-…` / `DSP-…` sequences are scoped per business.
5. **Business "delete" = deactivate** (`is_active=0`). Destructive cascade wipe stays dev-only.
6. **Swagger** — drop the unused `swagger-jsdoc` / `swagger-ui-express` deps and the `CLAUDE.md`
   claim (default; revisit post-migration).
7. **New-user credentials** — acting admin sets an initial password; communicated out-of-band.
8. **Disabled storefront code stays in-repo, unmounted.** ✅ Not deleted.
