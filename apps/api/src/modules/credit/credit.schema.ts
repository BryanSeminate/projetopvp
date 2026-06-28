import { z } from 'zod';

export const setLimitSchema = z.object({
  creditLimit: z.coerce.number().nonnegative(),
});

export const blockSchema = z.object({
  reason: z.string().min(3),
});

export const autoCollectionSchema = z.object({
  autoCollection: z.boolean(),
});

export type SetLimitInput = z.infer<typeof setLimitSchema>;
