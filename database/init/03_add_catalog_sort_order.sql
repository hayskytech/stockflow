-- =============================================================================
-- Migration: add manual drag-and-drop ordering to the catalog tree
-- Adds sort_order to divisions/categories/sub_categories and backfills a stable
-- initial order (alphabetical) so existing rows aren't all tied at 0.
-- A fresh install already has this via 01_schema.sql — run this only against an
-- already-provisioned DB that predates this migration.
-- =============================================================================

ALTER TABLE divisions
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
  ADD KEY idx_divisions_sort_order (sort_order);

ALTER TABLE categories
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
  ADD KEY idx_categories_sort_order (sort_order);

ALTER TABLE sub_categories
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
  ADD KEY idx_sub_categories_sort_order (sort_order);

UPDATE divisions d JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn FROM divisions
) t ON t.id = d.id SET d.sort_order = t.rn;

UPDATE categories c JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY division_id ORDER BY name) AS rn FROM categories
) t ON t.id = c.id SET c.sort_order = t.rn;

UPDATE sub_categories s JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY name) AS rn FROM sub_categories
) t ON t.id = s.id SET s.sort_order = t.rn;
