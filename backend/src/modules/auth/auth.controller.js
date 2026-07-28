import { ENV } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { changePasswordSchema, loginSchema, registerSchema } from './auth.schema.js';
import { changeUserPassword, getMe, loginUser, logoutUser, refreshTokens, registerCustomer } from './auth.service.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
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
