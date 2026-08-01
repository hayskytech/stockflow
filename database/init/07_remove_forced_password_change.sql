-- =============================================================================
-- Migration: remove the forced/temporary-password concept
-- A fresh install already has this via 01_schema.sql - run this only against an
-- already-provisioned DB that predates this migration.
-- =============================================================================

ALTER TABLE users DROP COLUMN must_change_password;
