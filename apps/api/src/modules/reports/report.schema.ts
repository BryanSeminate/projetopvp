import { z } from 'zod';

export const periodQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type PeriodQuery = z.infer<typeof periodQuerySchema>;
