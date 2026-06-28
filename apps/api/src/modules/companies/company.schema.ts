import { z } from 'zod';

export const createCompanySchema = z.object({
  legalName: z.string().min(2),
  tradeName: z.string().min(1).optional(),
  document: z.string().min(11).max(18), // CNPJ/CPF (validação fiscal completa: futuro)
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
