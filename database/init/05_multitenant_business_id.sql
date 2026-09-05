-- =============================================================================
-- Migration 05: business_id on every tenant-owned table
-- Engine: MariaDB 10.4+ / MySQL 8.0.19+ · Charset: utf8mb4 · Collation: utf8mb4_unicode_ci
--
-- Adds `business_id CHAR(36) NOT NULL` + FK REFERENCES businesses(id) ON DELETE
-- CASCADE + index to every tenant-owned table, backfills all existing rows onto
-- a single "Default Business", and swaps every global uniqueness key for its
-- per-business equivalent (§2.3 / §2.4 of multitenant_plan.md).
--
-- Leaf tables (order_items, product_gallery_images, media_usage, stock_ledger)
-- get business_id too even though it is derivable from the parent — every tenant
-- query becomes a flat `WHERE business_id = ?` and cross-tenant JOIN leaks
-- become impossible.
--
-- `orders.idempotency_key` stays GLOBALLY unique (it is a client-generated UUID).
--
-- A fresh install already has all of this via 01_schema.sql — run this only
-- against an already-provisioned DB that predates this migration. Requires 04.
--
-- Statement order: the Default Business row is created first, then columns are
-- added nullable, then backfilled, then locked to NOT NULL + FK — so no FK ever
-- references a not-yet-populated column.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1 — the Default Business that every existing row is backfilled onto.
-- Fixed UUID literal, identical to the one used in 02_seed.sql.
-- -----------------------------------------------------------------------------
INSERT INTO businesses (id, name, slug, is_active)
VALUES ('b0000000-0000-4000-8000-000000000001', 'Default Business', 'default', TRUE);


-- -----------------------------------------------------------------------------
-- Section 2 — add business_id, nullable first so existing rows stay valid.
-- -----------------------------------------------------------------------------
ALTER TABLE categories             ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE sub_categories         ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE sizes                  ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE products               ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE product_gallery_images ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE orders                 ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE order_items            ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE stock                  ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE stock_ledger           ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE dispatches             ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE hero_slides            ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE media                  ADD COLUMN business_id CHAR(36) NULL AFTER id;
ALTER TABLE media_usage            ADD COLUMN business_id CHAR(36) NULL AFTER id;


-- -----------------------------------------------------------------------------
-- Section 3 — backfill every existing row onto the Default Business.
-- -----------------------------------------------------------------------------
UPDATE categories             SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE sub_categories         SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE sizes                  SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE products               SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE product_gallery_images SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE orders                 SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE order_items            SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE stock                  SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE stock_ledger           SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE dispatches             SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE hero_slides            SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE media                  SET business_id = 'b0000000-0000-4000-8000-000000000001';
UPDATE media_usage            SET business_id = 'b0000000-0000-4000-8000-000000000001';


-- -----------------------------------------------------------------------------
-- Section 4 — lock business_id to NOT NULL, add FK + index. One table per ALTER.
-- (business_id is fully populated by Section 3, so NOT NULL is safe here.)
-- -----------------------------------------------------------------------------
ALTER TABLE categories
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_categories_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_categories_business_id (business_id);

ALTER TABLE sub_categories
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_sub_categories_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_sub_categories_business_id (business_id);

ALTER TABLE sizes
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_sizes_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_sizes_business_id (business_id);

ALTER TABLE products
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_products_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_products_business_id (business_id);

ALTER TABLE product_gallery_images
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_product_gallery_images_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_product_gallery_images_business_id (business_id);

ALTER TABLE orders
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_orders_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_orders_business_id (business_id);

ALTER TABLE order_items
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_order_items_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_order_items_business_id (business_id);

ALTER TABLE stock
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_stock_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_stock_business_id (business_id);

ALTER TABLE stock_ledger
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_stock_ledger_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_stock_ledger_business_id (business_id);

ALTER TABLE dispatches
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_dispatches_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_dispatches_business_id (business_id);

ALTER TABLE hero_slides
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_hero_slides_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_hero_slides_business_id (business_id);

ALTER TABLE media
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_media_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_media_business_id (business_id);

ALTER TABLE media_usage
  MODIFY COLUMN business_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_media_usage_business_id
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD KEY idx_media_usage_business_id (business_id);


-- -----------------------------------------------------------------------------
-- Section 5 — swap global uniqueness keys for per-business ones (§2.4).
-- Each DROP INDEX names the exact index defined in 01_schema.sql.
-- -----------------------------------------------------------------------------
ALTER TABLE products
  DROP INDEX uq_products_product_code,
  ADD UNIQUE KEY uq_products_business_product_code (business_id, product_code);

ALTER TABLE categories
  DROP INDEX uq_categories_name,
  ADD UNIQUE KEY uq_categories_business_name (business_id, name);

ALTER TABLE sub_categories
  DROP INDEX uq_sub_categories_category_name,
  ADD UNIQUE KEY uq_sub_categories_business_category_name (business_id, category_id, name);

ALTER TABLE sizes
  DROP INDEX uq_sizes_value,
  ADD UNIQUE KEY uq_sizes_business_value (business_id, value);

ALTER TABLE orders
  DROP INDEX uq_orders_order_number,
  ADD UNIQUE KEY uq_orders_business_order_number (business_id, order_number);
-- NOTE: uq_orders_idempotency_key is deliberately left GLOBAL (client UUID).

ALTER TABLE dispatches
  DROP INDEX uq_dispatches_dispatch_number,
  ADD UNIQUE KEY uq_dispatches_business_dispatch_number (business_id, dispatch_number);

ALTER TABLE media
  DROP INDEX uq_media_file_hash,
  ADD UNIQUE KEY uq_media_business_file_hash (business_id, file_hash);

-- media_id currently gets its FK-backing index from uq_media_usage_ref (leftmost
-- prefix). The new composite starts with business_id, so add a standalone media_id
-- index BEFORE dropping the old unique, or the DROP fails (FK needs an index).
ALTER TABLE media_usage
  ADD KEY idx_media_usage_media_id (media_id);
ALTER TABLE media_usage
  DROP INDEX uq_media_usage_ref,
  ADD UNIQUE KEY uq_media_usage_business_ref (business_id, media_id, entity_type, entity_id);


-- -----------------------------------------------------------------------------
-- Section 6 — promote the seed admin to platform super admin.
-- -----------------------------------------------------------------------------
UPDATE users SET is_super_admin = 1
WHERE id = 'a0000000-0000-4000-8000-000000000001';


-- -----------------------------------------------------------------------------
-- Section 7 — seed memberships for the Default Business.
-- Seed admin (…0001) → admin, seed staff (…0002) → staff.
-- The seed customer (…0003) gets NO membership (customers are dormant).
-- Fixed UUID literals, consistent with 02_seed.sql.
-- -----------------------------------------------------------------------------
INSERT INTO memberships (id, user_id, business_id, role) VALUES
  ('d1000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'admin'),
  ('d1000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000001', 'staff');
