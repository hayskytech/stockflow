-- =============================================================================
-- Migration: sell a product as a "set" of N physical pieces (e.g. a "Shirt"
-- product that is really a bundle of 3 shirts). products.quantity_available /
-- quantity_reserved keep counting in whatever unit they already do (one
-- "set" is one countable unit) - this column is a pure display/price
-- multiplier, never used in stock reservation/dispatch/ledger math.
-- order_items.pieces_per_set_at_order snapshots it at order time so editing
-- a product's set size later doesn't rewrite the display of past orders -
-- same pattern as price_at_order / discount_percent_at_order.
-- A fresh install already has this via 01_schema.sql - run this only against
-- an already-provisioned DB that predates this migration.
-- =============================================================================

ALTER TABLE products
  ADD COLUMN pieces_per_set TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Physical pieces in one sellable unit - e.g. 3 for a "set of 3" shirt. 1 = sold as a single item' AFTER size,
  ADD CONSTRAINT chk_products_pieces_per_set_pos CHECK (pieces_per_set >= 1);

ALTER TABLE order_items
  ADD COLUMN pieces_per_set_at_order TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Snapshot of products.pieces_per_set at order time - price_at_order stays per-piece, this is what multiplies it for display' AFTER discount_percent_at_order;
