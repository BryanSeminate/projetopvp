import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface Customer {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCustomerInput {
  name: string;
  document?: string;
  email?: string;
  phone?: string;
}

export async function listCustomers(params: { search?: string; page?: number }): Promise<Paginated<Customer>> {
  const { data } = await api.get<Paginated<Customer>>('/customers', { params });
  return data;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { data } = await api.post<Customer>('/customers', input);
  return data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data } = await api.get<Customer>(`/customers/${id}`);
  return data;
}

export async function updateCustomer(id: string, input: Partial<CreateCustomerInput> & { isActive?: boolean }): Promise<Customer> {
  const { data } = await api.put<Customer>(`/customers/${id}`, input);
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`);
}
