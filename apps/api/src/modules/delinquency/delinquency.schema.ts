import { z } from 'zod';

export const customersQuerySchema = z.object({
  sort: z.enum(['days', 'value']).default('days'), // maior atraso / maior valor
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const overdueQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
