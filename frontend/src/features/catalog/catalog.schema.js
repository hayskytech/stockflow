import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  isActive: z.boolean().optional(),
})

export const subCategorySchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  isActive: z.boolean().optional(),
})
