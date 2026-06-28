import { api } from '../../lib/axios';

export interface Settings {
  id: string;
  defaultInterest: string;
  defaultFine: string;
  daysToOverdue: number;
  lowStockAlert: boolean;
}

export const getSettings = () => api.get<Settings>('/settings').then((r) => r.data);

export const updateSettings = (input: {
  defaultInterest?: number;
  defaultFine?: number;
  daysToOverdue?: number;
  lowStockAlert?: boolean;
}) => api.put<Settings>('/settings', input).then((r) => r.data);
