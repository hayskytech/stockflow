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

/** Scan-session header form — mirrors the backend scanImportSchema (minus the barcodes array). */
export const scanSessionSchema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    invoiceNo: z.string().trim().min(1, "Invoice number is required").max(100, "Invoice number must be 100 characters or less"),
    invoiceDate: z.string(),
    mrp: z.coerce.number({ invalid_type_error: "MRP must be a number" }).min(0, "MRP must be ≥ 0"),
    wsp: z.coerce.number({ invalid_type_error: "WSP must be a number" }).min(0, "WSP must be ≥ 0"),
    size: z.string().trim().max(20, "Size must be 20 characters or less"),
    note: z.string().trim().max(500, "Note must be 500 characters or less"),
  })
  .refine((value) => value.wsp <= value.mrp, { message: "WSP cannot be greater than MRP", path: ["wsp"] })
