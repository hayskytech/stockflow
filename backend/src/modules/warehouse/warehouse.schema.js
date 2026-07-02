import { z } from 'zod';

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, 'Too long')
    .optional()
    .or(z.literal(''));

/** PUT /api/warehouse — all fields optional, but at least one must be present */
export const updateWarehouseSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(150, 'Name is too long').optional(),
    address: optionalText(500),
    phone: optionalText(20),
    email: z.string().trim().email('Invalid email').max(150, 'Too long').optional().or(z.literal('')),
    bankName: optionalText(150),
    accountHolderName: optionalText(150),
    accountNumber: optionalText(30),
    ifscCode: optionalText(15),
    upiId: optionalText(100),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });
