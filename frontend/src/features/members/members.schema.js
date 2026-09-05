import { z } from "zod"

/** Password policy — mirrors the backend (auth / users / businesses member schema). */
const passwordPolicy = z
  .string()
  .min(8, "Must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character")

/**
 * Add-member form (`POST /members`). Mirrors the backend `addMemberSchema`.
 *
 * `password` is optional here: the client can't know whether the email already belongs to a
 * user, and the backend only requires a password when it's a brand-new account. When the server
 * answers 400 "A password is required to create a new user account", the form surfaces that
 * inline on the password field.
 */
export const addMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(["admin", "staff"], { message: "Select a role" }),
  name: z.string().trim().max(100, "Too long").optional(),
  password: passwordPolicy.or(z.literal("")).optional(),
})
