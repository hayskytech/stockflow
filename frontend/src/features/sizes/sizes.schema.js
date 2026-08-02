import { z } from "zod"

export const sizeSchema = z.object({
  value: z.string().trim().min(1, "Size is required").max(20, "Size is too long"),
  isActive: z.boolean().optional(),
})
