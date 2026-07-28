import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

/** Password policy shared by registration and forced password change — mirrors the backend. */
const passwordPolicy = z
  .string()
  .min(8, "Must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character")

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Too long"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Enter a valid 10-digit phone number"),
  businessName: z.string().trim().max(150, "Too long").optional(),
  address: z.string().trim().min(1, "Address is required").max(255, "Too long"),
  town: z.string().trim().min(1, "Town is required").max(100, "Too long"),
  district: z.string().trim().min(1, "District is required").max(100, "Too long"),
  state: z.string().trim().min(1, "State is required").max(100, "Too long"),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode"),
  password: passwordPolicy,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordPolicy,
})
