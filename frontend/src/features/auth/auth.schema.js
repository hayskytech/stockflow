import { z } from "zod"

/** Local phone digits without the country code — the app-wide length is admin-configurable
 *  (Warehouse > App Settings), so this only enforces a plausible digits-only range. */
const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9]{6,15}$/, "Enter a valid phone number")

/** MSG91's widget decides the code length in its dashboard (4 and 6 are both common), so this
 *  accepts a range rather than pinning a length the dashboard could change under us. */
const otpField = z
  .string()
  .trim()
  .regex(/^[0-9]{4,8}$/, "Enter the code sent to your phone")

/** Password sign-in — `identifier` is an email (admin/staff) or a phone number (customers). */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
})

/** Passwordless sign-in with a code texted to the phone. */
export const otpLoginSchema = z.object({
  phone: phoneField,
  otp: otpField,
})

/** The phone-only first step of any OTP flow, validated before a code is requested. */
export const requestOtpSchema = z.object({
  phone: phoneField,
})

/** The code-only second step. Only the shape can be checked here — MSG91 alone can say whether a
 *  code is right, and asking it spends the code, so that happens on the final submit. */
export const otpCodeSchema = z.object({
  otp: otpField,
})

/** Password policy shared by registration and change-password — mirrors the backend. */
const passwordPolicy = z
  .string()
  .min(8, "Must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character")

/** `otp` is mandatory — an account is only created for a phone number just proven by a code. */
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Too long"),
  email: z.string().email("Enter a valid email address"),
  phone: phoneField,
  otp: otpField,
  businessName: z.string().trim().max(150, "Too long").optional(),
  address: z.string().trim().min(1, "Address is required").max(255, "Too long"),
  town: z.string().trim().min(1, "Town is required").max(100, "Too long"),
  district: z.string().trim().min(1, "District is required").max(100, "Too long"),
  state: z.string().trim().min(1, "State is required").max(100, "Too long"),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode"),
  password: passwordPolicy,
})

/**
 * The profile an OTP-created account owes us. Mirrors the backend's `completeProfileSchema`:
 * no phone (the session already fixes it) and an optional password, since such an account can
 * always sign in with a code and never needs one.
 */
export const completeProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Too long"),
  email: z.string().email("Enter a valid email address"),
  businessName: z.string().trim().max(150, "Too long").optional(),
  address: z.string().trim().min(1, "Address is required").max(255, "Too long"),
  town: z.string().trim().min(1, "Town is required").max(100, "Too long"),
  district: z.string().trim().min(1, "District is required").max(100, "Too long"),
  state: z.string().trim().min(1, "State is required").max(100, "Too long"),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode"),
  // Empty means "stay passwordless" — the untouched state of an optional field. Anything typed
  // has to satisfy the full policy.
  password: passwordPolicy.or(z.literal("")).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordPolicy,
})
