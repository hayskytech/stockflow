-- =============================================================================
-- Migration: fix mojibake in warehouse.currency_symbol
-- The 06_add_warehouse_phone_currency_settings.sql migration was originally run
-- through a client whose console codepage mis-decoded the multi-byte UTF-8 '₹'
-- symbol before sending it to the server, corrupting both the column DEFAULT
-- and the single warehouse row's stored value. This re-applies the correct
-- UTF-8 bytes to both.
-- =============================================================================

ALTER TABLE warehouse
  MODIFY COLUMN currency_symbol VARCHAR(5) NOT NULL DEFAULT '₹'
    COMMENT 'Shown before every money amount app-wide';

UPDATE warehouse SET currency_symbol = '₹' WHERE id = 1 AND currency_symbol <> '₹';
