import { z } from 'zod';
import { isValidDocument } from '../../shared/validators/document.js';

export const createCompanySchema = z.object({
  legalName: z.string().min(2),
  tradeName: z.string().min(1).optional(),
  document: z.string().refine(isValidDocument, 'CNPJ/CPF inválido'), // CPF (11) ou CNPJ (14)
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const updateCompanySchema = createCompanySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listCompanyQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
