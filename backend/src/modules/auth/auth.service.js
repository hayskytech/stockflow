import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ENV } from '../../config/env.js';
import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../../utils/jwt.js';
import { logger } from '../../utils/logger.js';
import { sendOtp as sendProviderOtp, verifyOtp as verifyProviderOtp } from '../../utils/msg91.js';
import { getPublicWarehouseInfo } from '../warehouse/warehouse.service.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Parses duration strings like "7d", "15m", "1h" into milliseconds for DB expiry calculation. */
export function parseDurationMs(duration) {
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

/**
 * The user shape every session-issuing endpoint returns. `profileComplete` is the one field the
 * client cannot infer: an OTP login can mint an account that owns nothing but a phone number, and
 * the storefront needs to know that before it lets the customer reach checkout.
 */
function toSessionUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profileComplete: Boolean(row.profile_completed_at),
  };
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
 * Same error for a wrong code, an expired code, a code for a different purpose, and a phone we
 * deliberately never sent to — none of those states may be distinguishable to the caller.
 * `details.code` says only "the code step failed", which the caller already knows; it exists so a
 * multi-step form can reopen that step without matching on the message text.
 */
const genericOtpError = () =>
  new AppError(400, 'Incorrect or expired code. Request a new one.', { code: 'OTP_INVALID' });

/** MSG91 wants the country code with no leading `+` (e.g. 919876543210). */
async function toProviderIdentifier(phone) {
  const { phoneCountryCode } = await getPublicWarehouseInfo();
  return `${phoneCountryCode.replace('+', '')}${phone}`;
}

/** Throttles OTP sends per phone number, independent of the per-IP route limiter — one phone
 *  must not be spammable with codes from a rotating set of addresses. */
async function assertSendQuotaAvailable(phone) {
  const windowStart = new Date(Date.now() - ENV.OTP_SEND_WINDOW_MINUTES * 60 * 1000);

  const [{ sends }] = await executeQuery(
    `SELECT COUNT(*) AS sends FROM otp_requests WHERE phone = ? AND created_at > ?`,
    [phone, windowStart],
  );

  if (sends >= ENV.OTP_MAX_SENDS_PER_PHONE) {
    throw new AppError(429, 'Too many codes requested. Please wait a few minutes and try again.');
  }
}

/**
 * Asks MSG91 to send a code and records the resulting `reqId` against `phone`. This binding is
 * what makes the code an authentication: the client only ever sends a phone number, and
 * verification resolves the `reqId` from our own row (see `consumeOtp`), so no request can
 * verify a code issued for one number and claim another.
 *
 * Every phone gets a code, registered or not. A verified number with no account behind it is a new
 * customer, not an error — `loginWithOtp` creates the account — so there is no longer an
 * "unregistered" state for this endpoint to leak, and nothing here needs to branch on whether an
 * account exists. Abuse is held off by `assertSendQuotaAvailable` plus the route's `otpLimiter`.
 */
export async function issueOtp(input, ip) {
  await assertSendQuotaAvailable(input.phone);

  const reqId = await sendProviderOtp(await toProviderIdentifier(input.phone));
  const expiresAt = new Date(Date.now() + ENV.OTP_TTL_MINUTES * 60 * 1000);

  await executeQuery(
    `INSERT INTO otp_requests (id, phone, provider_req_id, purpose, ip_address, expires_at)
     VALUES (UUID(), ?, ?, ?, ?, ?)`,
    [input.phone, reqId, input.purpose, ip, expiresAt],
  );
}

/**
 * Verifies `otp` against the most recent open request for this phone/purpose and marks that
 * request spent. Expiry and attempt caps belong to MSG91 — `expires_at` here is only a defensive
 * local ceiling, never the real clock.
 */
async function consumeOtp(phone, purpose, otp) {
  const [request] = await executeQuery(
    `SELECT id, provider_req_id FROM otp_requests
     WHERE phone = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, purpose],
  );

  // A missing row means "we never sent" — indistinguishable from a wrong code by design.
  const verified = request ? await verifyProviderOtp(request.provider_req_id, otp) : false;
  if (!verified) throw genericOtpError();

  await executeQuery(`UPDATE otp_requests SET consumed_at = NOW() WHERE id = ?`, [request.id]);
}

/** Looks up an account by the phone number it signs in with. */
async function findUserByPhone(phone) {
  const [user] = await executeQuery(
    `SELECT id, name, email, role, is_active, profile_completed_at FROM users WHERE phone = ?`,
    [phone],
  );
  return user;
}

/**
 * Creates the barest account there is: a phone number that has just proven itself, and nothing
 * else. Name, email and password stay NULL — which is precisely what `profile_completed_at IS NULL`
 * records — until the customer submits the profile form (`completeProfile`).
 *
 * Role is hard-coded to 'customer'. Nothing in an OTP verification could ever justify more, and
 * this runs on a public endpoint.
 */
async function createCustomerFromPhone(phone) {
  const id = crypto.randomUUID();

  try {
    await executeQuery(`INSERT INTO users (id, phone, role, is_active) VALUES (?, ?, 'customer', 1)`, [
      id,
      phone,
    ]);
  } catch (err) {
    // Two devices verifying codes for the same new number at once: the loser adopts the row the
    // winner just created rather than failing a login that was legitimately authenticated.
    if (err.code === 'ER_DUP_ENTRY') return findUserByPhone(phone);
    throw err;
  }

  logger.info({ userId: id }, 'Created a customer account from a verified phone number');

  return { id, name: null, email: null, role: 'customer', is_active: 1, profile_completed_at: null };
}

/**
 * Logs in with phone + OTP. The code is proof the caller holds the number, so everything happens
 * only after MSG91 confirms it — there is no password to compare and nothing to lock out locally
 * (MSG91 owns the attempt cap on its own code).
 *
 * A verified number nobody has claimed yet becomes a new customer here rather than an error: making
 * someone who has already proven they hold the number go away and "register first" would ask them
 * to prove the same thing twice. The profile is collected afterwards, from inside the session.
 */
export async function loginWithOtp(input, ip, userAgent) {
  await consumeOtp(input.phone, 'login', input.otp);

  const user = (await findUserByPhone(input.phone)) ?? (await createCustomerFromPhone(input.phone));

  // A deactivated account is never resurrected by signing in — only an admin re-enables it, or the
  // customer re-registers through the form (which is an explicit act of signing up again).
  if (!user.is_active) throw new AppError(403, 'Account is disabled. Contact your administrator.');

  await executeQuery(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`,
    [user.id],
  );

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = generateRefreshToken();

  await storeRefreshToken(user.id, hashRefreshToken(refreshToken), ip, userAgent);

  return { accessToken, refreshToken, user: toSessionUser(user) };
}

/**
 * Fills in the profile of an account that OTP login created with nothing but a phone number, and
 * doubles as the customer's own profile editor.
 *
 * The password is optional: such an account can always sign in with a code, so demanding one here
 * would put a remembered secret back into the one flow whose whole point is not having any.
 */
export async function completeProfile(userId, input) {
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null;

  try {
    await executeQuery(
      `UPDATE users
       SET name = ?, email = ?, business_name = ?, address = ?, town = ?, district = ?,
           state = ?, pincode = ?,
           password_hash = COALESCE(?, password_hash),
           profile_completed_at = NOW()
       WHERE id = ? AND is_active = 1`,
      [
        input.name,
        input.email,
        input.businessName || null,
        input.address,
        input.town,
        input.district,
        input.state,
        input.pincode,
        // COALESCE keeps whatever hash is already there when no new password was supplied, so this
        // stays one fixed statement instead of being assembled differently per request.
        passwordHash,
        userId,
      ],
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, 'Email is already registered');
    throw err;
  }

  // Throws 404 if the row was missing or deactivated, so a no-op UPDATE never reports success.
  return getMe(userId);
}

/**
 * Registers a new storefront customer and logs them in immediately.
 * Role is hard-coded to 'customer' — it is never taken from the request body,
 * so this public endpoint can never mint an admin/staff account.
 * The phone number must be OTP-verified first: no account is ever created for a number the
 * caller has not just proven they hold.
 */
export async function registerCustomer(input, ip, userAgent) {
  await consumeOtp(input.phone, 'register', input.otp);

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 12);

  const businessName = input.businessName || null;

  // A previously soft-deleted customer (deactivated by an admin) re-registering with the same
  // email or phone reactivates their old account instead of colliding on the unique indexes.
  const [inactiveMatch] = await executeQuery(
    `SELECT id FROM users WHERE (email = ? OR phone = ?) AND is_active = 0 AND role = 'customer'`,
    [input.email, input.phone],
  );

  try {
    if (inactiveMatch) {
      await executeQuery(
        `UPDATE users
         SET name = ?, email = ?, phone = ?, password_hash = ?, business_name = ?,
             address = ?, town = ?, district = ?, state = ?, pincode = ?,
             is_active = 1, failed_login_attempts = 0, locked_until = NULL,
             profile_completed_at = NOW()
         WHERE id = ?`,
        [
          input.name,
          input.email,
          input.phone,
          passwordHash,
          businessName,
          input.address,
          input.town,
          input.district,
          input.state,
          input.pincode,
          inactiveMatch.id,
        ],
      );
    } else {
      await executeQuery(
        `INSERT INTO users (id, name, email, phone, password_hash, role, business_name, address, town, district, state, pincode, is_active, profile_completed_at)
         VALUES (?, ?, ?, ?, ?, 'customer', ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [
          id,
          input.name,
          input.email,
          input.phone,
          passwordHash,
          businessName,
          input.address,
          input.town,
          input.district,
          input.state,
          input.pincode,
        ],
      );
    }
  } catch (err) {
    // Generic message intentionally — do not reveal registration state beyond "taken".
    if (err.code === 'ER_DUP_ENTRY') {
      const message = String(err.sqlMessage ?? '').includes('uq_users_phone')
        ? 'Phone number is already registered'
        : 'Email is already registered';
      throw new AppError(409, message);
    }
    throw err;
  }

  const finalId = inactiveMatch?.id ?? id;

  const accessToken = signAccessToken({ sub: finalId, role: 'customer' });
  const refreshToken = generateRefreshToken();

  await storeRefreshToken(finalId, hashRefreshToken(refreshToken), ip, userAgent);

  return {
    accessToken,
    refreshToken,
    user: {
      id: finalId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: 'customer',
      businessName,
      address: input.address,
      town: input.town,
      district: input.district,
      state: input.state,
      pincode: input.pincode,
      // This form collects the whole profile, so an account created through it is complete on
      // arrival — unlike one minted by an OTP login.
      profileComplete: true,
    },
  };
}

/**
 * Validates credentials, enforces account lockout, and issues tokens on success.
 * `identifier` is an email (how admin/staff sign in) or a phone number (customers, who may use
 * either this or the OTP path) — both columns are unique, so one lookup serves both.
 */
export async function loginUser(input, ip, userAgent) {
  const [user] = await executeQuery(
    `SELECT id, name, email, password_hash, role, is_active,
            failed_login_attempts, locked_until, profile_completed_at
     FROM users
     WHERE email = ? OR phone = ?`,
    [input.identifier, input.identifier],
  );

  // Generic message intentionally — do not reveal whether the account exists.
  if (!user) throw new AppError(401, 'Invalid credentials');

  // An account created by OTP login has no password at all until its owner chooses to set one.
  // There is nothing to compare against, and the same generic answer keeps that fact private.
  if (!user.password_hash) throw new AppError(401, 'Invalid credentials');

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

    throw new AppError(401, 'Invalid credentials');
  }

  await executeQuery(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`,
    [user.id],
  );

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = generateRefreshToken();

  await storeRefreshToken(user.id, hashRefreshToken(refreshToken), ip, userAgent);

  return { accessToken, refreshToken, user: toSessionUser(user) };
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
    `SELECT id, name, email, role, profile_completed_at FROM users WHERE id = ? AND is_active = 1`,
    [existing.user_id],
  );

  if (!user) throw new AppError(401, 'User account is no longer active');

  const accessToken = signAccessToken({ sub: existing.user_id, role: user.role });
  const newRefreshToken = generateRefreshToken();

  await storeRefreshToken(existing.user_id, hashRefreshToken(newRefreshToken), ip, userAgent);

  return { accessToken, refreshToken: newRefreshToken, user: toSessionUser(user) };
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
    `SELECT id, name, email, phone, role, business_name, address, town, district, state, pincode,
            is_active, profile_completed_at, last_login_at, created_at, updated_at
     FROM users
     WHERE id = ? AND is_active = 1`,
    [userId],
  );

  if (!user) throw new AppError(404, 'User not found');

  // Derived rather than raw so every endpoint that describes the current user agrees on one name
  // for it — the timestamp itself is of no use to a client.
  return { ...user, profileComplete: Boolean(user.profile_completed_at) };
}

/** Validates current password and sets a new one, clearing the forced-change flag. */
export async function changeUserPassword(userId, input) {
  const [user] = await executeQuery(`SELECT password_hash FROM users WHERE id = ?`, [userId]);

  if (!user) throw new AppError(404, 'User not found');

  // Nothing to change: this account signs in by OTP and has never had a password. Said plainly
  // because the caller is already authenticated as this very user — there is nothing to protect.
  if (!user.password_hash) {
    throw new AppError(400, 'This account has no password yet. Set one from your profile first.');
  }

  const currentValid = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!currentValid) throw new AppError(401, 'Current password is incorrect');

  const newHash = await bcrypt.hash(input.newPassword, 12);

  await executeQuery(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, userId]);
}
