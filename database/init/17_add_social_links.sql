-- =============================================================================
-- Migration: add social_links (single-row, admin-editable Facebook/Instagram/
-- YouTube/WhatsApp Channel URLs shown in the storefront footer). A fresh
-- install already has this via 01_schema.sql - run this only against an
-- already-provisioned DB that predates this migration.
-- =============================================================================

CREATE TABLE social_links (
  id              TINYINT UNSIGNED NOT NULL DEFAULT 1                 COMMENT 'Always 1 - single row',
  facebook_url    VARCHAR(255)  NULL,
  instagram_url   VARCHAR(255)  NULL,
  youtube_url     VARCHAR(255)  NULL,
  whatsapp_url    VARCHAR(255)  NULL                                  COMMENT 'WhatsApp channel link, not a phone number',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT chk_social_links_single_row CHECK (id = 1)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Single-row admin-editable storefront social media links';

INSERT INTO social_links (id, facebook_url, instagram_url, youtube_url, whatsapp_url) VALUES (1, NULL, NULL, NULL, NULL);
