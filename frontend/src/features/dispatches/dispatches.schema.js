import { z } from "zod"

/** Courier/AWB/note fields on the dispatch page — all optional, must mirror the backend createDispatchSchema. */
export const dispatchDetailsSchema = z.object({
  courierName: z.string().trim().max(100, "Courier name must be 100 characters or less"),
  awbNumber: z.string().trim().max(100, "AWB number must be 100 characters or less"),
  note: z.string().trim().max(500, "Note must be 500 characters or less"),
})
