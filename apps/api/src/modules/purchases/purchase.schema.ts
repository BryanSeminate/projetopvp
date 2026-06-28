import { z } from 'zod';

const purchaseItem = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
});

export const createPurchaseSchema = z
  .object({
    supplierId: z.string().uuid(),
    items: z.array(purchaseItem).min(1),
    notes: z.string().optional(),
    generatePayable: z.boolean().default(false),
    dueDate: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.generatePayable && !data.dueDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Vencimento obrigatório ao gerar conta a pagar' });
    }
  });

export const listPurchaseQuerySchema = z.object({
  supplierId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
