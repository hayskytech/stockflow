-- =============================================================================
-- Migration: add app-wide phone/currency format settings to warehouse
-- A fresh install already has this via 01_schema.sql - run this only against an
-- already-provisioned DB that predates this migration.
-- =============================================================================

ALTER TABLE warehouse
  ADD COLUMN phone_country_code VARCHAR(4) NOT NULL DEFAULT '+91'
    COMMENT 'Prefix shown/enforced on all phone number inputs app-wide',
  ADD COLUMN phone_number_length TINYINT UNSIGNED NOT NULL DEFAULT 10
    COMMENT 'Required digit count for all phone number inputs app-wide',
  ADD COLUMN currency_symbol VARCHAR(5) NOT NULL DEFAULT '₹'
    COMMENT 'Shown before every money amount app-wide',
  ADD COLUMN currency_decimal_digits TINYINT UNSIGNED NOT NULL DEFAULT 2
    COMMENT 'Decimal places shown for every money amount app-wide';
