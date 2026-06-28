import { api } from '../../lib/axios';

export interface Credit {
  id: string;
  customerId: string;
  creditLimit: string;
  usedCredit: string;
  available: number;
  status: 'ACTIVE' | 'BLOCKED';
  blockReason: string | null;
  autoCollection: boolean;
  delinquent: boolean;
}

export interface CreditHistoryItem {
  id: string;
  type: string;
  amount: string | null;
  description: string | null;
  createdAt: string;
}

export const getCredit = (customerId: string) =>
  api.get<Credit>(`/credit/${customerId}`).then((r) => r.data);

export const setCreditLimit = (customerId: string, creditLimit: number) =>
  api.put(`/credit/${customerId}/limit`, { creditLimit }).then((r) => r.data);

export const blockCredit = (customerId: string, reason: string) =>
  api.post(`/credit/${customerId}/block`, { reason }).then((r) => r.data);

export const unblockCredit = (customerId: string) =>
  api.post(`/credit/${customerId}/unblock`).then((r) => r.data);

export const getCreditHistory = (customerId: string) =>
  api.get<CreditHistoryItem[]>(`/credit/${customerId}/history`).then((r) => r.data);
