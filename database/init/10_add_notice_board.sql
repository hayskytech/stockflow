-- =============================================================================
-- Migration: add notice board (single-row, admin-editable scrolling text shown
-- on the storefront). A fresh install already has this via 01_schema.sql - run
-- this only against an already-provisioned DB that predates this migration.
-- =============================================================================

CREATE TABLE notice (
  id          TINYINT UNSIGNED NOT NULL DEFAULT 1                 COMMENT 'Always 1 - single row',
  message     VARCHAR(500)  NULL                                  COMMENT 'Scrolling notice text shown on the storefront when active',
  is_active   BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT chk_notice_single_row CHECK (id = 1)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Single-row admin-editable storefront notice board';

INSERT INTO notice (id, message, is_active) VALUES (1, NULL, FALSE);
