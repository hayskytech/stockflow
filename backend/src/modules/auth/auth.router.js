import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter.js';
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

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
// Sending costs a real SMS per call, so it sits behind its own tighter limiter (the service
// additionally throttles per phone number, which a rotating IP cannot bypass).
authRouter.post('/otp/send', otpLimiter, sendOtp);
authRouter.post('/otp/login', authLimiter, otpLogin);
authRouter.post('/refresh', authLimiter, refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
authRouter.post('/complete-profile', authLimiter, authenticate, completeProfile);
authRouter.post('/change-password', authLimiter, authenticate, changePassword);
