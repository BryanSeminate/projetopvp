import { z } from 'zod';

const money = z.coerce.number().nonnegative();

export const createRenegotiationSchema = z.object({
  customerId: z.string().uuid(),
  installmentIds: z.array(z.string().uuid()).min(1), // parcelas antigas a renegociar
  discount: money.default(0),
  interest: money.default(0),
  count: z.coerce.number().int().min(1).max(60), // novas parcelas
  intervalDays: z.coerce.number().int().min(1).default(30),
  firstDueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const listRenegotiationQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRenegotiationInput = z.infer<typeof createRenegotiationSchema>;
