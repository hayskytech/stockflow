-- =============================================================================
-- Migration: remove the divisions table and categories.division_id
-- Divisions were the top level of the product tree (division -> category ->
-- sub_category). They carried no weight the category level didn't already
-- provide, so the tree is flattened to category -> sub_category and categories
-- become top-level.
--
-- A fresh install already has this via 01_schema.sql - run this only against an
-- already-provisioned DB that predates this migration.
--
-- Order matters: categories.division_id has a RESTRICT FK onto divisions, so the
-- FK and the column must be dropped before the divisions table can go.
--
-- NOTE: categories.name was unique only per-division (uq_categories_division_name).
-- After this migration it is globally unique (uq_categories_name). If the current
-- data has two categories that share a name under different divisions, de-duplicate
-- them before running this script.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1 - drop the FK from categories to divisions.
-- -----------------------------------------------------------------------------
ALTER TABLE categories
  DROP FOREIGN KEY fk_categories_division_id;

-- -----------------------------------------------------------------------------
-- Step 2 - drop the division-scoped indexes and the division_id column, and
-- swap the per-division unique name key for a global one.
-- -----------------------------------------------------------------------------
ALTER TABLE categories
  DROP INDEX uq_categories_division_name,
  DROP INDEX idx_categories_division_id,
  DROP COLUMN division_id,
  ADD UNIQUE KEY uq_categories_name (name);

-- -----------------------------------------------------------------------------
-- Step 3 - drop the now-unreferenced divisions table.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS divisions;
