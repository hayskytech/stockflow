import { rateLimit } from 'express-rate-limit';
import { ENV } from '../config/env.js';

/** Applied to all routes — protects against general abuse. */
export const generalLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

/** Applied only to auth routes — much stricter to slow down brute force attacks. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

/** Applied only to POST /auth/otp/send — every call spends a real SMS, so it is tighter than
 *  authLimiter. Complements the per-phone quota enforced in auth.service.js. */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many codes requested, please try again later' },
});

/** Applied only to POST /orders — stock-affecting and state-mutating, so tighter than generalLimiter. */
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many orders placed, please try again later' },
});
