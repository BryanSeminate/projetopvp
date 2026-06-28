import { z } from 'zod';

const money = z.coerce.number().nonnegative();

export const openCashSchema = z.object({
  openingAmount: money.default(0),
});

export const movementSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().min(3).optional(),
});

export const closeCashSchema = z.object({
  closingAmount: money, // counted amount in the drawer
  notes: z.string().optional(),
});

export const listCashQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type OpenCashInput = z.infer<typeof openCashSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
export type CloseCashInput = z.infer<typeof closeCashSchema>;
