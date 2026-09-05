-- =============================================================================
-- StockFlow Seed Data  (multi-tenant)
-- Run after 01_schema.sql on first setup.
-- IMPORTANT: Change the seed passwords immediately after first login.
--
-- Default credentials (all four share the same password: NewPassword@123):
--   admin@example.com       / NewPassword@123   — PLATFORM SUPER ADMIN (is_super_admin=1)
--   staff@example.com       / NewPassword@123   — staff of "Default Business"
--   demo.admin@example.com  / NewPassword@123   — admin of "Demo Cloth Co"
--   customer@example.com    / NewPassword@123   — dormant customer, no membership
--
-- Password hash below is bcrypt cost-12 for "NewPassword@123".
-- Generate a fresh hash with: node -e "const b=require('bcryptjs'); b.hash('yourpassword',12).then(console.log)"
-- =============================================================================

-- =============================================================================
-- Businesses — two tenants so multi-tenant behaviour is visible from seed.
-- The "Default Business" UUID is identical to the one 05_multitenant_business_id.sql
-- backfills onto, so a fresh install and a migrated install agree.
-- =============================================================================
INSERT INTO businesses (id, name, slug, is_active) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Default Business', 'default',       TRUE),
  ('b0000000-0000-4000-8000-000000000002', 'Demo Cloth Co',    'demo-cloth-co', TRUE);

-- =============================================================================
-- Seed users
--   ...0001  System Administrator — platform super admin (also admin of both businesses)
--   ...0002  Warehouse Staff      — staff of Default Business
--   ...0003  Sample Customer      — dormant, no membership
--   ...0004  Demo Admin           — admin of Demo Cloth Co only
-- =============================================================================
INSERT INTO users (
  id, name, email, password_hash, role, is_super_admin,
  is_active, profile_completed_at, created_at, updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'System Administrator',
  'admin@example.com',
  '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG',
  'admin',
  1,
  TRUE,
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO users (
  id, name, email, password_hash, role, is_super_admin,
  is_active, profile_completed_at, created_at, updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000002',
  'Warehouse Staff',
  'staff@example.com',
  '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG',
  'staff',
  0,
  TRUE,
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO users (
  id, name, email, password_hash, role, is_super_admin, phone,
  is_active, profile_completed_at, created_at, updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000003',
  'Sample Customer',
  'customer@example.com',
  '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG',
  'customer',
  0,
  '9000000003',
  TRUE,
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO users (
  id, name, email, password_hash, role, is_super_admin,
  is_active, profile_completed_at, created_at, updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000004',
  'Demo Admin',
  'demo.admin@example.com',
  '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG',
  'admin',
  0,
  TRUE,
  NOW(),
  NOW(),
  NOW()
);

-- =============================================================================
-- Memberships
--   ...0001 is admin of BOTH businesses (in addition to being platform super admin)
--   ...0002 is staff of Default Business only
--   ...0004 is admin of Demo Cloth Co only
--   ...0003 (customer) gets NO membership
-- (d1000000-…0001 / …0003 match the ids inserted by 05_multitenant_business_id.sql.)
-- =============================================================================
INSERT INTO memberships (id, user_id, business_id, role) VALUES
  ('d1000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'admin'),
  ('d1000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'admin'),
  ('d1000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'staff'),
  ('d1000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'admin');

-- =============================================================================
-- Business settings (one row per business)
-- =============================================================================
INSERT INTO business_settings (
  business_id, name, address, phone, email,
  bank_name, account_holder_name, account_number, ifsc_code, upi_id
) VALUES
  ('b0000000-0000-4000-8000-000000000001',
   'StockFlow Main Warehouse',
   '123 Textile Market Road, Chennai, Tamil Nadu',
   '9999999999',
   'warehouse@stockflow.local',
   'State Bank of India',
   'StockFlow Textiles Pvt Ltd',
   '000000000000',
   'SBIN0000001',
   'stockflow@sbi'),
  ('b0000000-0000-4000-8000-000000000002',
   'Demo Cloth Co',
   '45 MG Road, Bengaluru, Karnataka',
   '8888888888',
   'settings@demo-cloth-co.local',
   'HDFC Bank',
   'Demo Cloth Co Pvt Ltd',
   '111111111111',
   'HDFC0000001',
   'democloth@hdfc');

-- =============================================================================
-- Notice board (one row per business, inactive by default)
-- =============================================================================
INSERT INTO notice (business_id, message, is_active) VALUES
  ('b0000000-0000-4000-8000-000000000001', NULL, FALSE),
  ('b0000000-0000-4000-8000-000000000002', NULL, FALSE);

-- =============================================================================
-- Social links (one row per business, all empty by default)
-- =============================================================================
INSERT INTO social_links (business_id, facebook_url, instagram_url, youtube_url, whatsapp_url) VALUES
  ('b0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL),
  ('b0000000-0000-4000-8000-000000000002', NULL, NULL, NULL, NULL);

-- =============================================================================
-- Site branding (one row per business, no logo/favicon by default)
-- =============================================================================
INSERT INTO site_branding (business_id, logo_media_id, logo_url, favicon_media_id, favicon_url) VALUES
  ('b0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL),
  ('b0000000-0000-4000-8000-000000000002', NULL, NULL, NULL, NULL);

-- =============================================================================
-- Sizes
--   Default Business — starter S/M/L/XL/XXL list
--   Demo Cloth Co    — its own short list ("M" can repeat: unique is per business)
-- =============================================================================
INSERT INTO sizes (id, business_id, value, sort_order) VALUES
  (UUID(), 'b0000000-0000-4000-8000-000000000001', 'S',   1),
  (UUID(), 'b0000000-0000-4000-8000-000000000001', 'M',   2),
  (UUID(), 'b0000000-0000-4000-8000-000000000001', 'L',   3),
  (UUID(), 'b0000000-0000-4000-8000-000000000001', 'XL',  4),
  (UUID(), 'b0000000-0000-4000-8000-000000000001', 'XXL', 5),
  ('db000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Free Size', 1),
  ('db000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'M',         2);

-- =============================================================================
-- Categories (top-level of the product tree, per business)
-- =============================================================================
INSERT INTO categories (id, business_id, name, is_active) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Ethnic Wear', TRUE),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Shirts',      TRUE),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Sarees',      TRUE),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Dresses',     TRUE),
  ('da000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Menswear',    TRUE),
  ('da000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Womenswear',  TRUE);

-- =============================================================================
-- Sub-categories (Default Business only; each under one category)
-- =============================================================================
INSERT INTO sub_categories (id, business_id, category_id, name, is_active) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Party Wear',     TRUE),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'Formal Shirts',  TRUE),
  ('e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003', 'Silk Sarees',    TRUE),
  ('e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004', 'Casual Dresses', TRUE);

-- =============================================================================
-- Sample products
--   NOTE: the Default Business product UUIDs (b0000000-…0001..0004) predate
--   multi-tenancy. They happen to share literal values with the two `businesses`
--   ids, which is legal (PKs are unique only within a table) but unrelated.
-- =============================================================================
INSERT INTO products (
  id, business_id, product_code, category_id, sub_category_id, name, description,
  color, size, pieces_per_set, price, discount_percent, quantity_available, quantity_reserved, reorder_level, is_active
) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'LW-DRS-0001',
   'c0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
   'Floral Print Cotton Dress', 'Casual cotton dress with floral print',
   'Multi', 'M', 1, 899.00, 19.91, 3, 0, 10, TRUE),

  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'LW-SRE-0001',
   'c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003',
   'Kanjivaram Silk Saree', 'Traditional silk saree with zari border',
   'Maroon', 'Free Size', 1, 4999.00, 20.00, 2, 0, 5, TRUE),

  ('b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'KW-FRK-0001',
   'c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'Kids Party Frock', 'Party wear frock for girls, ages 4-8',
   'Pink', '6-7Y', 1, 599.00, 19.87, 2, 0, 10, TRUE),

  ('b0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'MW-SHT-0001',
   'c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002',
   'Formal Cotton Shirt', 'Slim-fit formal shirt',
   'White', 'L', 1, 799.00, 19.90, 3, 0, 15, TRUE),

  -- Demo Cloth Co — its own catalog
  ('dc000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'DCC-KUR-0001',
   'da000000-0000-4000-8000-000000000001', NULL,
   'Cotton Kurta', 'Straight-cut cotton kurta',
   'Beige', 'M', 1, 1200.00, 10.00, 5, 0, 3, TRUE),

  ('dc000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'DCC-TOP-0001',
   'da000000-0000-4000-8000-000000000002', NULL,
   'Rayon Top', 'Relaxed-fit printed rayon top',
   'Teal', 'Free Size', 1, 750.00, 15.00, 4, 0, 2, TRUE);

-- =============================================================================
-- Sample stock (one row per intake batch) — quantity per row rolls up to the
-- quantity_available on the matching product above.
-- =============================================================================
INSERT INTO stock (id, business_id, product_id, quantity, price, discount_percent, size, invoice_no, invoice_date) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 2, 899.00, 19.91, 'M', 'INV-2026-0001', '2026-01-05'),
  ('f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 1, 949.00, 20.97, 'L', 'INV-2026-0001', '2026-01-05'),

  ('f0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 2, 4999.00, 20.00, 'Free Size', 'INV-2026-0002', '2026-01-10'),

  ('f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 2, 599.00, 19.87, '6-7Y', 'INV-2026-0003', '2026-02-01'),

  ('f0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 2, 799.00, 19.90, 'L', 'INV-2026-0004', '2026-02-15'),
  ('f0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 1, 799.00, 19.90, 'XL', 'INV-2026-0004', '2026-02-15'),

  -- Demo Cloth Co — one intake batch per product
  ('dd000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'dc000000-0000-4000-8000-000000000001', 5, 1200.00, 10.00, 'M',         'DCC-INV-0001', '2026-03-01'),
  ('dd000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'dc000000-0000-4000-8000-000000000002', 4,  750.00, 15.00, 'Free Size', 'DCC-INV-0002', '2026-03-05');
