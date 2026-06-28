import { api } from '../../lib/axios';
import type { LoginResponse, SelectCompanyResponse } from '../../types/api';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function selectCompany(companyId: string): Promise<SelectCompanyResponse> {
  const { data } = await api.post<SelectCompanyResponse>('/auth/select-company', { companyId });
  return data;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; token?: string }> {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean }> {
  const { data } = await api.post('/auth/reset-password', { token, password });
  return data;
}
