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

export const updateSupplier = (id: string, input: { name?: string; document?: string; email?: string; phone?: string; isActive?: boolean }) =>
  api.put<Supplier>(`/suppliers/${id}`, input).then((r) => r.data);

export const deleteSupplier = (id: string) => api.delete(`/suppliers/${id}`).then((r) => r.data);
