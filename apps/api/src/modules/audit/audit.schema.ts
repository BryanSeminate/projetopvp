import { z } from 'zod';

export const listAuditQuerySchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
