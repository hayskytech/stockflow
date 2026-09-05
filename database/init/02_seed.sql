-- =============================================================================
-- StockFlow Seed Data
-- Run after 01_schema.sql on first setup.
-- IMPORTANT: Change the admin password immediately after first login.
-- =============================================================================

-- =============================================================================
-- Warehouse settings (single row)
-- =============================================================================
INSERT INTO warehouse (
  id, name, address, phone, email,
  bank_name, account_holder_name, account_number, ifsc_code, upi_id
) VALUES (
  1,
  'StockFlow Main Warehouse',
  '123 Textile Market Road, Chennai, Tamil Nadu',
  '+91-9999999999',
  'warehouse@stockflow.local',
  'State Bank of India',
  'StockFlow Textiles Pvt Ltd',
  '000000000000',
  'SBIN0000001',
  'stockflow@sbi'
);

-- =============================================================================
-- Notice board (single row, inactive by default)
-- =============================================================================
INSERT INTO notice (id, message, is_active) VALUES (1, NULL, FALSE);

-- =============================================================================
-- Social links (single row, all empty by default)
-- =============================================================================
INSERT INTO social_links (id, facebook_url, instagram_url, youtube_url, whatsapp_url) VALUES (1, NULL, NULL, NULL, NULL);

-- =============================================================================
-- Site branding (single row, no logo/favicon by default)
-- =============================================================================
INSERT INTO site_branding (id, logo_media_id, logo_url, favicon_media_id, favicon_url) VALUES (1, NULL, NULL, NULL, NULL);

-- =============================================================================
-- Sizes (starter list — admin can add more, e.g. numeric sizes, from the Sizes page)
-- =============================================================================
INSERT INTO sizes (id, value, sort_order) VALUES
  (UUID(), 'S', 1),
  (UUID(), 'M', 2),
  (UUID(), 'L', 3),
  (UUID(), 'XL', 4),
  (UUID(), 'XXL', 5);

-- =============================================================================
-- Seed users — admin, staff, and a sample customer.
--
-- Default credentials (all three share the same password):
--   admin@example.com     / NewPassword@123
--   staff@example.com     / NewPassword@123
--   customer@example.com  / NewPassword@123
--
-- Password hash below is bcrypt cost-12 for "NewPassword@123".
-- Generate a fresh hash with: node -e "const b=require('bcryptjs'); b.hash('yourpassword',12).then(console.log)"
-- IMPORTANT: change these passwords before going to production.
-- =============================================================================
INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  role,
  is_active,
  profile_completed_at,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'System Administrator',
  'admin@example.com',
  -- bcrypt cost-12 hash for "NewPassword@123" — REPLACE THIS before going to production
  '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG',
  'admin',
  TRUE,
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  role,
  is_active,
  profile_completed_at,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000002',
  'Warehouse Staff',
  'staff@example.com',
  '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG',
  'staff',
  TRUE,
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  role,
  phone,
  is_active,
  profile_completed_at,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000003',
  'Sample Customer',
  'customer@example.com',
  '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG',
  'customer',
  '+91-9000000003',
  TRUE,
  NOW(),
  NOW(),
  NOW()
);

-- =============================================================================
-- Categories (top-level of the product tree)
-- =============================================================================
INSERT INTO categories (id, name, is_active) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Ethnic Wear', TRUE),
  ('c0000000-0000-4000-8000-000000000002', 'Shirts',      TRUE),
  ('c0000000-0000-4000-8000-000000000003', 'Sarees',      TRUE),
  ('c0000000-0000-4000-8000-000000000004', 'Dresses',     TRUE);

-- =============================================================================
-- Sub-categories (each under one category)
-- =============================================================================
INSERT INTO sub_categories (id, category_id, name, is_active) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Party Wear',     TRUE),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Formal Shirts',  TRUE),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Silk Sarees',    TRUE),
  ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'Casual Dresses', TRUE);

-- =============================================================================
-- Sample products
-- =============================================================================
INSERT INTO products (
  id, product_code, category_id, sub_category_id, name, description,
  color, size, pieces_per_set, price, discount_percent, quantity_available, quantity_reserved, reorder_level, is_active
) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'LW-DRS-0001',
   'c0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
   'Floral Print Cotton Dress', 'Casual cotton dress with floral print',
   'Multi', 'M', 1, 899.00, 19.91, 3, 0, 10, TRUE),

  ('b0000000-0000-4000-8000-000000000002', 'LW-SRE-0001',
   'c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003',
   'Kanjivaram Silk Saree', 'Traditional silk saree with zari border',
   'Maroon', 'Free Size', 1, 4999.00, 20.00, 2, 0, 5, TRUE),

  ('b0000000-0000-4000-8000-000000000003', 'KW-FRK-0001',
   'c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'Kids Party Frock', 'Party wear frock for girls, ages 4-8',
   'Pink', '6-7Y', 1, 599.00, 19.87, 2, 0, 10, TRUE),

  ('b0000000-0000-4000-8000-000000000004', 'MW-SHT-0001',
   'c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002',
   'Formal Cotton Shirt', 'Slim-fit formal shirt',
   'White', 'L', 1, 799.00, 19.90, 3, 0, 15, TRUE);

-- =============================================================================
-- Sample stock (one row per intake batch) — quantity per row rolls up to the
-- quantity_available on the matching product above.
-- =============================================================================
INSERT INTO stock (id, product_id, quantity, price, discount_percent, size, invoice_no, invoice_date) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 2, 899.00, 19.91, 'M', 'INV-2026-0001', '2026-01-05'),
  ('f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 1, 949.00, 20.97, 'L', 'INV-2026-0001', '2026-01-05'),

  ('f0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 2, 4999.00, 20.00, 'Free Size', 'INV-2026-0002', '2026-01-10'),

  ('f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 2, 599.00, 19.87, '6-7Y', 'INV-2026-0003', '2026-02-01'),

  ('f0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000004', 2, 799.00, 19.90, 'L', 'INV-2026-0004', '2026-02-15'),
  ('f0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000004', 1, 799.00, 19.90, 'XL', 'INV-2026-0004', '2026-02-15');
