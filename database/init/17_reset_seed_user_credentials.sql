-- =============================================================================
-- Migration: reset seed user emails + passwords, add sample customer
-- A fresh install already has this via 02_seed.sql - run this only against an
-- already-provisioned DB whose seed users still use the old @stockflow.local
-- emails / "Admin@1234" password.
--
-- New credentials (all seed users share one password):
--   admin@example.com     / NewPassword@123
--   staff@example.com     / NewPassword@123
--   customer@example.com  / NewPassword@123
--
-- Password hash is bcrypt cost-12 for "NewPassword@123".
-- =============================================================================

UPDATE users
SET email         = 'admin@example.com',
    password_hash = '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG'
WHERE id = 'a0000000-0000-4000-8000-000000000001';

UPDATE users
SET email         = 'staff@example.com',
    password_hash = '$2b$12$Q3bGZMiMrflsWMPsOqOR7OvCtaGxIsTffNMIEaYFoyx1IqvDzgMCG'
WHERE id = 'a0000000-0000-4000-8000-000000000002';

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
)
ON DUPLICATE KEY UPDATE
  email         = VALUES(email),
  password_hash = VALUES(password_hash);
