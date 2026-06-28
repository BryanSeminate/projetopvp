import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveCompany {
  id: string;
  name: string;
}

interface CompanyState {
  active: ActiveCompany | null;
  setActive: (c: ActiveCompany) => void;
  clear: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      active: null,
      setActive: (c) => set({ active: c }),
      clear: () => set({ active: null }),
    }),
    { name: 'sm-company' },
  ),
);
