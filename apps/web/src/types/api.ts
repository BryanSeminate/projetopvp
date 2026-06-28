// Shared API response shapes used across the app.

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface CompanyOption {
  id: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  companies: CompanyOption[];
}

export interface SelectCompanyResponse {
  accessToken: string;
  company: { id: string; name: string };
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
