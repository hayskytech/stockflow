-- =============================================================================
-- StockFlow Database Schema
-- Engine: MySQL 8.0
-- Charset: utf8mb4 (full Unicode + emoji support)
-- Collation: utf8mb4_unicode_ci (case-insensitive, accent-sensitive)
-- All UUIDs stored as CHAR(36) for human readability
-- No soft deletes, no audit log tables — rows are hard-deleted, created_at/updated_at only.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS stockflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stockflow;

-- -----------------------------------------------------------------------------
-- MIGRATION NOTE (existing databases only):
-- This init script only runs on a fresh database. To add the `customer` role to
-- an already-provisioned DB, run once:
--   ALTER TABLE users MODIFY role ENUM('admin','staff','customer') NOT NULL DEFAULT 'staff';
--
-- To add bank-transfer order placement to an already-provisioned DB, run once:
--   ALTER TABLE warehouse
--     ADD COLUMN bank_name VARCHAR(150) NULL,
--     ADD COLUMN account_holder_name VARCHAR(150) NULL,
--     ADD COLUMN account_number VARCHAR(30) NULL,
--     ADD COLUMN ifsc_code VARCHAR(15) NULL,
--     ADD COLUMN upi_id VARCHAR(100) NULL;
--   ALTER TABLE orders
--     ADD COLUMN payment_method ENUM('bank_transfer') NOT NULL DEFAULT 'bank_transfer',
--     ADD COLUMN transaction_id VARCHAR(100) NOT NULL,
--     ADD COLUMN payment_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
--     ADD COLUMN total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
--     ADD COLUMN shipping_name VARCHAR(100) NOT NULL,
--     ADD COLUMN shipping_phone VARCHAR(20) NOT NULL,
--     ADD COLUMN shipping_address_line1 VARCHAR(200) NOT NULL,
--     ADD COLUMN shipping_address_line2 VARCHAR(200) NULL,
--     ADD COLUMN shipping_city VARCHAR(100) NOT NULL,
--     ADD COLUMN shipping_state VARCHAR(100) NOT NULL,
--     ADD COLUMN shipping_pincode VARCHAR(10) NOT NULL,
--     ADD COLUMN idempotency_key CHAR(36) NULL,
--     ADD UNIQUE KEY uq_orders_idempotency_key (idempotency_key),
--     ADD KEY idx_orders_payment_status (payment_status),
--     ADD KEY idx_orders_transaction_id (transaction_id);
--   ALTER TABLE order_items
--     ADD COLUMN mrp_at_order DECIMAL(10,2) NOT NULL,
--     ADD COLUMN wsp_at_order DECIMAL(10,2) NOT NULL;
-- -----------------------------------------------------------------------------

-- =============================================================================
-- TABLE: users
-- Three roles: admin (full access), staff (operational, no user/warehouse mgmt),
-- and customer (self-registered storefront shopper — browse only, no back-office).
-- =============================================================================
CREATE TABLE users (
  id                    CHAR(36)        NOT NULL                    COMMENT 'UUID v4 primary key',
  name                  VARCHAR(100)    NOT NULL                    COMMENT 'Full display name',
  email                 VARCHAR(150)    NOT NULL                    COMMENT 'Login email',

  password_hash         VARCHAR(255)    NOT NULL                    COMMENT 'bcrypt hash (cost 12)',
  role                  ENUM('admin','staff','customer') NOT NULL DEFAULT 'staff',

  is_active             BOOLEAN         NOT NULL DEFAULT TRUE       COMMENT 'FALSE = account disabled',
  must_change_password  BOOLEAN         NOT NULL DEFAULT FALSE      COMMENT 'Forces password change on next login',
  failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0        COMMENT 'Resets to 0 on successful login',
  locked_until          DATETIME        NULL                        COMMENT 'Account locked until this time after too many failures',

  last_login_at         DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role       (role),
  KEY idx_users_is_active  (is_active)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='System users - admin, staff, or customer';


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

  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash  (token_hash),
  KEY idx_refresh_tokens_user_id     (user_id),
  KEY idx_refresh_tokens_expires_at  (expires_at),
  KEY idx_refresh_tokens_revoked_at  (revoked_at),

  CONSTRAINT fk_refresh_tokens_user_id
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Active refresh token sessions per user';


-- =============================================================================
-- TABLE: warehouse
-- Single-record settings table — there is only ever one warehouse.
-- =============================================================================
CREATE TABLE warehouse (
  id            TINYINT UNSIGNED NOT NULL DEFAULT 1                 COMMENT 'Always 1 - single row',
  name          VARCHAR(150)  NOT NULL,
  address       VARCHAR(500)  NULL,
  phone         VARCHAR(20)   NULL,
  email         VARCHAR(150)  NULL,
  bank_name             VARCHAR(150)  NULL                          COMMENT 'Shown to customers on the checkout page for bank transfer',
  account_holder_name   VARCHAR(150)  NULL,
  account_number        VARCHAR(30)   NULL,
  ifsc_code              VARCHAR(15)   NULL,
  upi_id                VARCHAR(100)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT chk_warehouse_single_row CHECK (id = 1)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Single-row warehouse settings';


-- =============================================================================
-- TABLE: divisions
-- Top-level product lines (Kids Wear, Mens Wear, Ladies Wear...). Admin-managed.
-- =============================================================================
CREATE TABLE divisions (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  name          VARCHAR(100)  NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE                 COMMENT 'FALSE hides it from new-product/order pickers',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_divisions_name    (name),
  KEY idx_divisions_is_active     (is_active)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Top-level product divisions';


-- =============================================================================
-- TABLE: categories
-- Each category belongs to exactly one division. Admin-managed.
-- =============================================================================
CREATE TABLE categories (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  division_id   CHAR(36)      NOT NULL,
  name          VARCHAR(100)  NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_division_name (division_id, name),
  KEY idx_categories_division_id  (division_id),
  KEY idx_categories_is_active    (is_active),

  CONSTRAINT fk_categories_division_id
    FOREIGN KEY (division_id) REFERENCES divisions (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Product categories, each under one division';


-- =============================================================================
-- TABLE: sub_categories
-- Each sub-category belongs to exactly one category. Admin-managed.
-- =============================================================================
CREATE TABLE sub_categories (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  category_id   CHAR(36)      NOT NULL,
  name          VARCHAR(100)  NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_sub_categories_category_name (category_id, name),
  KEY idx_sub_categories_category_id (category_id),
  KEY idx_sub_categories_is_active   (is_active),

  CONSTRAINT fk_sub_categories_category_id
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Product sub-categories, each under one category';


-- =============================================================================
-- TABLE: media
-- Centralized media library (WordPress-style) - every uploaded image is one
-- row here, reused across features by reference. Files live on disk under
-- MEDIA_UPLOAD_DIR, sharded by content hash: <hash[0:2]>/<hash[2:4]>/<hash>.webp
-- Always normalized to WebP + <=500KB server-side, regardless of the original upload.
-- =============================================================================
CREATE TABLE media (
  id              CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  file_hash       CHAR(64)      NOT NULL                              COMMENT 'SHA-256 of the final WebP bytes - dedup key',
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
  UNIQUE KEY uq_media_file_hash   (file_hash),
  KEY idx_media_uploaded_by       (uploaded_by),
  KEY idx_media_created_at        (created_at),

  CONSTRAINT fk_media_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Centralized media library - one row per unique stored file';


-- =============================================================================
-- TABLE: media_usage
-- Tracks which entities reference a media item, so unused media can be found
-- and deleted safely - a media row can only be deleted when it has zero
-- usage rows. Populated/cleared whenever a feature attaches/detaches an image.
-- =============================================================================
CREATE TABLE media_usage (
  id            CHAR(36)      NOT NULL                                COMMENT 'UUID v4 primary key',
  media_id      CHAR(36)      NOT NULL,
  entity_type   VARCHAR(50)   NOT NULL                                COMMENT 'e.g. product',
  entity_id     CHAR(36)      NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_media_usage_ref  (media_id, entity_type, entity_id),
  KEY idx_media_usage_entity     (entity_type, entity_id),

  CONSTRAINT fk_media_usage_media_id
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Join table tracking which entities use which media item';


-- =============================================================================
-- TABLE: products
-- Cloth business product catalog. One row per sellable SKU (colour+size combo).
-- Stock lives directly on the row since there is only ever one warehouse.
-- =============================================================================
CREATE TABLE products (
  id                  CHAR(36)      NOT NULL                        COMMENT 'UUID v4 primary key',
  product_code        VARCHAR(50)   NOT NULL                        COMMENT 'Human-readable SKU code, e.g. MW-SHRT-0042',
  barcode             VARCHAR(50)   NULL                             COMMENT 'Optional - not every SKU is barcoded yet',
  category_id         CHAR(36)      NOT NULL,
  sub_category_id     CHAR(36)      NULL,
  name                VARCHAR(150)  NOT NULL,
  description         VARCHAR(500)  NULL,
  color               VARCHAR(50)   NULL,
  size                VARCHAR(10)   NULL                             COMMENT 'S/M/L/XL or numeric size',
  mrp                 DECIMAL(10,2) NOT NULL DEFAULT 0.00            COMMENT 'Maximum retail price',
  wsp                 DECIMAL(10,2) NOT NULL DEFAULT 0.00            COMMENT 'Wholesale/order price charged to users',
  quantity_available  INT           NOT NULL DEFAULT 0               COMMENT 'Sellable stock on hand right now',
  quantity_reserved   INT           NOT NULL DEFAULT 0               COMMENT 'Held against pending/accepted orders not yet dispatched',
  reorder_level       INT           NOT NULL DEFAULT 0               COMMENT 'Threshold for low-stock warning',
  unit                VARCHAR(20)   NOT NULL DEFAULT 'pc',
  product_photo_url   VARCHAR(500)  NULL                              COMMENT 'Denormalized URL of product_photo_media_id, cached for fast list reads',
  product_photo_media_id CHAR(36)   NULL                              COMMENT 'FK into the shared media library - source of truth for reuse/cleanup',
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_products_product_code (product_code),
  UNIQUE KEY uq_products_barcode      (barcode),
  KEY idx_products_category_id        (category_id),
  KEY idx_products_sub_category_id    (sub_category_id),
  KEY idx_products_is_active          (is_active),
  KEY idx_products_photo_media_id     (product_photo_media_id),

  CONSTRAINT fk_products_category_id
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_products_sub_category_id
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_products_photo_media_id
    FOREIGN KEY (product_photo_media_id) REFERENCES media (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_products_mrp_nonneg         CHECK (mrp >= 0),
  CONSTRAINT chk_products_wsp_nonneg         CHECK (wsp >= 0),
  CONSTRAINT chk_products_wsp_le_mrp         CHECK (wsp <= mrp),
  CONSTRAINT chk_products_qty_available_nonneg CHECK (quantity_available >= 0),
  CONSTRAINT chk_products_qty_reserved_nonneg  CHECK (quantity_reserved >= 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Product catalog';


-- =============================================================================
-- TABLE: orders
-- Placed by any user against the warehouse; accepted/rejected by admin or staff.
-- =============================================================================
CREATE TABLE orders (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  order_number  VARCHAR(30)   NOT NULL                              COMMENT 'Human-readable order code (e.g. ORD-00001)',
  requested_by  CHAR(36)      NOT NULL                              COMMENT 'User who placed the order',
  status        ENUM('pending','accepted','rejected','dispatched','completed','cancelled')
                NOT NULL DEFAULT 'pending',

  payment_method  ENUM('bank_transfer') NOT NULL DEFAULT 'bank_transfer',
  transaction_id  VARCHAR(100)  NOT NULL                            COMMENT 'Bank transfer reference/UTR number entered by the customer',
  payment_status  ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00                COMMENT 'Sum of wsp_at_order * quantity - the amount owed',

  shipping_name           VARCHAR(100)  NOT NULL,
  shipping_phone          VARCHAR(20)   NOT NULL,
  shipping_address_line1  VARCHAR(200)  NOT NULL,
  shipping_address_line2  VARCHAR(200)  NULL,
  shipping_city           VARCHAR(100)  NOT NULL,
  shipping_state          VARCHAR(100)  NOT NULL,
  shipping_pincode        VARCHAR(10)   NOT NULL,

  idempotency_key CHAR(36)      NULL                                COMMENT 'Client-generated UUID for one checkout attempt - dedupes retried submits',

  notes         VARCHAR(500)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_number    (order_number),
  UNIQUE KEY uq_orders_idempotency_key (idempotency_key),
  KEY idx_orders_status          (status),
  KEY idx_orders_requested_by    (requested_by),
  KEY idx_orders_created_at      (created_at),
  KEY idx_orders_payment_status  (payment_status),
  KEY idx_orders_transaction_id  (transaction_id),

  CONSTRAINT fk_orders_requested_by
    FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Orders placed against the warehouse';


-- =============================================================================
-- TABLE: order_items
-- Line items for an order.
-- =============================================================================
CREATE TABLE order_items (
  id          CHAR(36)  NOT NULL                                    COMMENT 'UUID v4 primary key',
  order_id    CHAR(36)  NOT NULL,
  product_id  CHAR(36)  NOT NULL,
  quantity    INT       NOT NULL                                    COMMENT 'Quantity requested',
  mrp_at_order DECIMAL(10,2) NOT NULL                                COMMENT 'Snapshot of products.mrp at order time',
  wsp_at_order DECIMAL(10,2) NOT NULL                                COMMENT 'Snapshot of products.wsp at order time - price never recomputed later',

  PRIMARY KEY (id),
  KEY idx_order_items_order_id   (order_id),
  KEY idx_order_items_product_id (product_id),

  CONSTRAINT fk_order_items_order_id
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product_id
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Line items for an order';


-- =============================================================================
-- TABLE: dispatches
-- Created against an accepted order to record what was actually sent out.
-- =============================================================================
CREATE TABLE dispatches (
  id             CHAR(36)      NOT NULL                             COMMENT 'UUID v4 primary key',
  order_id       CHAR(36)      NOT NULL,
  dispatched_by  CHAR(36)      NOT NULL                             COMMENT 'User who created the dispatch',
  status         ENUM('pending','dispatched') NOT NULL DEFAULT 'pending',
  dispatched_at  DATETIME      NULL,
  notes          VARCHAR(500)  NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_dispatches_order_id      (order_id),
  KEY idx_dispatches_status        (status),
  KEY idx_dispatches_dispatched_by (dispatched_by),

  CONSTRAINT fk_dispatches_order_id
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispatches_dispatched_by
    FOREIGN KEY (dispatched_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Dispatches created against accepted orders';


-- =============================================================================
-- TABLE: dispatch_items
-- Line items for a dispatch — what was actually sent for each product.
-- =============================================================================
CREATE TABLE dispatch_items (
  id            CHAR(36)  NOT NULL                                  COMMENT 'UUID v4 primary key',
  dispatch_id   CHAR(36)  NOT NULL,
  product_id    CHAR(36)  NOT NULL,
  quantity      INT       NOT NULL                                  COMMENT 'Quantity actually dispatched',

  PRIMARY KEY (id),
  KEY idx_dispatch_items_dispatch_id (dispatch_id),
  KEY idx_dispatch_items_product_id  (product_id),

  CONSTRAINT fk_dispatch_items_dispatch_id
    FOREIGN KEY (dispatch_id) REFERENCES dispatches (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_items_product_id
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Line items for a dispatch';


-- =============================================================================
-- TABLE: stock_ledger
-- Append-only record of every stock movement (order fulfilment, dispatch,
-- manual adjustment). Uses BIGINT AUTO_INCREMENT for high-volume insert order.
-- =============================================================================
CREATE TABLE stock_ledger (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT           COMMENT 'Auto-increment for insert order guarantee',
  product_id      CHAR(36)        NOT NULL,
  change_type     ENUM('in','out') NOT NULL                         COMMENT 'Stock coming in or going out',
  quantity        INT             NOT NULL                         COMMENT 'Always positive - direction comes from change_type',
  reference_type  ENUM('order','dispatch','adjustment') NOT NULL,
  reference_id    CHAR(36)        NULL                              COMMENT 'ID of the order/dispatch that caused this movement',
  note            VARCHAR(500)    NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_stock_ledger_product_id  (product_id),
  KEY idx_stock_ledger_reference   (reference_type, reference_id),
  KEY idx_stock_ledger_created_at  (created_at),

  CONSTRAINT fk_stock_ledger_product_id
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Append-only stock movement history';
