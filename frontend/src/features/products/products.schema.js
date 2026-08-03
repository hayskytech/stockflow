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
const discountPercent = z
  .number({ invalid_type_error: "Must be a number" })
  .min(0, "Must be zero or greater")
  .max(100, "Must be 100 or less")
const piecesPerSet = z.coerce
  .number({ invalid_type_error: "Must be a number" })
  .int("Must be a whole number")
  .min(1, "Must be at least 1")
  .max(100, "Must be 100 or less")

/** Optional first stock batch, created in the same request as the product. */
const initialStockSchema = z.object({
  addStock: z.boolean(),
  quantity: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce
      .number({ invalid_type_error: "Quantity must be a number" })
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1")
      .max(10000, "Quantity cannot exceed 10000")
      .optional()
  ),
  invoiceNo: z.string().trim().max(100, "Too long").optional(),
  invoiceDate: z.string().optional(),
  note: z.string().trim().max(500, "Too long").optional(),
})

export const productSchema = z
  .object({
    productCode: z.string().trim().min(1, "Product code is required").max(50, "Too long"),
    categoryId: z.string().min(1, "Category is required"),
    subCategoryId: z.string().optional().or(z.literal("")),
    name: z.string().trim().min(1, "Name is required").max(150, "Too long"),
    description: z.string().trim().max(500, "Too long").optional().or(z.literal("")),
    color: z.string().trim().max(50, "Too long").optional().or(z.literal("")),
    size: z.string().trim().max(20, "Too long").optional().or(z.literal("")),
    piecesPerSet,
    price: money,
    discountPercent,
    reorderLevel: nonNegativeInt,
    productPhotoMediaId: z.string().optional().nullable(),
    galleryMediaIds: z.array(z.string()).max(5, "Maximum 5 gallery images allowed").optional(),
    isActive: z.boolean().optional(),
    initialStock: initialStockSchema,
  })
  .refine((data) => !data.initialStock.addStock || data.initialStock.quantity > 0, {
    message: "Quantity is required",
    path: ["initialStock", "quantity"],
  })
  .refine((data) => !data.initialStock.addStock || data.initialStock.invoiceNo?.trim(), {
    message: "Invoice number is required",
    path: ["initialStock", "invoiceNo"],
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
