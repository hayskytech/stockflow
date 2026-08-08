-- OTP login now creates the account instead of rejecting an unknown number (see CLAUDE.md > Auth
-- Concept). A verified phone number is the only thing such a row starts with, so the three columns
-- that every previous path guaranteed — name, email, password_hash — must be allowed to be empty
-- until the customer submits the profile form.
--
-- password_hash stays NULL for good on an OTP-only account: setting a password on the profile form
-- is optional, because forcing one would defeat the point of passwordless sign-in. Password login
-- rejects a NULL hash with the same generic "Invalid credentials" as a wrong password.
ALTER TABLE users
  MODIFY name          VARCHAR(100) NULL COMMENT 'Full display name — NULL until an OTP-created customer completes their profile',
  MODIFY email         VARCHAR(150) NULL COMMENT 'Login email — NULL until an OTP-created customer completes their profile',
  MODIFY password_hash VARCHAR(255) NULL COMMENT 'bcrypt hash (cost 12) — NULL on an OTP-only account with no password set',
  ADD COLUMN profile_completed_at DATETIME NULL
    COMMENT 'NULL = created by OTP login and still missing its profile; the storefront blocks checkout until this is set'
    AFTER pincode;

-- Both existing paths (admin-created users and POST /auth/register) demand the full profile up
-- front, so everyone who already exists is complete by definition.
UPDATE users SET profile_completed_at = created_at WHERE profile_completed_at IS NULL;
