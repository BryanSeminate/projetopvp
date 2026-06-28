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

export const historyQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type SendInput = z.infer<typeof sendSchema>;
