/** Reads a required env var — crashes at startup if missing rather than failing silently at runtime. */
function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/** Reads an optional env var with a fallback default. */
function optional(key, defaultValue) {
  return process.env[key] ?? defaultValue;
}

export const ENV = {
  // No default: NODE_ENV governs three separate production-sensitive behaviors (the delete-all-data
  // dev-only gate, the refresh-cookie `secure` flag, and CORS's private-origin allowance), so an
  // operator forgetting to set it must crash the app at boot rather than silently reopen all three.
  // Both documented environments already set it explicitly: `backend/.env.example` ships
  // `NODE_ENV=development` for local `npm run dev`/`npm start` (loaded via `--env-file=.env`), and
  // `deployment_guide.md` documents `NODE_ENV=production` as a required line in the server's `.env`.
  NODE_ENV: required('NODE_ENV'),
  APP_PORT: parseInt(optional('APP_PORT', '4000'), 10),
  APP_NAME: optional('APP_NAME', 'StockFlow'),
  FRONTEND_URL: optional('FRONTEND_URL', ''),

  DB_HOST: required('DB_HOST'),
  DB_PORT: parseInt(optional('DB_PORT', '3306'), 10),
  DB_NAME: required('DB_NAME'),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: optional('DB_PASSWORD', ''),
  DB_POOL_LIMIT: parseInt(optional('DB_POOL_LIMIT', '10'), 10),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  CORS_ALLOWED_ORIGINS: required('CORS_ALLOWED_ORIGINS'),

  // MSG91 OTP widget, driven entirely server-side — see utils/msg91.js.
  // MSG91_SEND_PATH must match the widget's dashboard configuration: `sendOtp` for a `web`
  // widget with Captcha Validation OFF, `sendOtpMobile` for a `Mobile` widget. Nothing in the
  // widget id reveals which it is — verify with `npm run msg91:check -- 919876543210`.
  MSG91_AUTH_KEY: required('MSG91_AUTH_KEY'),
  MSG91_WIDGET_ID: required('MSG91_WIDGET_ID'),
  MSG91_SEND_PATH: optional('MSG91_SEND_PATH', 'sendOtp'),

  // Defensive ceiling on how long a `reqId` stays usable. MSG91 owns the real expiry — this only
  // stops an ancient row from being verified against long after the user moved on.
  OTP_TTL_MINUTES: parseInt(optional('OTP_TTL_MINUTES', '10'), 10),
  OTP_MAX_SENDS_PER_PHONE: parseInt(optional('OTP_MAX_SENDS_PER_PHONE', '5'), 10),
  OTP_SEND_WINDOW_MINUTES: parseInt(optional('OTP_SEND_WINDOW_MINUTES', '15'), 10),

  RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
  // Must stay strictly lower than RATE_LIMIT_MAX so authLimiter (login/refresh/change-password)
  // actually binds before generalLimiter — both limiters run independently and count concurrently,
  // so whichever cap is lower is the one that ever triggers.
  RATE_LIMIT_AUTH_MAX: parseInt(optional('RATE_LIMIT_AUTH_MAX', '20'), 10),

  MEDIA_UPLOAD_DIR: optional('MEDIA_UPLOAD_DIR', 'uploads/media'),
  MEDIA_PUBLIC_PATH: optional('MEDIA_PUBLIC_PATH', '/media-files'),
  MEDIA_MAX_UPLOAD_MB: parseInt(optional('MEDIA_MAX_UPLOAD_MB', '15'), 10),
  MEDIA_MAX_BYTES: parseInt(optional('MEDIA_MAX_BYTES', '512000'), 10),
  MEDIA_ORPHAN_TTL_HOURS: parseInt(optional('MEDIA_ORPHAN_TTL_HOURS', '24'), 10),

  STOCK_IMPORT_MAX_MB: parseInt(optional('STOCK_IMPORT_MAX_MB', '10'), 10),
};
