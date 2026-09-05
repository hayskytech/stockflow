-- =============================================================================
-- Migration 06: single-row settings tables → per-business
-- Engine: MariaDB 10.4+ / MySQL 8.0.19+ · Charset: utf8mb4 · Collation: utf8mb4_unicode_ci
--
-- `warehouse`, `notice`, `social_links`, `site_branding` were each a single-row
-- table pinned by `CHECK (id = 1)`. Under multi-tenancy each business owns one
-- settings row, so every one of them loses its single-row CHECK and its
-- `id` PK and is re-keyed on `business_id CHAR(36)` PRIMARY KEY + FK CASCADE.
--
-- `warehouse` is also RENAMED to `business_settings` — it now holds currency,
-- phone-format, address, contact and bank-transfer details, none of which are
-- "warehouse" concepts. This migration renames the TABLE only. The backend
-- `warehouse` module and the frontend `features/warehouse` feature are renamed
-- to `business-settings` in Phase 5.
--
-- `notice` / `social_links` / `site_branding` keep their table names.
--
-- The one pre-existing row in each table is backfilled onto the Default Business
-- created in migration 05.
--
-- A fresh install already has all of this via 01_schema.sql — run this only
-- against an already-provisioned DB that predates this migration. Requires 05.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1 — warehouse → business_settings
-- The only named constraint on the table is chk_warehouse_single_row (dropped
-- below); there are no other `warehouse`-named indexes/constraints to rename.
-- -----------------------------------------------------------------------------
RENAME TABLE warehouse TO business_settings;

ALTER TABLE business_settings
  DROP CONSTRAINT chk_warehouse_single_row;

ALTER TABLE business_settings
  ADD COLUMN business_id CHAR(36) NULL AFTER id;

UPDATE business_settings
  SET business_id = 'b0000000-0000-4000-8000-000000000001';

ALTER TABLE business_settings
  DROP PRIMARY KEY,
  DROP COLUMN id,
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD PRIMARY KEY (business_id),
  ADD CONSTRAINT fk_business_settings_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- Section 2 — notice
-- -----------------------------------------------------------------------------
ALTER TABLE notice
  DROP CONSTRAINT chk_notice_single_row;

ALTER TABLE notice
  ADD COLUMN business_id CHAR(36) NULL AFTER id;

UPDATE notice
  SET business_id = 'b0000000-0000-4000-8000-000000000001';

ALTER TABLE notice
  DROP PRIMARY KEY,
  DROP COLUMN id,
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD PRIMARY KEY (business_id),
  ADD CONSTRAINT fk_notice_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- Section 3 — social_links
-- -----------------------------------------------------------------------------
ALTER TABLE social_links
  DROP CONSTRAINT chk_social_links_single_row;

ALTER TABLE social_links
  ADD COLUMN business_id CHAR(36) NULL AFTER id;

UPDATE social_links
  SET business_id = 'b0000000-0000-4000-8000-000000000001';

ALTER TABLE social_links
  DROP PRIMARY KEY,
  DROP COLUMN id,
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD PRIMARY KEY (business_id),
  ADD CONSTRAINT fk_social_links_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- Section 4 — site_branding
-- Its media FKs (fk_site_branding_logo_media_id / _favicon_media_id) and their
-- indexes are unchanged; only the single-row CHECK and the id PK are replaced.
-- -----------------------------------------------------------------------------
ALTER TABLE site_branding
  DROP CONSTRAINT chk_site_branding_single_row;

ALTER TABLE site_branding
  ADD COLUMN business_id CHAR(36) NULL AFTER id;

UPDATE site_branding
  SET business_id = 'b0000000-0000-4000-8000-000000000001';

ALTER TABLE site_branding
  DROP PRIMARY KEY,
  DROP COLUMN id,
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD PRIMARY KEY (business_id),
  ADD CONSTRAINT fk_site_branding_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE;
