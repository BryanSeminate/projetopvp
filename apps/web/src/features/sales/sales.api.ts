import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface PaymentMethod {
  id: string;
  name: string;
  isCash: boolean;
  isCredit: boolean;
}

export type SaleType = 'CASH' | 'TERM' | 'INSTALLMENT';

export interface CreateSalePayload {
  type: SaleType;
  customerId?: string;
  discount?: number;
  items: { productId: string; quantity: number; unitPrice?: number; discount?: number }[];
  payments?: { paymentMethodId: string; amount: number }[];
  installmentPlan?: { count: number; intervalDays?: number };
  creditOverride?: boolean;
  overrideReason?: string;
}

export interface Sale {
  id: string;
  number: number;
  type: SaleType;
  total: string;
  status: string;
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await api.get<PaymentMethod[]>('/sales/payment-methods');
  return data;
}

export async function createSale(payload: CreateSalePayload): Promise<Sale> {
  const { data } = await api.post<Sale>('/sales', payload);
  return data;
}

// ----- listagem / detalhe / cancelamento -----
export interface SaleListItem {
  id: string;
  number: number;
  type: SaleType;
  status: string;
  total: string;
  createdAt: string;
  customer?: { id: string; name: string } | null;
}

export interface SaleDetail extends SaleListItem {
  subtotal: string;
  discount: string;
  cancelReason: string | null;
  items: { id: string; quantity: string; unitPrice: string; subtotal: string; product: { name: string } }[];
  payments: { id: string; amount: string; paymentMethod: { name: string } }[];
  installments: { id: string; number: number; amount: string; dueDate: string; status: string }[];
}

export const listSales = (params: { status?: string; type?: string; page?: number }) =>
  api.get<Paginated<SaleListItem>>('/sales', { params }).then((r) => r.data);

export const getSale = (id: string) => api.get<SaleDetail>(`/sales/${id}`).then((r) => r.data);

export const cancelSale = (id: string, reason: string) =>
  api.post<SaleDetail>(`/sales/${id}/cancel`, { reason }).then((r) => r.data);
