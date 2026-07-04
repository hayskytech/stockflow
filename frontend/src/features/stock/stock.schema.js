import { z } from "zod"

const ALLOWED_EXTENSIONS = [".xlsx", ".csv"]

export const stockImportSchema = z.object({
  file: z
    .instanceof(File, { message: "Please choose a file" })
    .refine(
      (file) => ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
      "Only .xlsx or .csv files are allowed"
    ),
})
