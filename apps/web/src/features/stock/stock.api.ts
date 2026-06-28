import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: string;
  balanceAfter: string;
  reason: string | null;
  refType: string | null;
  createdAt: string;
  product?: { id: string; name: string; barcode: string | null };
}

export interface CreateMovementInput {
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  stock: string;
  minStock: string;
}

export async function listMovements(params: { productId?: string; type?: MovementType; page?: number }): Promise<Paginated<StockMovement>> {
  const { data } = await api.get<Paginated<StockMovement>>('/stock/movements', { params });
  return data;
}

export async function createMovement(input: CreateMovementInput): Promise<StockMovement> {
  const { data } = await api.post<StockMovement>('/stock/movements', input);
  return data;
}

export async function listLowStock(): Promise<LowStockItem[]> {
  const { data } = await api.get<LowStockItem[]>('/stock/low');
  return data;
}
