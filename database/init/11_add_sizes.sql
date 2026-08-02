-- =============================================================================
-- Migration: add predefined sizes picklist (backs the product/stock size
-- dropdowns). products.size and stock.size are unchanged — they keep storing
-- the value directly as plain text, not a foreign key reference. A fresh
-- install already has this via 01_schema.sql - run this only against an
-- already-provisioned DB that predates this migration.
-- =============================================================================

CREATE TABLE sizes (
  id            CHAR(36)      NOT NULL                              COMMENT 'UUID v4 primary key',
  value         VARCHAR(20)   NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order    INT           NOT NULL DEFAULT 0                    COMMENT 'Manual drag-and-drop display order',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_sizes_value (value),
  KEY idx_sizes_is_active  (is_active),
  KEY idx_sizes_sort_order (sort_order)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Predefined size picklist for the product/stock size dropdowns';

-- Starter list — admin can add more (e.g. numeric sizes) from the Sizes page.
INSERT INTO sizes (id, value, sort_order) VALUES
  (UUID(), 'S', 1),
  (UUID(), 'M', 2),
  (UUID(), 'L', 3),
  (UUID(), 'XL', 4),
  (UUID(), 'XXL', 5);

-- products.size was VARCHAR(10) — widen to match sizes.value/stock.size (VARCHAR(20)) so any
-- predefined size can be picked without a length mismatch.
ALTER TABLE products
  MODIFY COLUMN size VARCHAR(20) NULL COMMENT 'S/M/L/XL or numeric size — picked from the sizes table, stored as plain text';
