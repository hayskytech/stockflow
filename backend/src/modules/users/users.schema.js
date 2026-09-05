import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');
const roleField = z.enum(['admin', 'staff', 'customer']);

/** Password policy — mirrors the auth register/change-password rules. */
const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Same optional profile fields collected at self-registration (auth.schema.js registerSchema),
// kept optional here since they're only meaningful for the `customer` role — admin/staff
// accounts have no shipping address to speak of.
const profileFields = {
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Enter a valid 10-digit phone number').optional().or(z.literal('')),
  businessName: z.string().trim().max(150, 'Business name is too long').optional().or(z.literal('')),
  address: z.string().trim().max(255, 'Address is too long').optional().or(z.literal('')),
  town: z.string().trim().max(100, 'Town is too long').optional().or(z.literal('')),
  district: z.string().trim().max(100, 'District is too long').optional().or(z.literal('')),
  state: z.string().trim().max(100, 'State is too long').optional().or(z.literal('')),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a valid 6-digit pincode').optional().or(z.literal('')),
};

/** POST /api/users — admin creates a user of any role with a permanent password. */
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  role: roleField,
  password: passwordPolicy,
  isActive: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
  ...profileFields,
});

/** PUT /api/users/:id — partial update; `password`, when present, resets the login password. */
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email('Invalid email address').optional(),
    role: roleField.optional(),
    password: passwordPolicy.optional(),
    isActive: z.boolean().optional(),
    isSuperAdmin: z.boolean().optional(),
    ...profileFields,
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

/** GET /api/users?role= */
export const listUsersQuerySchema = z.object({
  role: roleField.optional(),
});

export const idParamSchema = z.object({ id: uuidField });
export const sessionIdParamSchema = z.object({ sessionId: uuidField });

/** GET /api/admin/sessions?user_id= — admin-only, optionally scoped to one user's sessions. */
export const adminSessionsQuerySchema = z.object({
  userId: uuidField.optional(),
});
