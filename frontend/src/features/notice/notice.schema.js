import { z } from "zod"

export const noticeSchema = z.object({
  message: z.string().trim().max(500, "Too long").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
})
