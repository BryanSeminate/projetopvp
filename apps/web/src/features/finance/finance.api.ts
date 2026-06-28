import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface Payable {
  id: string;
  description: string;
  amount: string;
  paidAmount: string;
  dueDate: string;
  status: string;
}

export interface Receivable {
  id: string;
  description: string;
  amount: string;
  paidAmount: string;
  dueDate: string;
  status: string;
  customer?: { id: string; name: string } | null;
}

export interface Installment {
  id: string;
  number: number;
  amount: string;
  paidAmount: string;
  dueDate: string;
  status: string;
  customer?: { id: string; name: string } | null;
}

export interface SettleInput {
  amount: number;
  interest?: number;
  fine?: number;
  discount?: number;
}

// payables
export const listPayables = (params: { status?: string; page?: number }) =>
  api.get<Paginated<Payable>>('/finance/payables', { params }).then((r) => r.data);
export const createPayable = (input: { description: string; amount: number; dueDate: string }) =>
  api.post<Payable>('/finance/payables', input).then((r) => r.data);
export const payPayable = (id: string, input: SettleInput) =>
  api.post<Payable>(`/finance/payables/${id}/pay`, input).then((r) => r.data);

// receivables
export const listReceivables = (params: { status?: string; page?: number }) =>
  api.get<Paginated<Receivable>>('/finance/receivables', { params }).then((r) => r.data);
export const receiveReceivable = (id: string, input: SettleInput) =>
  api.post<Receivable>(`/finance/receivables/${id}/receive`, input).then((r) => r.data);

// installments
export const listInstallments = (params: { status?: string; customerId?: string; page?: number }) =>
  api.get<Paginated<Installment>>('/finance/installments', { params }).then((r) => r.data);
export const payInstallment = (id: string, input: SettleInput) =>
  api.post<Installment>(`/finance/installments/${id}/pay`, input).then((r) => r.data);
