-- =============================================================================
-- Migration: remove products.unit
-- Every product in this catalog (dresses, sarees, kidware, menswear) is sold by
-- count, not by a unit of measure (litres/metres/etc.) - the column never carried
-- meaningful information, so it's dropped rather than kept as a defaulted field.
-- A fresh install already has this via 01_schema.sql - run this only against an
-- already-provisioned DB that predates this migration.
-- =============================================================================

ALTER TABLE products
  DROP COLUMN unit;
