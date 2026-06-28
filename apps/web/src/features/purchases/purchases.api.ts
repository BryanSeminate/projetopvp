import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface Purchase {
  id: string;
  total: string;
  notes: string | null;
  createdAt: string;
  supplier?: { id: string; name: string } | null;
}

export interface CreatePurchasePayload {
  supplierId: string;
  items: { productId: string; quantity: number; unitCost: number }[];
  notes?: string;
  generatePayable?: boolean;
  dueDate?: string;
}

export const listPurchases = (params: { page?: number }) =>
  api.get<Paginated<Purchase>>('/purchases', { params }).then((r) => r.data);

export const createPurchase = (payload: CreatePurchasePayload) =>
  api.post<Purchase>('/purchases', payload).then((r) => r.data);
