import { ENV } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  changePasswordSchema,
  completeProfileSchema,
  loginSchema,
  otpLoginSchema,
  registerSchema,
  sendOtpSchema,
} from './auth.schema.js';
import {
  changeUserPassword,
  completeProfile as completeUserProfile,
  getMe,
  issueOtp,
  loginUser,
  loginWithOtp,
  logoutUser,
  parseDurationMs,
  refreshTokens,
  registerCustomer,
} from './auth.service.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

// maxAge is derived from the same JWT_REFRESH_EXPIRES_IN env var auth.service.js uses to compute
// refresh_tokens.expires_at, so the cookie's browser-side lifetime never drifts from the token's
// server-side validity window if that env var is ever changed from its default.
const cookieOptions = {
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: parseDurationMs(ENV.JWT_REFRESH_EXPIRES_IN),
};

/** POST /api/auth/register — public customer self-signup, auto-logs in on success. */
export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const result = await registerCustomer(parsed.data, ip, userAgent);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, cookieOptions);
    res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login */
export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const result = await loginUser(parsed.data, ip, userAgent);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, cookieOptions);
    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/otp/send — asks MSG91 to text a code to the given phone.
 * Always 204, whether or not a code was actually sent, so the response can never be used to
 * discover which numbers have an account.
 */
export async function sendOtp(req, res, next) {
  try {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    await issueOtp(parsed.data, req.ip ?? '');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/otp/login — exchanges a phone + OTP for a session. */
export async function otpLogin(req, res, next) {
  try {
    const parsed = otpLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const result = await loginWithOtp(parsed.data, ip, userAgent);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, cookieOptions);
    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/refresh */
export async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!rawToken) throw new AppError(401, 'No refresh token provided');

    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const tokens = await refreshTokens(rawToken, ip, userAgent);

    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, cookieOptions);
    res.status(200).json({ accessToken: tokens.accessToken, user: tokens.user });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
export async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (rawToken) {
      await logoutUser(rawToken);
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: 'strict',
      secure: ENV.NODE_ENV === 'production',
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/me */
export async function me(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const user = await getMe(req.user.sub);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/complete-profile — fills in the profile of an account OTP login created from a
 * bare phone number. Returns the refreshed profile so the client can drop its incomplete copy.
 */
export async function completeProfile(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const parsed = completeProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const user = await completeUserProfile(req.user.sub, parsed.data);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/change-password */
export async function changePassword(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    await changeUserPassword(req.user.sub, parsed.data);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
