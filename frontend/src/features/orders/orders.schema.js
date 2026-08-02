import { z } from "zod"

// Same regexes as the backend orders.schema.js — client/server validation must agree.
const phoneField = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone number")
const pincodeField = z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode")

const orderItemSchema = z.object({
  productId: z.string().uuid("Choose a product"),
  quantity: z.coerce.number().int("Quantity must be a whole number").positive("Quantity must be at least 1"),
})

/** Manual order form (back-office) — mirrors the backend createOrderSchema. */
export const manualOrderSchema = z
  .object({
    requestedFor: z.string().uuid("Choose the customer this order is for"),
    items: z.array(orderItemSchema).min(1, "Add at least one item"),
    allowBackorder: z.boolean(),
    paymentMethod: z.enum(["offline", "bank_transfer"]),
    transactionId: z.string().trim(),
    shippingName: z.string().trim().min(2, "Full name is required").max(100, "Too long"),
    shippingPhone: phoneField,
    shippingAddressLine1: z.string().trim().min(3, "Address is required").max(200, "Too long"),
    shippingAddressLine2: z.string().trim().max(200, "Too long"),
    shippingCity: z.string().trim().min(2, "City is required").max(100, "Too long"),
    shippingState: z.string().trim().min(2, "State is required").max(100, "Too long"),
    shippingPincode: pincodeField,
    notes: z.string().trim().max(500, "Too long"),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "bank_transfer" && data.transactionId.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transactionId"],
        message: "Enter a valid transaction id",
      })
    }
  })
