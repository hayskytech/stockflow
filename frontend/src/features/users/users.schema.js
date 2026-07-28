import { z } from "zod"

const roleField = z.enum(["admin", "staff", "customer"], { message: "Select a role" })

/** Password policy — mirrors the backend users/auth rules. */
const passwordPolicy = z
  .string()
  .min(8, "Must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character")

// Same optional profile fields collected at self-registration — kept optional here since
// they're only meaningful for the `customer` role (admin/staff have no shipping address).
const profileFields = {
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Enter a valid 10-digit phone number").or(z.literal("")).optional(),
  businessName: z.string().trim().max(150, "Too long").optional(),
  address: z.string().trim().max(255, "Too long").optional(),
  town: z.string().trim().max(100, "Too long").optional(),
  district: z.string().trim().max(100, "Too long").optional(),
  state: z.string().trim().max(100, "Too long").optional(),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode").or(z.literal("")).optional(),
}

/** New user — a permanent password, set by the admin, is required. */
export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Too long"),
  email: z.string().email("Enter a valid email address"),
  role: roleField,
  password: passwordPolicy,
  isActive: z.boolean().optional(),
  ...profileFields,
})

/** Edit user — password is optional; a blank value leaves the current password unchanged. */
export const editUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Too long"),
  email: z.string().email("Enter a valid email address"),
  role: roleField,
  password: passwordPolicy.or(z.literal("")).optional(),
  isActive: z.boolean().optional(),
  ...profileFields,
})
