import { z } from "zod"

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100, "Too long"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone number"),
  addressLine1: z.string().trim().min(3, "Address is required").max(200, "Too long"),
  addressLine2: z.string().trim().max(200, "Too long").optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(100, "Too long"),
  state: z.string().trim().min(2, "State is required").max(100, "Too long"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  // Same bounds as backend/src/modules/orders/orders.schema.js — client/server validation must agree.
  transactionId: z.string().trim().min(6, "Enter a valid transaction id").max(100, "Too long"),
  notes: z.string().trim().max(500, "Too long").optional().or(z.literal("")),
})
