import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, CompanyOption } from '../types/api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  companies: CompanyOption[];
  setSession: (s: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    companies: CompanyOption[];
  }) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      companies: [],
      setSession: (s) =>
        set({
          user: s.user,
          accessToken: s.accessToken,
          refreshToken: s.refreshToken,
          companies: s.companies,
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, companies: [] }),
    }),
    { name: 'sm-auth' },
  ),
);
