-- =============================================================================
-- StockFlow Seed Data
-- Run after 01_schema.sql on first setup.
-- IMPORTANT: Change the admin password immediately after first login.
-- =============================================================================

USE stockflow;

-- =============================================================================
-- Warehouse settings (single row)
-- =============================================================================
INSERT INTO warehouse (id, name, address, phone, email) VALUES (
  1,
  'StockFlow Main Warehouse',
  '123 Textile Market Road, Chennai, Tamil Nadu',
  '+91-9999999999',
  'warehouse@stockflow.local'
);

-- =============================================================================
-- Initial admin user
--
-- Default credentials:
--   Email:    admin@stockflow.local
--   Password: Admin@1234
--
-- Password hash below is bcrypt cost-12 for "Admin@1234".
-- Generate a fresh hash with: node -e "const b=require('bcryptjs'); b.hash('yourpassword',12).then(console.log)"
-- =============================================================================
INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  role,
  is_active,
  must_change_password,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'System Administrator',
  'admin@stockflow.local',
  -- bcrypt cost-12 hash for "Admin@1234" — REPLACE THIS before going to production
  '$2b$12$Xrpko5jTF9EaqcJU1oEEVO2Yk10N.NQrlKaP61dsKFpsGiVqIw9D6',
  'admin',
  TRUE,
  TRUE,   -- force password change on first login
  NOW(),
  NOW()
);

-- =============================================================================
-- Sample staff user
--
-- Default credentials:
--   Email:    staff@stockflow.local
--   Password: Admin@1234
-- =============================================================================
INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  role,
  is_active,
  must_change_password,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-4000-8000-000000000002',
  'Warehouse Staff',
  'staff@stockflow.local',
  '$2b$12$Xrpko5jTF9EaqcJU1oEEVO2Yk10N.NQrlKaP61dsKFpsGiVqIw9D6',
  'staff',
  TRUE,
  TRUE,
  NOW(),
  NOW()
);

-- =============================================================================
-- Divisions (top-level product lines)
-- =============================================================================
INSERT INTO divisions (id, name, is_active) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'KIDS WEAR',   TRUE),
  ('d0000000-0000-4000-8000-000000000002', 'MENS WEAR',   TRUE),
  ('d0000000-0000-4000-8000-000000000003', 'LADIES WEAR', TRUE);

-- =============================================================================
-- Categories (each under one division)
-- =============================================================================
INSERT INTO categories (id, division_id, name, is_active) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Ethnic Wear', TRUE),
  ('c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'Shirts',      TRUE),
  ('c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'Sarees',      TRUE),
  ('c0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'Dresses',     TRUE);

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
  id, product_code, barcode, category_id, sub_category_id, name, description,
  color, size, mrp, wsp, quantity_available, quantity_reserved, reorder_level, unit, is_active
) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'LW-DRS-0001', '8901000000011',
   'c0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
   'Floral Print Cotton Dress', 'Casual cotton dress with floral print',
   'Multi', 'M', 899.00, 720.00, 50, 0, 10, 'pc', TRUE),

  ('b0000000-0000-4000-8000-000000000002', 'LW-SRE-0001', '8901000000028',
   'c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003',
   'Kanjivaram Silk Saree', 'Traditional silk saree with zari border',
   'Maroon', 'Free Size', 4999.00, 3999.00, 20, 0, 5, 'pc', TRUE),

  ('b0000000-0000-4000-8000-000000000003', 'KW-FRK-0001', '8901000000035',
   'c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'Kids Party Frock', 'Party wear frock for girls, ages 4-8',
   'Pink', '6-7Y', 599.00, 480.00, 40, 0, 10, 'pc', TRUE),

  ('b0000000-0000-4000-8000-000000000004', 'MW-SHT-0001', '8901000000042',
   'c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002',
   'Formal Cotton Shirt', 'Slim-fit formal shirt',
   'White', 'L', 799.00, 640.00, 60, 0, 15, 'pc', TRUE);
