import { api } from '../../lib/axios';

export interface RenegotiationPayload {
  customerId: string;
  installmentIds: string[];
  discount?: number;
  interest?: number;
  count: number;
  intervalDays?: number;
  notes?: string;
}

export interface RenegotiationResult {
  id: string;
  originalTotal: string;
  newTotal: string;
  installments: number;
  newInstallments: { id: string; number: number; amount: string; dueDate: string }[];
}

export const createRenegotiation = (payload: RenegotiationPayload) =>
  api.post<RenegotiationResult>('/renegotiations', payload).then((r) => r.data);
