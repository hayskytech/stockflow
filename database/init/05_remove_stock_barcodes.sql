-- =============================================================================
-- Migration: remove per-unit barcode tracking, move to quantity-based stock
-- A fresh install already has this via 01_schema.sql - run this only against an
-- already-provisioned DB that predates this migration.
--
-- Order matters: dispatch_items.stock_id has a RESTRICT FK onto stock, so it
-- must be dropped before stock can be rebuilt.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1 - dispatch_items: dropped entirely. Dispatch is full-order and
-- one-per-order (uq_dispatches_order_id), so a quantity-per-line table would
-- just duplicate order_items. DispatchDetailPage renders the order's lines
-- instead.
-- -----------------------------------------------------------------------------
DROP TABLE dispatch_items;

-- -----------------------------------------------------------------------------
-- Step 2 - rebuild stock as a batch table (one row per intake event, with a
-- quantity, instead of one row per physical barcoded unit). Build-and-swap
-- since the unique key, the order_id FK, and the row collapse all have to
-- change together.
--
-- stock_new's FK/CHECK constraints are given _tmp-suffixed names because the
-- old stock table (still present until the swap below) already owns the
-- canonical names - constraint names must be unique per schema, not per
-- table. They're renamed back to the canonical names in step 3.
-- -----------------------------------------------------------------------------
CREATE TABLE stock_new (
  id            CHAR(36)      NOT NULL                COMMENT 'UUID v4 primary key',
  product_id    CHAR(36)      NOT NULL,
  quantity      INT           NOT NULL                COMMENT 'Units received in this batch',
  mrp           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  wsp           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  size          VARCHAR(20)   NULL,
  invoice_no    VARCHAR(100)  NOT NULL                COMMENT 'Supplier invoice this batch arrived on',
  invoice_date  DATE          NULL,
  note          VARCHAR(500)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_stock_product_id (product_id),
  KEY idx_stock_invoice_no (invoice_no),
  KEY idx_stock_created_at (created_at),

  CONSTRAINT fk_stock_product_id_tmp FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_stock_quantity_pos_tmp CHECK (quantity > 0),
  CONSTRAINT chk_stock_mrp_nonneg_tmp   CHECK (mrp >= 0),
  CONSTRAINT chk_stock_wsp_nonneg_tmp   CHECK (wsp >= 0),
  CONSTRAINT chk_stock_wsp_le_mrp_tmp   CHECK (wsp <= mrp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per stock intake batch';

-- Collapse per-unit rows into batches. Every status is included - the receipt
-- happened regardless of whether those units have since been reserved or
-- dispatched; current on-hand quantity lives in products.quantity_available,
-- not here.
INSERT INTO stock_new
  (id, product_id, quantity, mrp, wsp, size, invoice_no, invoice_date, note, created_at, updated_at)
SELECT UUID(), product_id, COUNT(*), mrp, wsp, size, invoice_no, invoice_date,
       MIN(note), MIN(created_at), MIN(created_at)
FROM stock
GROUP BY product_id, invoice_no, invoice_date, mrp, wsp, size;

DROP TABLE stock;
RENAME TABLE stock_new TO stock;

-- -----------------------------------------------------------------------------
-- Step 3 - rename the _tmp constraints on the newly-swapped-in stock table
-- back to the canonical names now that the old stock table (and its name
-- claims) is gone.
-- -----------------------------------------------------------------------------
ALTER TABLE stock
  DROP FOREIGN KEY fk_stock_product_id_tmp,
  DROP CONSTRAINT chk_stock_quantity_pos_tmp,
  DROP CONSTRAINT chk_stock_mrp_nonneg_tmp,
  DROP CONSTRAINT chk_stock_wsp_nonneg_tmp,
  DROP CONSTRAINT chk_stock_wsp_le_mrp_tmp,
  ADD CONSTRAINT fk_stock_product_id FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT chk_stock_quantity_pos CHECK (quantity > 0),
  ADD CONSTRAINT chk_stock_mrp_nonneg   CHECK (mrp >= 0),
  ADD CONSTRAINT chk_stock_wsp_nonneg   CHECK (wsp >= 0),
  ADD CONSTRAINT chk_stock_wsp_le_mrp   CHECK (wsp <= mrp);
