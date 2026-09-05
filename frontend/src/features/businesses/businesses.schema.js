import { z } from "zod"

/** Password policy — mirrors the backend (auth / users / members). */
const passwordPolicy = z
  .string()
  .min(8, "Must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character")

/** URL-safe slug: lowercase words separated by single hyphens. */
const slugField = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens only")

/**
 * Create business (`POST /businesses`). Name is required; everything else optional.
 *
 * The optional "first admin" block is not hard-blocked when the email is given without a
 * password: the email may already belong to a user (no password needed). The server requires
 * a password only for a brand-new account and answers 400 — `BusinessesPage` surfaces that
 * message inline on the password field (same pattern as the per-business "Add member" form).
 */
export const createBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(150, "Too long"),
  slug: slugField.or(z.literal("")).optional(),
  initialAdminEmail: z.string().trim().email("Enter a valid email address").or(z.literal("")).optional(),
  initialAdminName: z.string().trim().max(100, "Too long").or(z.literal("")).optional(),
  initialAdminPassword: passwordPolicy.or(z.literal("")).optional(),
})

/** Edit business (`PUT /businesses/:id`) — every field optional. */
export const updateBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(150, "Too long").optional(),
  slug: slugField.optional(),
  isActive: z.boolean().optional(),
})
