import { z } from 'zod';

/** PUT /api/notice — all fields optional, but at least one must be present */
export const updateNoticeSchema = z
  .object({
    message: z.string().trim().max(500, 'Too long').optional().or(z.literal('')),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });
