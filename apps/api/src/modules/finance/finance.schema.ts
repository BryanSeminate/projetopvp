import { z } from 'zod';

const money = z.coerce.number().nonnegative();

// ----- payables -----
export const createPayableSchema = z.object({
  description: z.string().min(2),
  supplierId: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
});

export const updatePayableSchema = z.object({
  description: z.string().min(2).optional(),
  amount: z.coerce.number().positive().optional(),
  dueDate: z.coerce.date().optional(),
});

// ----- manual receivable (avulsa, fora de venda) -----
export const createReceivableSchema = z.object({
  description: z.string().min(2),
  customerId: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
});

// ----- baixa (pagamento / recebimento) -----
export const settleSchema = z.object({
  amount: z.coerce.number().positive(), // valor do principal baixado
  interest: money.default(0),
  fine: money.default(0),
  discount: money.default(0),
  paidAt: z.coerce.date().optional(),
});

export const listFinanceQuerySchema = z.object({
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  overdue: z.enum(['true']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SettleInput = z.infer<typeof settleSchema>;
export type CreatePayableInput = z.infer<typeof createPayableSchema>;
export type CreateReceivableInput = z.infer<typeof createReceivableSchema>;
