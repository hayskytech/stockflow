-- =============================================================================
-- Migration: flag orders that were knowingly placed against insufficient stock
-- (back-orders). Not a new lifecycle state — the order still flows
-- pending -> accepted -> dispatched -> completed exactly like any other order;
-- this is just a marker so staff can find it and customers see why it's slow
-- to accept. Whole-order flag, not per-line.
-- A fresh install already has this via 01_schema.sql - run this only against
-- an already-provisioned DB that predates this migration.
-- =============================================================================

ALTER TABLE orders
  ADD COLUMN is_backorder BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'At least one line was accepted against insufficient stock at order time' AFTER status,
  ADD KEY idx_orders_is_backorder (is_backorder);
