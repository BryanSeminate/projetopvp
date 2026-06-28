import { z } from 'zod';

export const createMessageSchema = z.object({
  name: z.string().min(2),
  template: z.string().min(10),
  channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'MANUAL']).default('WHATSAPP'),
});

export const updateMessageSchema = z.object({
  name: z.string().min(2).optional(),
  template: z.string().min(10).optional(),
  isActive: z.boolean().optional(),
});

export const sendSchema = z.object({
  customerId: z.string().uuid(),
  installmentId: z.string().uuid().optional(), // cobra uma parcela específica
  messageId: z.string().uuid().optional(), // template; default = primeiro ativo
});

export const createRuleSchema = z.object({
  name: z.string().min(2),
  daysOverdue: z.coerce.number().int().min(0),
  startHour: z.coerce.number().int().min(0).max(23).default(8),
  endHour: z.coerce.number().int().min(1).max(24).default(20),
  messageId: z.string().uuid().optional(),
});

export const updateRuleSchema = z.object({
  name: z.string().min(2).optional(),
  daysOverdue: z.coerce.number().int().min(0).optional(),
  startHour: z.coerce.number().int().min(0).max(23).optional(),
  endHour: z.coerce.number().int().min(1).max(24).optional(),
  messageId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const historyQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type SendInput = z.infer<typeof sendSchema>;
