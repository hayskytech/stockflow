-- =============================================================================
-- Migration: add site_branding (single-row, admin-editable logo + favicon,
-- admin-managed via the shared media library). A fresh install already has
-- this via 01_schema.sql - run this only against an already-provisioned DB
-- that predates this migration.
-- =============================================================================

CREATE TABLE site_branding (
  id                TINYINT UNSIGNED NOT NULL DEFAULT 1                 COMMENT 'Always 1 - single row',
  logo_media_id     CHAR(36)      NULL                                  COMMENT 'FK into the shared media library',
  logo_url          VARCHAR(500)  NULL                                  COMMENT 'Denormalized URL of logo_media_id, cached for fast reads',
  favicon_media_id  CHAR(36)      NULL                                  COMMENT 'FK into the shared media library',
  favicon_url       VARCHAR(500)  NULL                                  COMMENT 'Denormalized URL of favicon_media_id, cached for fast reads',
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_site_branding_logo_media_id     (logo_media_id),
  KEY idx_site_branding_favicon_media_id  (favicon_media_id),
  CONSTRAINT chk_site_branding_single_row CHECK (id = 1),

  CONSTRAINT fk_site_branding_logo_media_id
    FOREIGN KEY (logo_media_id) REFERENCES media (id),
  CONSTRAINT fk_site_branding_favicon_media_id
    FOREIGN KEY (favicon_media_id) REFERENCES media (id)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Single-row admin-editable storefront logo + favicon';

INSERT INTO site_branding (id, logo_media_id, logo_url, favicon_media_id, favicon_url) VALUES (1, NULL, NULL, NULL, NULL);
