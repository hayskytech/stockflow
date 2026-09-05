-- =============================================================================
-- 07_refresh_token_replaced_by.sql
-- Engine: MariaDB 10.4+ / MySQL 8.0.19+
--
-- Multi-tab silent-refresh hardening (plan §3.2).
--
-- When two browser tabs share one refresh cookie, both POST /auth/refresh and the
-- slower one presents a token the faster one just rotated away. Without a way to
-- tell that apart from a stolen token being replayed, the app revokes every
-- session for the user. `replaced_by` records the successor of each rotated token
-- so refreshTokens() can recognise a benign multi-tab double-refresh (re-issue
-- from the successor chain, within a short grace window) and leave other sessions
-- alone. Outside the window, or if the successor is also gone, it is still
-- treated as token theft.
--
-- Runnable against an already-provisioned DB. A fresh install gets this from
-- 01_schema.sql directly.
-- =============================================================================

ALTER TABLE refresh_tokens
  ADD COLUMN replaced_by CHAR(36) NULL
    COMMENT 'Successor refresh_tokens.id set on rotation - drives the multi-tab refresh grace window'
    AFTER revoked_at,
  ADD KEY idx_refresh_tokens_replaced_by (replaced_by);
