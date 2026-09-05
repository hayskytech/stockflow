import { z } from 'zod';

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, 'Too long')
    .optional()
    .or(z.literal(''));

/** PUT /api/b/:businessId/business-settings — all fields optional, but at least one must be present */
export const updateBusinessSettingsSchema = z
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
    phoneCountryCode: z
      .string()
      .trim()
      .regex(/^\+\d{1,3}$/, 'Country code must look like +91')
      .optional(),
    phoneNumberLength: z.number().int().min(6, 'Must be at least 6 digits').max(15, 'Must be 15 digits or fewer').optional(),
    currencySymbol: z.string().trim().min(1, 'Required').max(5, 'Too long').optional(),
    currencyDecimalDigits: z.number().int().min(0, 'Must be zero or greater').max(4, 'Must be 4 or fewer').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });
