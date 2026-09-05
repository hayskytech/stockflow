-- =============================================================================
-- Migration 04: Multi-tenant core — businesses, memberships, users.is_super_admin
-- Engine: MariaDB 10.4+ / MySQL 8.0.19+ · Charset: utf8mb4 · Collation: utf8mb4_unicode_ci
--
-- StockFlow becomes a multi-tenant SaaS: many independent businesses, each with
-- its own catalog, stock, orders, dispatches, reports and settings, with no data
-- sharing between them. A user is ONE global `users` row; `memberships` is the
-- join that says which businesses that user belongs to and in what role.
-- `is_super_admin` is a platform-level flag, orthogonal to memberships.
--
-- A fresh install already has all of this via 01_schema.sql — run this only
-- against an already-provisioned DB that predates this migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1 — businesses: one row per independent tenant.
-- -----------------------------------------------------------------------------
CREATE TABLE businesses (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  name          VARCHAR(150)  NOT NULL                              COMMENT 'Display name shown in the business switcher',
  slug          VARCHAR(64)   NOT NULL                              COMMENT 'URL-safe identifier shown in the switcher / used in links',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE                 COMMENT 'FALSE = business deactivated (soft delete); a hard cascade wipe stays dev-only',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_businesses_slug (slug)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Independent tenant businesses';


-- -----------------------------------------------------------------------------
-- Step 2 — memberships: which user belongs to which business, and in what role.
-- "Admin of business A + staff of business B" = two rows for one user_id.
-- `permissions` JSON is future staff-granularity scope (NULL = role default).
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- Step 3 — users.is_super_admin: platform-level flag, orthogonal to memberships.
-- A super admin can additionally be a normal member of specific businesses.
-- -----------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE AFTER role;
