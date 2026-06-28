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
