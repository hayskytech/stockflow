-- =============================================================================
-- StockFlow Database Schema
-- Engine: MariaDB 10.4+ / MySQL 8.0.19+ (cPanel hosting ships MariaDB)
-- Charset: utf8mb4 (full Unicode + emoji support)
-- Collation: utf8mb4_unicode_ci (case-insensitive, accent-sensitive)
-- All UUIDs stored as CHAR(36) for human readability
-- No soft deletes, no audit log tables — rows are hard-deleted, created_at/updated_at only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- This init script only runs on a fresh database and always reflects current
-- head — every table below already includes every column/constraint added
-- since the project started. Migrations 03–06 have been folded in here:
--   03_drop_divisions.sql          — divisions removed, categories are top-level
--   04_multitenant_core.sql        — businesses, memberships, users.is_super_admin
--   05_multitenant_business_id.sql  — business_id on every tenant-owned table
--   06_settings_per_business.sql    — warehouse→business_settings + per-business
--                                     settings rows
--   07_refresh_token_replaced_by.sql — refresh_tokens.replaced_by (multi-tab
--                                     refresh grace window)
-- A fresh install of 01 + 02 ends up identical to running the old 01 + 02 then
-- 03 + 04 + 05 + 06 + 07 in order. An already-provisioned (older) DB catches up by
-- running the numbered migration files in this directory in order, not by
-- re-reading this file. The next schema change starts at 08_<description>.sql.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- TABLE: users
-- One GLOBAL row per person. Back-office access to a business comes exclusively
-- from a `memberships` row (below), never from the `role` column. `role` is kept
-- as-is because it still classifies dormant `customer` rows; it is ignored for
-- back-office authorization.
--
-- is_super_admin is a platform-level flag, orthogonal to memberships: a super
-- admin manages businesses and the global user directory, and may additionally
-- be a normal member of specific businesses.
--
-- name/email/password_hash are all nullable because OTP login (dormant this
-- phase) creates the account for any phone number that verifies a code: such a
-- row starts with nothing but a verified phone.
-- =============================================================================
CREATE TABLE users (
  id                    CHAR(36)        NOT NULL                    COMMENT 'UUID v4 primary key',
  name                  VARCHAR(100)    NULL                        COMMENT 'Full display name — NULL until an OTP-created customer completes their profile',
  email                 VARCHAR(150)    NULL                        COMMENT 'Login email — globally unique; NULL until an OTP-created customer completes their profile',

  password_hash         VARCHAR(255)    NULL                        COMMENT 'bcrypt hash (cost 12) — NULL on an OTP-only account with no password set',
  role                  ENUM('admin','staff','customer') NOT NULL DEFAULT 'staff' COMMENT 'Legacy classification; kept for dormant customer rows, ignored for back-office authz',
  is_super_admin        BOOLEAN         NOT NULL DEFAULT FALSE       COMMENT 'Platform-level flag: manages businesses + global user directory; orthogonal to memberships',

  phone                 VARCHAR(15)     NULL                        COMMENT 'Customer phone number (self-registration, mandatory + unique for customers)',
  business_name         VARCHAR(150)    NULL                        COMMENT 'Customer business/shop name (self-registration, optional)',
  address               VARCHAR(255)    NULL                        COMMENT 'Customer shipping address (self-registration)',
  town                  VARCHAR(100)    NULL,
  district              VARCHAR(100)    NULL,
  state                 VARCHAR(100)    NULL,
  pincode               VARCHAR(10)     NULL,
  profile_completed_at  DATETIME        NULL                        COMMENT 'NULL = created by OTP login and still missing its profile',

  is_active             BOOLEAN         NOT NULL DEFAULT TRUE       COMMENT 'FALSE = account disabled (also used as the customer soft-delete flag)',
  failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0        COMMENT 'Resets to 0 on successful login',
  locked_until          DATETIME        NULL                        COMMENT 'Account locked until this time after too many failures',

  last_login_at         DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_role       (role),
  KEY idx_users_is_active  (is_active)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='System users - one global row per person';


-- =============================================================================
-- TABLE: businesses
-- One row per independent tenant. Each business has its own catalog, stock,
-- orders, dispatches, reports and settings, with no data sharing between them.
-- "Delete" is deactivation (is_active = FALSE); a hard cascade wipe stays dev-only.
-- =============================================================================
CREATE TABLE businesses (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  name          VARCHAR(150)  NOT NULL                              COMMENT 'Display name shown in the business switcher',
  slug          VARCHAR(64)   NOT NULL                              COMMENT 'URL-safe identifier shown in the switcher / used in links',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE                 COMMENT 'FALSE = business deactivated (soft delete)',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_businesses_slug (slug)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Independent tenant businesses';


-- =============================================================================
-- TABLE: memberships
-- The user-to-business join: which user belongs to which business, in what role.
-- "Admin of business A + staff of business B" = two rows for one user_id.
-- `permissions` JSON is future staff-granularity scope (NULL = role default).
-- =============================================================================
CREATE TABLE memberships (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  user_id       CHAR(36)      NOT NULL,
  business_id   CHAR(36)      NOT NULL,
  role          ENUM('admin','staff') NOT NULL                     COMMENT 'Back-office role within this business',
  permissions   JSON          NULL                                  COMMENT 'Future staff-permission granularity; NULL = role default',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_memberships_user_business (user_id, business_id),
  KEY idx_memberships_business (business_id),

  CONSTRAINT fk_memberships_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_memberships_business
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User-to-business membership with back-office role';


-- =============================================================================
-- TABLE: refresh_tokens
-- Stores hashed refresh tokens for each active session. Raw token is never stored.
-- =============================================================================
CREATE TABLE refresh_tokens (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  user_id       CHAR(36)      NOT NULL                              COMMENT 'Owning user',
  token_hash    VARCHAR(255)  NOT NULL                              COMMENT 'SHA-256 hash of the raw refresh token',
  device_info   VARCHAR(500)  NULL                                  COMMENT 'User-Agent string for session identification',
  ip_address    VARCHAR(45)   NULL                                  COMMENT 'IP at time of issue (IPv6 max = 45 chars)',
  expires_at    DATETIME      NOT NULL                              COMMENT 'Hard expiry - token is invalid after this',
  last_used_at  DATETIME      NULL                                  COMMENT 'Touched on every /auth/refresh',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at    DATETIME      NULL                                  COMMENT 'Set on logout or token rotation - NULL means active',
  replaced_by   CHAR(36)      NULL                                  COMMENT 'Successor refresh_tokens.id set on rotation - drives the multi-tab refresh grace window',

  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash  (token_hash),
  KEY idx_refresh_tokens_user_id     (user_id),
  KEY idx_refresh_tokens_expires_at  (expires_at),
  KEY idx_refresh_tokens_revoked_at  (revoked_at),
  KEY idx_refresh_tokens_replaced_by (replaced_by),

  CONSTRAINT fk_refresh_tokens_user_id
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Active refresh token sessions per user';


-- =============================================================================
-- TABLE: otp_requests
-- One row per code MSG91 was asked to send. The code itself is NEVER stored — MSG91 generates,
-- delivers, expires and rate-limits it, and is the only party that can verify it. What is stored
-- is the binding between MSG91's `reqId` and the phone it was issued for: the client only ever
-- sends a phone, and verification resolves the `reqId` from this table, so no request can verify
-- a code for one number and claim another.
-- =============================================================================
CREATE TABLE otp_requests (
  id              CHAR(36)      NOT NULL                            COMMENT 'UUID v4 primary key',
  phone           VARCHAR(15)   NOT NULL                            COMMENT 'Local phone digits as typed, without country code',
  provider_req_id VARCHAR(64)   NOT NULL                            COMMENT 'MSG91 widget reqId — never the code itself',
  purpose         ENUM('login','register') NOT NULL                 COMMENT 'A login code can never be spent on a registration, or vice versa',
  ip_address      VARCHAR(45)   NULL                                COMMENT 'IP that requested the code (IPv6 max = 45 chars)',
  expires_at      DATETIME      NOT NULL                            COMMENT 'Defensive local ceiling — MSG91 owns the real expiry',
  consumed_at     DATETIME      NULL                                COMMENT 'Set once the code has been successfully spent — NULL means still open',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_otp_requests_lookup     (phone, purpose, created_at),
  KEY idx_otp_requests_expires_at (expires_at)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='MSG91 OTP request bindings — phone to provider reqId';


-- =============================================================================
-- TABLE: business_settings   (was: warehouse)
-- Per-business settings: currency symbol/decimals, phone country code/length,
-- address, contact, bank-transfer details. One row per business, keyed by
-- business_id. Renamed from `warehouse` in migration 06 — none of these are
-- warehouse concepts. The backend module + frontend feature are renamed to
-- `business-settings` in Phase 5.
-- =============================================================================
CREATE TABLE business_settings (
  business_id   CHAR(36)      NOT NULL                              COMMENT 'Owning business — one settings row per business',
  name          VARCHAR(150)  NOT NULL,
  address       VARCHAR(500)  NULL,
  phone         VARCHAR(20)   NULL,
  email         VARCHAR(150)  NULL,
  bank_name             VARCHAR(150)  NULL                          COMMENT 'Shown to customers on the checkout page for bank transfer',
  account_holder_name   VARCHAR(150)  NULL,
  account_number        VARCHAR(30)   NULL,
  ifsc_code              VARCHAR(15)   NULL,
  upi_id                VARCHAR(100)  NULL,
  phone_country_code    VARCHAR(4)    NOT NULL DEFAULT '+91'         COMMENT 'Prefix shown/enforced on all phone number inputs for this business',
  phone_number_length   TINYINT UNSIGNED NOT NULL DEFAULT 10        COMMENT 'Required digit count for all phone number inputs for this business',
  currency_symbol       VARCHAR(5)    NOT NULL DEFAULT '₹'           COMMENT 'Shown before every money amount for this business',
  currency_decimal_digits TINYINT UNSIGNED NOT NULL DEFAULT 2       COMMENT 'Decimal places shown for every money amount for this business',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (business_id),

  CONSTRAINT fk_business_settings_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-business settings (currency, phone format, address, contact, bank details)';


-- =============================================================================
-- TABLE: notice
-- Per-business admin-editable storefront notice board (one row per business).
-- Storefront-only — schema is tenant-ready now, code is wired for tenancy when
-- the storefront is re-enabled.
-- =============================================================================
CREATE TABLE notice (
  business_id CHAR(36)      NOT NULL                              COMMENT 'Owning business — one notice row per business',
  message     VARCHAR(500)  NULL                                  COMMENT 'Scrolling notice text shown on the storefront when active',
  is_active   BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (business_id),

  CONSTRAINT fk_notice_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-business admin-editable storefront notice board';


-- =============================================================================
-- TABLE: social_links
-- Per-business admin-editable storefront social media links (one row per business).
-- =============================================================================
CREATE TABLE social_links (
  business_id     CHAR(36)      NOT NULL                              COMMENT 'Owning business — one links row per business',
  facebook_url    VARCHAR(255)  NULL,
  instagram_url   VARCHAR(255)  NULL,
  youtube_url     VARCHAR(255)  NULL,
  whatsapp_url    VARCHAR(255)  NULL                                  COMMENT 'WhatsApp channel link, not a phone number',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (business_id),

  CONSTRAINT fk_social_links_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-business admin-editable storefront social media links';


-- =============================================================================
-- TABLE: categories
-- Top-level of the product tree — there are no divisions above it. Per-business.
-- Category names are unique within a business (uq_categories_business_name).
-- =============================================================================
CREATE TABLE categories (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  business_id   CHAR(36)      NOT NULL                              COMMENT 'Owning business',
  name          VARCHAR(100)  NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order    INT           NOT NULL DEFAULT 0                    COMMENT 'Manual drag-and-drop display order',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_business_name (business_id, name),
  KEY idx_categories_business_id  (business_id),
  KEY idx_categories_is_active    (is_active),
  KEY idx_categories_sort_order   (sort_order),

  CONSTRAINT fk_categories_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Top-level product categories, per business';


-- =============================================================================
-- TABLE: sub_categories
-- Each sub-category belongs to exactly one category — this is the deepest the
-- product tree goes (category -> sub_category, no further nesting). Per-business.
-- =============================================================================
CREATE TABLE sub_categories (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  business_id   CHAR(36)      NOT NULL                              COMMENT 'Owning business (denormalized from the parent category)',
  category_id   CHAR(36)      NOT NULL,
  name          VARCHAR(100)  NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order    INT           NOT NULL DEFAULT 0                    COMMENT 'Manual drag-and-drop display order within its category',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_sub_categories_business_category_name (business_id, category_id, name),
  KEY idx_sub_categories_business_id (business_id),
  KEY idx_sub_categories_category_id (category_id),
  KEY idx_sub_categories_is_active   (is_active),
  KEY idx_sub_categories_sort_order  (sort_order),

  CONSTRAINT fk_sub_categories_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sub_categories_category_id
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Product sub-categories, each under one category, per business';


-- =============================================================================
-- TABLE: sizes
-- Admin-managed predefined size list (e.g. S/M/L/XL, or numeric 28/30/32...).
-- products.size and stock.size store this value directly as plain text, not a
-- foreign key reference. Per-business — size values are unique within a business.
-- =============================================================================
CREATE TABLE sizes (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  business_id   CHAR(36)      NOT NULL                              COMMENT 'Owning business',
  value         VARCHAR(20)   NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order    INT           NOT NULL DEFAULT 0                    COMMENT 'Manual drag-and-drop display order',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_sizes_business_value (business_id, value),
  KEY idx_sizes_business_id (business_id),
  KEY idx_sizes_is_active  (is_active),
  KEY idx_sizes_sort_order (sort_order),

  CONSTRAINT fk_sizes_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Predefined size picklist for the product/stock size dropdowns, per business';


-- =============================================================================
-- TABLE: media
-- Centralized media library (WordPress-style) - every uploaded image is one
-- row here, reused across features by reference. Files live on disk under
-- MEDIA_UPLOAD_DIR, sharded by content hash: <hash[0:2]>/<hash[2:4]>/<hash>.webp
-- Always normalized to WebP + <=500KB server-side, regardless of the original upload.
-- Media is per-business, never shared: dedup key is (business_id, file_hash).
-- =============================================================================
CREATE TABLE media (
  id              CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  business_id     CHAR(36)      NOT NULL                              COMMENT 'Owning business — media is never shared between businesses',
  file_hash       CHAR(64)      NOT NULL                              COMMENT 'SHA-256 of the final WebP bytes - per-business dedup key',
  original_name   VARCHAR(255)  NULL                                  COMMENT 'Client-supplied filename, display only - never used as a path',
  storage_path    VARCHAR(255)  NOT NULL                              COMMENT 'Relative path under MEDIA_UPLOAD_DIR, e.g. ab/cd/<hash>.webp',
  mime_type       VARCHAR(50)   NOT NULL DEFAULT 'image/webp',
  size_bytes      INT UNSIGNED  NOT NULL                              COMMENT 'Final file size after compression',
  width           SMALLINT UNSIGNED NULL,
  height          SMALLINT UNSIGNED NULL,
  uploaded_by     CHAR(36)      NOT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_media_business_file_hash (business_id, file_hash),
  KEY idx_media_business_id       (business_id),
  KEY idx_media_uploaded_by       (uploaded_by),
  KEY idx_media_created_at        (created_at),

  CONSTRAINT fk_media_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_media_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Centralized media library - one row per unique stored file, per business';


-- =============================================================================
-- TABLE: media_usage
-- Tracks which entities reference a media item, so unused media can be found
-- and deleted safely - a media row can only be deleted when it has zero
-- usage rows. Populated/cleared whenever a feature attaches/detaches an image.
-- business_id is denormalized from the media row for flat tenant filtering.
-- =============================================================================
CREATE TABLE media_usage (
  id            CHAR(36)      NOT NULL                                COMMENT 'UUID v4 primary key',
  business_id   CHAR(36)      NOT NULL                                COMMENT 'Owning business (denormalized from the media row)',
  media_id      CHAR(36)      NOT NULL,
  entity_type   VARCHAR(50)   NOT NULL                                COMMENT 'e.g. product',
  entity_id     CHAR(36)      NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_media_usage_business_ref (business_id, media_id, entity_type, entity_id),
  KEY idx_media_usage_business_id (business_id),
  KEY idx_media_usage_media_id    (media_id),
  KEY idx_media_usage_entity      (entity_type, entity_id),

  CONSTRAINT fk_media_usage_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_media_usage_media_id
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Join table tracking which entities use which media item';


-- =============================================================================
-- TABLE: products
-- Cloth business product catalog. One row per sellable SKU (colour+size combo).
-- Stock lives directly on the row. Per-business — product_code is unique within
-- a business (uq_products_business_product_code).
-- =============================================================================
CREATE TABLE products (
  id                  CHAR(36)      NOT NULL                        COMMENT 'UUID v4 primary key',
  business_id         CHAR(36)      NOT NULL                        COMMENT 'Owning business',
  product_code        VARCHAR(50)   NOT NULL                        COMMENT 'Human-readable SKU code, e.g. MW-SHRT-0042',
  category_id         CHAR(36)      NOT NULL,
  sub_category_id     CHAR(36)      NULL,
  name                VARCHAR(150)  NOT NULL,
  description         VARCHAR(500)  NULL,
  color               VARCHAR(50)   NULL,
  size                VARCHAR(20)   NULL                             COMMENT 'S/M/L/XL or numeric size — picked from the sizes table, stored as plain text',
  pieces_per_set      TINYINT UNSIGNED NOT NULL DEFAULT 1            COMMENT 'Physical pieces in one sellable unit — e.g. 3 for a "set of 3" shirt. 1 = sold as a single item',
  price               DECIMAL(10,2) NOT NULL DEFAULT 0.00            COMMENT 'Listed price shown to customers',
  discount_percent    DECIMAL(5,2)  NOT NULL DEFAULT 0.00            COMMENT 'Percentage off price — what the customer pays is price * (1 - discount_percent/100)',
  quantity_available  INT           NOT NULL DEFAULT 0               COMMENT 'Sellable stock on hand right now',
  quantity_reserved   INT           NOT NULL DEFAULT 0               COMMENT 'Held against pending/accepted orders not yet dispatched',
  reorder_level       INT           NOT NULL DEFAULT 0               COMMENT 'Threshold for low-stock warning',
  product_photo_url   VARCHAR(500)  NULL                              COMMENT 'Denormalized URL of product_photo_media_id, cached for fast list reads',
  product_photo_media_id CHAR(36)   NULL                              COMMENT 'FK into the shared media library - source of truth for reuse/cleanup',
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_products_business_product_code (business_id, product_code),
  KEY idx_products_business_id        (business_id),
  KEY idx_products_category_id        (category_id),
  KEY idx_products_sub_category_id    (sub_category_id),
  KEY idx_products_is_active          (is_active),
  KEY idx_products_photo_media_id     (product_photo_media_id),

  CONSTRAINT fk_products_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_products_category_id
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_products_sub_category_id
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_products_photo_media_id
    FOREIGN KEY (product_photo_media_id) REFERENCES media (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_products_price_nonneg       CHECK (price >= 0),
  CONSTRAINT chk_products_discount_percent_range CHECK (discount_percent >= 0 AND discount_percent <= 100),
  CONSTRAINT chk_products_qty_available_nonneg CHECK (quantity_available >= 0),
  CONSTRAINT chk_products_qty_reserved_nonneg  CHECK (quantity_reserved >= 0),
  CONSTRAINT chk_products_pieces_per_set_pos   CHECK (pieces_per_set >= 1)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Product catalog, per business';


-- =============================================================================
-- TABLE: product_gallery_images
-- Up to 5 extra photos per product, in addition to the single featured photo on
-- products.product_photo_media_id. Enforced in the service layer, not here.
-- business_id is denormalized from the parent product for flat tenant filtering.
-- =============================================================================
CREATE TABLE product_gallery_images (
  id            CHAR(36)      NOT NULL                        COMMENT 'UUID v4 primary key',
  business_id   CHAR(36)      NOT NULL                        COMMENT 'Owning business (denormalized from the parent product)',
  product_id    CHAR(36)      NOT NULL,
  media_id      CHAR(36)      NOT NULL                        COMMENT 'FK into the shared media library',
  media_url     VARCHAR(500)  NOT NULL                        COMMENT 'Denormalized URL of media_id, cached for fast reads',
  sort_order    TINYINT UNSIGNED NOT NULL DEFAULT 0            COMMENT 'Display order within the product gallery',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_product_gallery_product_media (product_id, media_id),
  KEY idx_product_gallery_images_business_id  (business_id),
  KEY idx_product_gallery_product             (product_id, sort_order),
  KEY idx_product_gallery_images_media_id     (media_id),

  CONSTRAINT fk_product_gallery_images_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_product_gallery_product_id
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_product_gallery_media_id
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Up to 5 gallery images per product';


-- =============================================================================
-- TABLE: hero_slides
-- Homepage hero slider (16:9 images), admin-managed via the shared media library.
-- link_url is optional - a slide can be a plain image or click through somewhere.
-- Per-business (storefront-only; schema tenant-ready now, code wired later).
-- =============================================================================
CREATE TABLE hero_slides (
  id            CHAR(36)      NOT NULL                        COMMENT 'UUID v4 primary key',
  business_id   CHAR(36)      NOT NULL                        COMMENT 'Owning business',
  media_id      CHAR(36)      NOT NULL                        COMMENT 'FK into the shared media library',
  media_url     VARCHAR(500)  NOT NULL                        COMMENT 'Denormalized URL of media_id, cached for fast reads',
  link_url      VARCHAR(500)  NULL                            COMMENT 'Optional click-through URL when the slide is clicked',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE            COMMENT 'FALSE hides it from the storefront without deleting it',
  sort_order    INT           NOT NULL DEFAULT 0               COMMENT 'Manual drag-and-drop display order',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_hero_slides_business_id (business_id),
  KEY idx_hero_slides_media_id    (media_id),
  KEY idx_hero_slides_is_active   (is_active),
  KEY idx_hero_slides_sort_order  (sort_order),

  CONSTRAINT fk_hero_slides_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_hero_slides_media_id
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Homepage hero slider slides, per business';


-- =============================================================================
-- TABLE: site_branding
-- Per-business admin-editable logo + favicon, managed via the shared media
-- library. One row per business, keyed by business_id.
-- =============================================================================
CREATE TABLE site_branding (
  business_id       CHAR(36)      NOT NULL                              COMMENT 'Owning business — one branding row per business',
  logo_media_id     CHAR(36)      NULL                                  COMMENT 'FK into the shared media library',
  logo_url          VARCHAR(500)  NULL                                  COMMENT 'Denormalized URL of logo_media_id, cached for fast reads',
  favicon_media_id  CHAR(36)      NULL                                  COMMENT 'FK into the shared media library',
  favicon_url       VARCHAR(500)  NULL                                  COMMENT 'Denormalized URL of favicon_media_id, cached for fast reads',
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (business_id),
  KEY idx_site_branding_logo_media_id     (logo_media_id),
  KEY idx_site_branding_favicon_media_id  (favicon_media_id),

  CONSTRAINT fk_site_branding_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_site_branding_logo_media_id
    FOREIGN KEY (logo_media_id) REFERENCES media (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_site_branding_favicon_media_id
    FOREIGN KEY (favicon_media_id) REFERENCES media (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-business admin-editable storefront logo + favicon';


-- =============================================================================
-- TABLE: orders
-- Placed by any user against a business; accepted/rejected by that business's
-- admin or staff. Per-business — order_number restarts per business
-- (uq_orders_business_order_number). idempotency_key stays GLOBALLY unique
-- (it is a client-generated UUID).
-- =============================================================================
CREATE TABLE orders (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  business_id   CHAR(36)      NOT NULL                              COMMENT 'Owning business',
  order_number  VARCHAR(30)   NOT NULL                              COMMENT 'Human-readable order code, unique per business (e.g. ORD-20260706-00001)',
  requested_by  CHAR(36)      NOT NULL                              COMMENT 'User who placed the order',
  status        ENUM('pending','accepted','rejected','dispatched','completed','cancelled')
                NOT NULL DEFAULT 'pending',
  is_backorder  BOOLEAN       NOT NULL DEFAULT FALSE            COMMENT 'At least one line was accepted against insufficient stock at order time',

  payment_method  ENUM('bank_transfer','offline') NOT NULL DEFAULT 'bank_transfer' COMMENT 'offline = manual order entered by admin/staff, payment settled outside the app',
  transaction_id  VARCHAR(100)  NULL                                COMMENT 'Bank transfer reference/UTR number entered by the customer - NULL for offline orders',
  payment_status  ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00                COMMENT 'Sum of (price_at_order * (1 - discount_percent_at_order/100)) * quantity - the amount owed',

  shipping_name           VARCHAR(100)  NOT NULL,
  shipping_phone          VARCHAR(20)   NOT NULL,
  shipping_address_line1  VARCHAR(200)  NOT NULL,
  shipping_address_line2  VARCHAR(200)  NULL,
  shipping_city           VARCHAR(100)  NOT NULL,
  shipping_state          VARCHAR(100)  NOT NULL,
  shipping_pincode        VARCHAR(10)   NOT NULL,

  idempotency_key CHAR(36)      NULL                                COMMENT 'Client-generated UUID for one checkout attempt - dedupes retried submits (global)',

  notes         VARCHAR(500)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_business_order_number (business_id, order_number),
  UNIQUE KEY uq_orders_idempotency_key       (idempotency_key),
  KEY idx_orders_business_id     (business_id),
  KEY idx_orders_status          (status),
  KEY idx_orders_is_backorder    (is_backorder),
  KEY idx_orders_requested_by    (requested_by),
  KEY idx_orders_created_at      (created_at),
  KEY idx_orders_payment_status  (payment_status),
  KEY idx_orders_transaction_id  (transaction_id),

  CONSTRAINT fk_orders_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_orders_requested_by
    FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Orders placed against a business';


-- =============================================================================
-- TABLE: order_items
-- Line items for an order. business_id is denormalized from the parent order
-- for flat tenant filtering / JOIN-leak safety.
-- =============================================================================
CREATE TABLE order_items (
  id          CHAR(36)  NOT NULL                                    COMMENT 'UUID v4 primary key',
  business_id CHAR(36)  NOT NULL                                    COMMENT 'Owning business (denormalized from the parent order)',
  order_id    CHAR(36)  NOT NULL,
  product_id  CHAR(36)  NOT NULL,
  quantity    INT       NOT NULL                                    COMMENT 'Quantity requested',
  price_at_order            DECIMAL(10,2) NOT NULL DEFAULT 0.00      COMMENT 'Snapshot of products.price at order time',
  discount_percent_at_order DECIMAL(5,2)  NOT NULL DEFAULT 0.00      COMMENT 'Snapshot of products.discount_percent at order time - price never recomputed later',
  pieces_per_set_at_order   TINYINT UNSIGNED NOT NULL DEFAULT 1      COMMENT 'Snapshot of products.pieces_per_set at order time',

  PRIMARY KEY (id),
  KEY idx_order_items_business_id (business_id),
  KEY idx_order_items_order_id   (order_id),
  KEY idx_order_items_product_id (product_id),

  CONSTRAINT fk_order_items_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_order_id
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product_id
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Line items for an order';


-- =============================================================================
-- TABLE: stock
-- One row per stock intake batch (e.g. one line of a supplier invoice), not per
-- physical unit - quantity-based tracking, no barcodes. price/discount_percent/size
-- are captured per batch. products.quantity_available/quantity_reserved are the
-- source of truth for stock on hand; this table is the receipt/batch ledger.
-- Per-business.
-- =============================================================================
CREATE TABLE stock (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  business_id   CHAR(36)      NOT NULL                              COMMENT 'Owning business',
  product_id    CHAR(36)      NOT NULL,
  quantity      INT           NOT NULL                              COMMENT 'Units received in this batch',
  price             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_percent  DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  size          VARCHAR(20)   NULL,
  invoice_no    VARCHAR(100)  NOT NULL                              COMMENT 'Supplier invoice this batch arrived on',
  invoice_date  DATE          NULL,
  note          VARCHAR(500)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_stock_business_id      (business_id),
  KEY idx_stock_product_id       (product_id),
  KEY idx_stock_invoice_no       (invoice_no),
  KEY idx_stock_created_at       (created_at),

  CONSTRAINT fk_stock_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_stock_product_id
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_stock_quantity_pos CHECK (quantity > 0),
  CONSTRAINT chk_stock_price_nonneg CHECK (price >= 0),
  CONSTRAINT chk_stock_discount_percent_range CHECK (discount_percent >= 0 AND discount_percent <= 100)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per stock intake batch, per business';


-- =============================================================================
-- TABLE: stock_ledger
-- Append-only record of every stock movement (order reserve/release/dispatch,
-- manual adjustment). Uses BIGINT AUTO_INCREMENT for high-volume insert order.
-- Per-business.
-- =============================================================================
CREATE TABLE stock_ledger (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT           COMMENT 'Auto-increment for insert order guarantee',
  business_id     CHAR(36)        NOT NULL                          COMMENT 'Owning business',
  product_id      CHAR(36)        NOT NULL,
  change_type     ENUM('in','out') NOT NULL                         COMMENT 'Stock coming in or going out',
  quantity        INT             NOT NULL                         COMMENT 'Always positive - direction comes from change_type',
  reference_type  ENUM('order','adjustment','import','dispatch') NOT NULL,
  reference_id    CHAR(36)        NULL                              COMMENT 'ID of the order that caused this movement (NULL for imports/adjustments)',
  note            VARCHAR(500)    NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_stock_ledger_business_id (business_id),
  KEY idx_stock_ledger_product_id  (product_id),
  KEY idx_stock_ledger_reference   (reference_type, reference_id),
  KEY idx_stock_ledger_created_at  (created_at),

  CONSTRAINT fk_stock_ledger_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_stock_ledger_product_id
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Append-only stock movement history, per business';


-- =============================================================================
-- TABLE: dispatches
-- One row per dispatch event — the moment an order's reserved quantity physically
-- left the warehouse. The order's status flip to 'dispatched' happens in the same
-- transaction that creates this row. Per-business — dispatch_number restarts per
-- business (uq_dispatches_business_dispatch_number).
-- =============================================================================
CREATE TABLE dispatches (
  id               CHAR(36)     NOT NULL                             COMMENT 'UUID v4 primary key',
  business_id      CHAR(36)     NOT NULL                             COMMENT 'Owning business',
  dispatch_number  VARCHAR(30)  NOT NULL                             COMMENT 'Human-readable dispatch code, unique per business (e.g. DSP-20260706-A1B2C)',
  order_id         CHAR(36)     NOT NULL                             COMMENT 'Order this dispatch fulfils (full-order dispatch, one per order)',
  dispatched_by    CHAR(36)     NOT NULL                             COMMENT 'Admin/staff user who performed the dispatch',
  courier_name     VARCHAR(100) NULL,
  awb_number       VARCHAR(100) NULL                                 COMMENT 'Courier tracking / airway bill number',
  note             VARCHAR(500) NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_dispatches_business_dispatch_number (business_id, dispatch_number),
  UNIQUE KEY uq_dispatches_order_id        (order_id),
  KEY idx_dispatches_business_id           (business_id),
  KEY idx_dispatches_created_at            (created_at),
  KEY idx_dispatches_dispatched_by         (dispatched_by),

  CONSTRAINT fk_dispatches_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatches_order_id
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatches_dispatched_by
    FOREIGN KEY (dispatched_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per dispatch event against an order';
