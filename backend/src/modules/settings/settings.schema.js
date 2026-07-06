import { z } from 'zod';

/** POST /api/settings/delete-all-data — requires the typed confirmation phrase. */
export const deleteAllDataSchema = z.object({
  confirm: z.string().refine((value) => value === 'DELETE', 'Type DELETE to confirm'),
});
