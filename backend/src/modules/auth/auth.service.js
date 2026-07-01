import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ENV } from '../../config/env.js';
import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../../utils/jwt.js';
import { logger } from '../../utils/logger.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Parses duration strings like "7d", "15m", "1h" into milliseconds for DB expiry calculation. */
function parseDurationMs(duration) {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      throw new AppError(500, `Unknown duration unit in JWT_REFRESH_EXPIRES_IN: ${unit}`);
  }
}

/** Stores a new refresh token hash in the DB — used after login and after token rotation. */
async function storeRefreshToken(userId, tokenHash, ip, userAgent) {
  const expiresAt = new Date(Date.now() + parseDurationMs(ENV.JWT_REFRESH_EXPIRES_IN));
  await executeQuery(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at)
     VALUES (UUID(), ?, ?, ?, ?, ?)`,
    [userId, tokenHash, userAgent, ip, expiresAt],
  );
}

/**
 * Registers a new storefront customer and logs them in immediately.
 * Role is hard-coded to 'customer' — it is never taken from the request body,
 * so this public endpoint can never mint an admin/staff account.
 */
export async function registerCustomer(input, ip, userAgent) {
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    await executeQuery(
      `INSERT INTO users (id, name, email, password_hash, role, is_active, must_change_password)
       VALUES (?, ?, ?, ?, 'customer', 1, 0)`,
      [id, input.name, input.email, passwordHash],
    );
  } catch (err) {
    // Generic message intentionally — do not reveal registration state beyond "taken".
    if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, 'Email is already registered');
    throw err;
  }

  const accessToken = signAccessToken({ sub: id, role: 'customer' });
  const refreshToken = generateRefreshToken();

  await storeRefreshToken(id, hashRefreshToken(refreshToken), ip, userAgent);

  return {
    accessToken,
    refreshToken,
    user: {
      id,
      name: input.name,
      email: input.email,
      role: 'customer',
      mustChangePassword: false,
    },
  };
}

/** Validates credentials, enforces account lockout, and issues tokens on success. */
export async function loginUser(input, ip, userAgent) {
  const [user] = await executeQuery(
    `SELECT id, name, email, password_hash, role, is_active, must_change_password,
            failed_login_attempts, locked_until
     FROM users
     WHERE email = ?`,
    [input.email],
  );

  // Generic message intentionally — do not reveal whether the email exists.
  if (!user) throw new AppError(401, 'Invalid email or password');

  if (!user.is_active) throw new AppError(403, 'Account is disabled. Contact your administrator.');

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remainingMs = new Date(user.locked_until).getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new AppError(429, `Account locked. Try again in ${remainingMin} minute(s).`);
  }

  const passwordValid = await bcrypt.compare(input.password, user.password_hash);

  if (!passwordValid) {
    const newAttempts = user.failed_login_attempts + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
    const lockUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    await executeQuery(`UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`, [
      newAttempts,
      lockUntil,
      user.id,
    ]);

    throw new AppError(401, 'Invalid email or password');
  }

  await executeQuery(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`,
    [user.id],
  );

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = generateRefreshToken();

  await storeRefreshToken(user.id, hashRefreshToken(refreshToken), ip, userAgent);

  const mustChangePassword = user.must_change_password === 1;

  return {
    accessToken,
    refreshToken,
    mustChangePassword,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword,
    },
  };
}

/**
 * Rotates refresh tokens on every use.
 * If a revoked token is replayed, all sessions are wiped — this indicates token theft.
 */
export async function refreshTokens(rawToken, ip, userAgent) {
  const tokenHash = hashRefreshToken(rawToken);

  const [existing] = await executeQuery(
    `SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = ?`,
    [tokenHash],
  );

  if (!existing) throw new AppError(401, 'Invalid refresh token');

  if (existing.revoked_at) {
    logger.warn({ userId: existing.user_id }, 'Refresh token reuse detected — revoking all sessions');
    await executeQuery(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, [
      existing.user_id,
    ]);
    throw new AppError(401, 'Refresh token already used');
  }

  if (new Date(existing.expires_at) < new Date()) {
    throw new AppError(401, 'Refresh token expired');
  }

  // Revoke the consumed token before issuing the new pair.
  await executeQuery(`UPDATE refresh_tokens SET revoked_at = NOW(), last_used_at = NOW() WHERE id = ?`, [
    existing.id,
  ]);

  const [user] = await executeQuery(
    `SELECT id, name, email, role, must_change_password FROM users WHERE id = ? AND is_active = 1`,
    [existing.user_id],
  );

  if (!user) throw new AppError(401, 'User account is no longer active');

  const accessToken = signAccessToken({ sub: existing.user_id, role: user.role });
  const newRefreshToken = generateRefreshToken();

  await storeRefreshToken(existing.user_id, hashRefreshToken(newRefreshToken), ip, userAgent);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.must_change_password === 1,
    },
  };
}

/** Revokes the refresh token cookie so it cannot be replayed after logout. */
export async function logoutUser(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);
  await executeQuery(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL`, [
    tokenHash,
  ]);
}

/** Returns the authenticated user's profile, excluding all sensitive fields. */
export async function getMe(userId) {
  const [user] = await executeQuery(
    `SELECT id, name, email, role, is_active, must_change_password, last_login_at, created_at, updated_at
     FROM users
     WHERE id = ? AND is_active = 1`,
    [userId],
  );

  if (!user) throw new AppError(404, 'User not found');

  return user;
}

/** Validates current password and sets a new one, clearing the forced-change flag. */
export async function changeUserPassword(userId, input) {
  const [user] = await executeQuery(`SELECT password_hash FROM users WHERE id = ?`, [userId]);

  if (!user) throw new AppError(404, 'User not found');

  const currentValid = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!currentValid) throw new AppError(401, 'Current password is incorrect');

  const newHash = await bcrypt.hash(input.newPassword, 12);

  await executeQuery(`UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`, [
    newHash,
    userId,
  ]);
}
