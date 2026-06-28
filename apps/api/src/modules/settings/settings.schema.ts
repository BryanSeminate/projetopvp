import { z } from 'zod';

export const updateSettingsSchema = z.object({
  defaultInterest: z.coerce.number().min(0).max(100).optional(),
  defaultFine: z.coerce.number().min(0).max(100).optional(),
  daysToOverdue: z.coerce.number().int().min(0).max(365).optional(),
  lowStockAlert: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
