import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export type CashMovementType = 'OPENING' | 'SALE' | 'WITHDRAWAL' | 'SUPPLY' | 'CLOSING';

export interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: string;
  description: string | null;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openingAmount: string;
  closingAmount?: string | null;
  expectedAmount?: number | string | null;
  difference?: string | null;
  openedAt: string;
  closedAt?: string | null;
  movements?: CashMovement[];
}

/** Current open register (with movements + expected), or null if none (404). */
export async function getCurrentCash(): Promise<CashRegister | null> {
  try {
    const { data } = await api.get<CashRegister>('/cash/current');
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } }).response?.status === 404) return null;
    throw err;
  }
}

export async function openCash(openingAmount: number): Promise<CashRegister> {
  const { data } = await api.post<CashRegister>('/cash/open', { openingAmount });
  return data;
}

export async function withdrawal(amount: number, description?: string): Promise<CashMovement> {
  const { data } = await api.post<CashMovement>('/cash/withdrawal', { amount, description });
  return data;
}

export async function supply(amount: number, description?: string): Promise<CashMovement> {
  const { data } = await api.post<CashMovement>('/cash/supply', { amount, description });
  return data;
}

export async function closeCash(closingAmount: number, notes?: string): Promise<CashRegister> {
  const { data } = await api.post<CashRegister>('/cash/close', { closingAmount, notes });
  return data;
}

export async function listCashRegisters(params: { status?: 'OPEN' | 'CLOSED'; page?: number }): Promise<Paginated<CashRegister>> {
  const { data } = await api.get<Paginated<CashRegister>>('/cash', { params });
  return data;
}
