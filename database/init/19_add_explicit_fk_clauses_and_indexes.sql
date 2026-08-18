-- =============================================================================
-- Migration: cosmetic schema consistency fixes (no behavior change)
--
-- 1. site_branding's two FKs into media relied on MySQL's implicit default
--    (RESTRICT/RESTRICT) instead of stating ON DELETE/ON UPDATE explicitly,
--    unlike every other FK in the schema. Behaviorally identical — MySQL's
--    default for an omitted clause is already RESTRICT — this just spells it
--    out, matching the ON DELETE RESTRICT ON UPDATE CASCADE convention used
--    elsewhere for hard (non-cascading) FKs, and ON UPDATE CASCADE matching
--    every other FK into media (fk_media_usage_media_id,
--    fk_products_photo_media_id, fk_product_gallery_media_id,
--    fk_hero_slides_media_id all use ON UPDATE CASCADE).
-- 2. dispatches.dispatched_by and product_gallery_images.media_id lack an
--    explicit named index, unlike every other FK column in the schema — they
--    rely on InnoDB's implicit FK-support index. Adding the explicitly named
--    index alongside it is additive and changes nothing functionally.
--
-- A fresh install already has this via 01_schema.sql — run this only against
-- an already-provisioned DB that predates this migration.
-- =============================================================================

-- Split into separate statements (drop, then add) — combining drop+add of a
-- same-named FK constraint in one ALTER TABLE errors on this server
-- (errno 121, duplicate constraint name mid-rebuild).
ALTER TABLE site_branding
  DROP FOREIGN KEY fk_site_branding_logo_media_id,
  DROP FOREIGN KEY fk_site_branding_favicon_media_id;

ALTER TABLE site_branding
  ADD CONSTRAINT fk_site_branding_logo_media_id
    FOREIGN KEY (logo_media_id) REFERENCES media (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_site_branding_favicon_media_id
    FOREIGN KEY (favicon_media_id) REFERENCES media (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE dispatches
  ADD INDEX idx_dispatches_dispatched_by (dispatched_by);

ALTER TABLE product_gallery_images
  ADD INDEX idx_product_gallery_images_media_id (media_id);
