import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter.js';
import { storefrontEnabled } from '../../middleware/storefrontEnabled.js';
import {
  changePassword,
  completeProfile,
  login,
  logout,
  me,
  otpLogin,
  refresh,
  register,
  sendOtp,
} from './auth.controller.js';

export const authRouter = Router();

// Customer-facing auth routes are gated by storefrontEnabled (first, before limiters/auth) —
// multi-tenant migration Phase 1. Admin/staff sign in via POST /login, which stays open.
authRouter.post('/register', storefrontEnabled, authLimiter, register);
authRouter.post('/login', authLimiter, login);
// Sending costs a real SMS per call, so it sits behind its own tighter limiter (the service
// additionally throttles per phone number, which a rotating IP cannot bypass).
authRouter.post('/otp/send', storefrontEnabled, otpLimiter, sendOtp);
authRouter.post('/otp/login', storefrontEnabled, authLimiter, otpLogin);
authRouter.post('/refresh', authLimiter, refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
authRouter.post('/complete-profile', storefrontEnabled, authLimiter, authenticate, completeProfile);
authRouter.post('/change-password', authLimiter, authenticate, changePassword);
