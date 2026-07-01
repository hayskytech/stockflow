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

/** POST /api/users — admin creates a user of any role with a temporary password. */
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  role: roleField,
  password: passwordPolicy,
  isActive: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
});

/** PUT /api/users/:id — partial update; `password`, when present, resets the login password. */
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email('Invalid email address').optional(),
    role: roleField.optional(),
    password: passwordPolicy.optional(),
    isActive: z.boolean().optional(),
    mustChangePassword: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

/** GET /api/users?role= */
export const listUsersQuerySchema = z.object({
  role: roleField.optional(),
});

export const idParamSchema = z.object({ id: uuidField });
