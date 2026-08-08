import { z } from 'zod';

/** Local phone digits without the country code — the app-wide length is admin-configurable
 *  (warehouse.phone_number_length), so this only enforces a plausible digits-only range. */
const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9]{6,15}$/, 'Enter a valid phone number');

/** MSG91's widget decides the code length in its dashboard (4 or 6 are both common), so this
 *  deliberately accepts a range rather than pinning a length the dashboard could change. */
const otpField = z
  .string()
  .trim()
  .regex(/^[0-9]{4,8}$/, 'Enter the code sent to your phone');

/**
 * Validates the request body for POST /api/auth/login.
 * `identifier` is an email (admin/staff) or a phone number (customers) — both roles share one
 * password endpoint, so the service resolves whichever column matches.
 */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

/** Validates the request body for POST /api/auth/otp/send. */
export const sendOtpSchema = z.object({
  phone: phoneField,
  purpose: z.enum(['login', 'register'], { message: 'Invalid purpose' }),
});

/** Validates the request body for POST /api/auth/otp/login. */
export const otpLoginSchema = z.object({
  phone: phoneField,
  otp: otpField,
});

/** Password policy shared by registration and change-password. */
const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Validates the request body for POST /api/auth/register (public customer self-signup).
 * `otp` is mandatory — an account is only ever created for a phone number the caller has just
 * proven they hold.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  phone: phoneField,
  otp: otpField,
  businessName: z.string().trim().max(150, 'Business name is too long').optional(),
  address: z.string().trim().min(1, 'Address is required').max(255, 'Address is too long'),
  town: z.string().trim().min(1, 'Town is required').max(100, 'Town is too long'),
  district: z.string().trim().min(1, 'District is required').max(100, 'District is too long'),
  state: z.string().trim().min(1, 'State is required').max(100, 'State is too long'),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a valid 6-digit pincode'),
  password: passwordPolicy,
});

/**
 * Validates the request body for POST /api/auth/complete-profile.
 * Same profile fields as registration, minus the ones the session already settles: the phone is
 * whatever the account was created with and is not editable here, and `password` is optional —
 * an OTP-created account can always sign in with a code, so it never needs one.
 */
export const completeProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().trim().max(150, 'Business name is too long').optional(),
  address: z.string().trim().min(1, 'Address is required').max(255, 'Address is too long'),
  town: z.string().trim().min(1, 'Town is required').max(100, 'Town is too long'),
  district: z.string().trim().min(1, 'District is required').max(100, 'District is too long'),
  state: z.string().trim().min(1, 'State is required').max(100, 'State is too long'),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a valid 6-digit pincode'),
  // An empty string is the "leave it passwordless" answer a form naturally sends for an untouched
  // optional field; anything non-empty must satisfy the full policy.
  password: passwordPolicy.or(z.literal('')).optional(),
});

/** Validates the request body for POST /api/auth/change-password (voluntary, self-service). */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordPolicy,
});
