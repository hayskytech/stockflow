import { z } from 'zod';

/** POST /api/settings/delete-all-data — requires the typed confirmation phrase. */
export const deleteAllDataSchema = z.object({
  confirm: z.string().refine((value) => value === 'DELETE', 'Type DELETE to confirm'),
});

const optionalUrl = (max) =>
  z.string().trim().max(max, 'Too long').url('Must be a valid URL').optional().or(z.literal(''));

/** PUT /api/settings/social — all fields optional, but at least one must be present */
export const updateSocialLinksSchema = z
  .object({
    facebookUrl: optionalUrl(255),
    instagramUrl: optionalUrl(255),
    youtubeUrl: optionalUrl(255),
    whatsappUrl: optionalUrl(255),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

// '' clears the field (removes the logo/favicon); omitted leaves it untouched.
const optionalMediaId = z.string().uuid('Invalid id').optional().or(z.literal(''));

/** PUT /api/settings/branding — all fields optional, but at least one must be present */
export const updateSiteBrandingSchema = z
  .object({
    logoMediaId: optionalMediaId,
    faviconMediaId: optionalMediaId,
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });
