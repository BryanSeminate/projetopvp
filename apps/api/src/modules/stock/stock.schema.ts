import { z } from 'zod';

/**
 * Manual stock movement.
 * - IN:  quantity = amount to add (> 0)
 * - OUT: quantity = amount to remove (> 0)
 * - ADJUSTMENT: quantity = NEW absolute stock (target); reason required
 */
export const createMovementSchema = z
  .object({
    productId: z.string().uuid(),
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    quantity: z.coerce.number(),
    reason: z.string().min(3).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'ADJUSTMENT') {
      if (data.quantity < 0)
        ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Estoque alvo não pode ser negativo' });
      if (!data.reason)
        ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Motivo é obrigatório no ajuste' });
    } else if (data.quantity <= 0) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Quantidade deve ser maior que zero' });
    }
  });

export const listMovementQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
