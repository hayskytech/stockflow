import { z } from "zod"

const money = z
  .number({ invalid_type_error: "Must be a number" })
  .nonnegative("Must be zero or greater")
  .max(10000000, "Must be 1,00,00,000 or less")
const nonNegativeInt = z
  .number({ invalid_type_error: "Must be a number" })
  .int("Must be a whole number")
  .nonnegative("Must be zero or greater")
  .max(100000, "Must be 1,00,000 or less")

export const productSchema = z
  .object({
    productCode: z.string().trim().min(1, "Product code is required").max(50, "Too long"),
    categoryId: z.string().min(1, "Category is required"),
    subCategoryId: z.string().optional().or(z.literal("")),
    name: z.string().trim().min(1, "Name is required").max(150, "Too long"),
    description: z.string().trim().max(500, "Too long").optional().or(z.literal("")),
    color: z.string().trim().max(50, "Too long").optional().or(z.literal("")),
    size: z.string().trim().max(10, "Too long").optional().or(z.literal("")),
    mrp: money,
    wsp: money,
    reorderLevel: nonNegativeInt,
    unit: z.string().trim().min(1, "Required").max(20, "Too long"),
    productPhotoMediaId: z.string().optional().nullable(),
    galleryMediaIds: z.array(z.string()).max(5, "Maximum 5 gallery images allowed").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.wsp <= data.mrp, {
    message: "WSP cannot be greater than MRP",
    path: ["wsp"],
  })

const IMPORT_EXTENSIONS = [".xlsx", ".csv"]

export const productImportSchema = z.object({
  file: z
    .instanceof(File, { message: "Please choose a file" })
    .refine(
      (file) => IMPORT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
      "Only .xlsx or .csv files are allowed"
    ),
})
