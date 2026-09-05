import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');

/** URL-safe business identifier: lowercase alphanumerics joined by single hyphens, 1–64 chars. */
export const slugField = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(64, 'Slug is too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters and numbers separated by single hyphens');

/** Password policy — mirrors auth.schema.js / users.schema.js (not exported there, so redefined here). */
const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * POST /api/businesses — super admin creates a business, optionally seeding its first admin.
 * If `initialAdminEmail` names a user that does not exist yet, `initialAdminPassword` is required —
 * that check needs a DB lookup, so it lives in the service (AppError 400). Here we only enforce that
 * a password never travels without an email to attach it to.
 */
export const createBusinessSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(150, 'Name is too long'),
    slug: slugField.optional(),
    initialAdminEmail: z.string().email('Invalid email address').optional(),
    initialAdminName: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
    initialAdminPassword: passwordPolicy.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.initialAdminPassword && !data.initialAdminEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['initialAdminEmail'],
        message: 'An admin email is required when an admin password is provided',
      });
    }
  });

/** PUT /api/businesses/:id — partial update. */
export const updateBusinessSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(150, 'Name is too long').optional(),
    slug: slugField.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const isActiveQueryField = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

/** GET /api/businesses?is_active=&search= (search is also parsed by the pagination middleware). */
export const listBusinessesQuerySchema = z.object({
  isActive: isActiveQueryField,
  search: z.string().trim().optional(),
});

/** POST /api/b/:businessId/members — add a member by email, find-or-create the user row. */
export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'staff']),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  password: passwordPolicy.optional(),
});

/** PATCH /api/b/:businessId/members/:userId — change a member's role. */
export const updateMemberSchema = z.object({
  role: z.enum(['admin', 'staff']),
});

export const idParamSchema = z.object({ id: uuidField });
export const businessIdParamSchema = z.object({ businessId: uuidField });
export const userIdParamSchema = z.object({ userId: uuidField });
