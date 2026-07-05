import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');

// Whitelisted entity types allowed to reference a media item — extend as new
// features adopt the shared media library.
export const MEDIA_ENTITY_TYPES = ['product'];

export const idParamSchema = z.object({ id: uuidField });

/** PATCH /api/media/:id */
export const renameMediaSchema = z.object({
  originalName: z.string().trim().min(1, 'File name is required').max(255, 'File name is too long'),
});

/** GET /api/media?search= */
export const listMediaQuerySchema = z.object({
  unusedOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

/** POST /api/media/:id/usage */
export const attachUsageSchema = z.object({
  entityType: z.enum(MEDIA_ENTITY_TYPES, { errorMap: () => ({ message: 'Unsupported entity type' }) }),
  entityId: uuidField,
});

/** DELETE /api/media/:id/usage — same shape as attach */
export const detachUsageSchema = attachUsageSchema;
