import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2),
  document: z.string().min(11).max(18).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listSupplierQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
