-- Phone + OTP authentication via the MSG91 widget (see backend/src/utils/msg91.js).
--
-- One row per code MSG91 was asked to send. The code itself is NEVER stored: MSG91 generates,
-- delivers, expires and rate-limits it, and is the only party that can verify it. What this table
-- stores is the binding between MSG91's `reqId` and the phone number it was issued for — the
-- client only ever sends a phone, and verification resolves the `reqId` from this table, so no
-- request can verify a code for one number and claim another.
--
-- Hard-deleted on expiry like refresh_tokens (no soft deletes anywhere — see CLAUDE.md).
CREATE TABLE otp_requests (
  id              CHAR(36)      NOT NULL                            COMMENT 'UUID v4 primary key',
  phone           VARCHAR(15)   NOT NULL                            COMMENT 'Local phone digits as typed, without country code',
  provider_req_id VARCHAR(64)   NOT NULL                            COMMENT 'MSG91 widget reqId — never the code itself',
  purpose         ENUM('login','register') NOT NULL                 COMMENT 'A login code can never be spent on a registration, or vice versa',
  ip_address      VARCHAR(45)   NULL                                COMMENT 'IP that requested the code (IPv6 max = 45 chars)',
  expires_at      DATETIME      NOT NULL                            COMMENT 'Defensive local ceiling — MSG91 owns the real expiry',
  consumed_at     DATETIME      NULL                                COMMENT 'Set once the code has been successfully spent — NULL means still open',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_otp_requests_lookup     (phone, purpose, created_at),
  KEY idx_otp_requests_expires_at (expires_at)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='MSG91 OTP request bindings — phone to provider reqId';

-- Customers created before OTP login may have no phone on file, and a customer who registers from
-- now on proves their phone by OTP. Phone becomes the customer login identifier, so it must be
-- present for them — but admin/staff still log in by email and legitimately have none, which the
-- nullable column plus MySQL's "multiple NULLs allowed in a UNIQUE index" already permits.
-- Nothing to alter here; this comment records why no NOT NULL constraint was added.
