-- =============================================================================
-- Migration: add the homepage hero slider feature
-- A fresh install already has this via 01_schema.sql - run this only against an
-- already-provisioned DB that predates this migration.
-- =============================================================================

CREATE TABLE hero_slides (
  id            CHAR(36)      NOT NULL                        COMMENT 'UUID v4 primary key',
  media_id      CHAR(36)      NOT NULL                        COMMENT 'FK into the shared media library',
  media_url     VARCHAR(500)  NOT NULL                        COMMENT 'Denormalized URL of media_id, cached for fast reads',
  link_url      VARCHAR(500)  NULL                            COMMENT 'Optional click-through URL when the slide is clicked',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE            COMMENT 'FALSE hides it from the storefront without deleting it',
  sort_order    INT           NOT NULL DEFAULT 0               COMMENT 'Manual drag-and-drop display order',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_hero_slides_media_id    (media_id),
  KEY idx_hero_slides_is_active   (is_active),
  KEY idx_hero_slides_sort_order  (sort_order),

  CONSTRAINT fk_hero_slides_media_id
    FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Homepage hero slider slides';
