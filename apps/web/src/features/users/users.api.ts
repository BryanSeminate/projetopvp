import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isBlocked: boolean;
  lastLoginAt: string | null;
  role: { id: string; name: string } | null;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
}

export const listUsers = (params: { search?: string; page?: number }) =>
  api.get<Paginated<UserRow>>('/users', { params }).then((r) => r.data);

export const listRoles = () => api.get<Role[]>('/users/roles').then((r) => r.data);

export const createUser = (input: { name: string; email: string; password: string; roleId: string }) =>
  api.post<UserRow>('/users', input).then((r) => r.data);

export const updateUser = (id: string, input: { name?: string; email?: string; isActive?: boolean }) =>
  api.put<UserRow>(`/users/${id}`, input).then((r) => r.data);

export const setRole = (id: string, roleId: string) =>
  api.patch(`/users/${id}/role`, { roleId }).then((r) => r.data);

export const blockUser = (id: string) => api.patch(`/users/${id}/block`).then((r) => r.data);
export const unblockUser = (id: string) => api.patch(`/users/${id}/unblock`).then((r) => r.data);
