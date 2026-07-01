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
  NODE_ENV: optional('NODE_ENV', 'development'),
  APP_PORT: parseInt(optional('APP_PORT', '4000'), 10),
  APP_NAME: optional('APP_NAME', 'StockFlow'),
  FRONTEND_URL: required('FRONTEND_URL'),

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

  RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),

  MEDIA_UPLOAD_DIR: optional('MEDIA_UPLOAD_DIR', 'uploads/media'),
  MEDIA_PUBLIC_PATH: optional('MEDIA_PUBLIC_PATH', '/media-files'),
  MEDIA_MAX_UPLOAD_MB: parseInt(optional('MEDIA_MAX_UPLOAD_MB', '15'), 10),
  MEDIA_MAX_BYTES: parseInt(optional('MEDIA_MAX_BYTES', '512000'), 10),
  MEDIA_ORPHAN_TTL_HOURS: parseInt(optional('MEDIA_ORPHAN_TTL_HOURS', '24'), 10),
};
