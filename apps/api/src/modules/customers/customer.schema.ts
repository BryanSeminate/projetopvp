import { z } from 'zod';
import { isValidDocument } from '../../shared/validators/document.js';

export const createCustomerSchema = z.object({
  name: z.string().min(2),
  document: z
    .string()
    .refine(isValidDocument, 'CPF/CNPJ inválido')
    .optional(), // CPF (11) ou CNPJ (14)
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listCustomerQuerySchema = z.object({
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
