import { z } from 'zod';

const money = z.coerce.number().nonnegative();

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitPrice: money.optional(), // defaults to product.salePrice
  discount: money.default(0),
});

const paymentSchema = z.object({
  paymentMethodId: z.string().uuid(),
  amount: z.coerce.number().positive(),
});

const installmentPlanSchema = z.object({
  count: z.coerce.number().int().min(1).max(60),
  intervalDays: z.coerce.number().int().min(1).default(30),
  firstDueDate: z.coerce.date().optional(), // defaults to now + intervalDays
});

export const createSaleSchema = z
  .object({
    type: z.enum(['CASH', 'TERM', 'INSTALLMENT']),
    customerId: z.string().uuid().optional(),
    discount: money.default(0), // sale-level discount
    items: z.array(saleItemSchema).min(1),
    payments: z.array(paymentSchema).default([]),
    installmentPlan: installmentPlanSchema.optional(),
    dueDate: z.coerce.date().optional(), // for TERM remainder
    creditOverride: z.boolean().default(false), // manager release above limit / delinquent
    overrideReason: z.string().min(3).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'INSTALLMENT') {
      if (!data.customerId)
        ctx.addIssue({ code: 'custom', path: ['customerId'], message: 'Crediário exige cliente' });
      if (!data.installmentPlan)
        ctx.addIssue({ code: 'custom', path: ['installmentPlan'], message: 'Crediário exige plano de parcelas' });
    }
    if (data.type === 'TERM' && !data.customerId) {
      ctx.addIssue({ code: 'custom', path: ['customerId'], message: 'Venda a prazo exige cliente' });
    }
  });

export const cancelSaleSchema = z.object({
  reason: z.string().min(3),
});

export const listSaleQuerySchema = z.object({
  status: z.enum(['COMPLETED', 'CANCELED']).optional(),
  type: z.enum(['CASH', 'TERM', 'INSTALLMENT']).optional(),
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
