import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

/**
 * Signs a short-lived access token. The payload is assembled by
 * `auth.service.js` `buildAccessTokenPayload()` and carries the user id (`sub`), the transitional
 * global `role`, the `isSuperAdmin` flag, and the active `memberships` list.
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, { expiresIn: ENV.JWT_ACCESS_EXPIRES_IN });
}

/** Verifies an access token, throwing if invalid/expired. */
export function verifyAccessToken(token) {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET);
}

/** Generates a random opaque refresh token — never a JWT, so it carries no inspectable payload. */
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

/** Hashes a refresh token for storage — only the hash is persisted, never the raw token. */
export function hashRefreshToken(rawToken) {
  return crypto.createHmac('sha256', ENV.JWT_REFRESH_SECRET).update(rawToken).digest('hex');
}
