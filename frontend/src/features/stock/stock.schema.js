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

/** Add-stock form — mirrors the backend createStockSchema. */
export const createStockSchema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    quantity: z.coerce
      .number({ invalid_type_error: "Quantity must be a number" })
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1")
      .max(10000, "Quantity cannot exceed 10000"),
    invoiceNo: z.string().trim().min(1, "Invoice number is required").max(100, "Invoice number must be 100 characters or less"),
    invoiceDate: z.string(),
    price: z.coerce.number({ invalid_type_error: "Price must be a number" }).min(0, "Price must be ≥ 0"),
    discountPercent: z.coerce
      .number({ invalid_type_error: "Discount must be a number" })
      .min(0, "Discount must be ≥ 0")
      .max(100, "Discount must be ≤ 100"),
    size: z.string().trim().max(20, "Size must be 20 characters or less"),
    note: z.string().trim().max(500, "Note must be 500 characters or less"),
  })
  .refine((value) => !value.invoiceDate || value.invoiceDate <= new Date().toISOString().slice(0, 10), {
    message: "Invoice date cannot be in the future",
    path: ["invoiceDate"],
  })
