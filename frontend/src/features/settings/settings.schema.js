import { z } from "zod"

const optionalUrl = z.string().trim().max(255, "Too long").url("Must be a valid URL").optional().or(z.literal(""))

export const socialLinksSchema = z.object({
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  whatsappUrl: optionalUrl,
})

const optionalMediaId = z.string().uuid("Invalid id").optional().or(z.literal(""))

export const siteBrandingSchema = z.object({
  logoMediaId: optionalMediaId,
  faviconMediaId: optionalMediaId,
})
