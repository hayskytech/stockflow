import { z } from 'zod';

/** Validates the request body for POST /api/auth/login. */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/** Password policy shared by registration and forced password change. */
const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/** Validates the request body for POST /api/auth/register (public customer self-signup). */
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Enter a valid 10-digit phone number'),
  businessName: z.string().trim().max(150, 'Business name is too long').optional(),
  address: z.string().trim().min(1, 'Address is required').max(255, 'Address is too long'),
  town: z.string().trim().min(1, 'Town is required').max(100, 'Town is too long'),
  district: z.string().trim().min(1, 'District is required').max(100, 'District is too long'),
  state: z.string().trim().min(1, 'State is required').max(100, 'State is too long'),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a valid 6-digit pincode'),
  password: passwordPolicy,
});

/** Validates the request body for POST /api/auth/change-password (forced on first login). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordPolicy,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
