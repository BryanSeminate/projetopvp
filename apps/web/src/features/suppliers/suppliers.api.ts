import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface Supplier {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

export const listSuppliers = (params: { search?: string; page?: number }) =>
  api.get<Paginated<Supplier>>('/suppliers', { params }).then((r) => r.data);

export const createSupplier = (input: { name: string; document?: string; email?: string; phone?: string }) =>
  api.post<Supplier>('/suppliers', input).then((r) => r.data);
