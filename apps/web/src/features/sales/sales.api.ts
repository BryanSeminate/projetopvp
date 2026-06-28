import { api } from '../../lib/axios';

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
