-- =============================================================================
-- Migration: replace MRP/WSP pricing with price + discount_percent on products,
-- stock, and order_items. The customer-facing price is now computed as
-- price * (1 - discount_percent/100) instead of stored as a second absolute
-- figure. Existing rows are backfilled from their old mrp/wsp pair via the
-- implied discount (discount_percent = (1 - wsp/mrp) * 100) so existing data
-- keeps the same effective price, rather than resetting to 0.
-- A fresh install already has this via 01_schema.sql - run this only against
-- an already-provisioned DB that predates this migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Listed price shown to customers' AFTER size,
  ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Percentage off price — what the customer pays is price * (1 - discount_percent/100)' AFTER price;

UPDATE products
SET price = mrp,
    discount_percent = CASE WHEN mrp = 0 THEN 0 ELSE ROUND((1 - (wsp / mrp)) * 100, 2) END;

ALTER TABLE products
  DROP CONSTRAINT chk_products_mrp_nonneg,
  DROP CONSTRAINT chk_products_wsp_nonneg,
  DROP CONSTRAINT chk_products_wsp_le_mrp,
  DROP COLUMN mrp,
  DROP COLUMN wsp,
  ADD CONSTRAINT chk_products_price_nonneg CHECK (price >= 0),
  ADD CONSTRAINT chk_products_discount_percent_range CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- -----------------------------------------------------------------------------
-- stock
-- -----------------------------------------------------------------------------
ALTER TABLE stock
  ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER quantity,
  ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER price;

UPDATE stock
SET price = mrp,
    discount_percent = CASE WHEN mrp = 0 THEN 0 ELSE ROUND((1 - (wsp / mrp)) * 100, 2) END;

ALTER TABLE stock
  DROP CONSTRAINT chk_stock_mrp_nonneg,
  DROP CONSTRAINT chk_stock_wsp_nonneg,
  DROP CONSTRAINT chk_stock_wsp_le_mrp,
  DROP COLUMN mrp,
  DROP COLUMN wsp,
  ADD CONSTRAINT chk_stock_price_nonneg CHECK (price >= 0),
  ADD CONSTRAINT chk_stock_discount_percent_range CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- -----------------------------------------------------------------------------
-- order_items — historical snapshot columns
-- -----------------------------------------------------------------------------
ALTER TABLE order_items
  ADD COLUMN price_at_order DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Snapshot of products.price at order time' AFTER quantity,
  ADD COLUMN discount_percent_at_order DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Snapshot of products.discount_percent at order time - price never recomputed later' AFTER price_at_order;

UPDATE order_items
SET price_at_order = mrp_at_order,
    discount_percent_at_order = CASE WHEN mrp_at_order = 0 THEN 0 ELSE ROUND((1 - (wsp_at_order / mrp_at_order)) * 100, 2) END;

ALTER TABLE order_items
  DROP COLUMN mrp_at_order,
  DROP COLUMN wsp_at_order;

-- orders.total_amount itself is unaffected — it was always the derived sum, not a mrp/wsp column.
