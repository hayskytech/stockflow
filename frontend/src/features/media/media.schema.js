import { z } from "zod"

export const renameMediaSchema = z.object({
  originalName: z.string().trim().min(1, "File name is required").max(255, "File name is too long"),
})
