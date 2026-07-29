import { z } from "zod"

export const heroSlideSchema = z.object({
  mediaId: z.string().min(1, "An image is required"),
  linkUrl: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .max(500, "Too long")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional(),
})
