import { api } from '../../lib/axios';

export interface DelinquencyPanel {
  delinquentCustomers: number;
  overdueInstallments: number;
  totalOverdue: number;
  blockedCustomers: number;
}

export interface Debtor {
  customerId: string;
  name: string;
  phone: string | null;
  overdueCount: number;
  totalOwed: number;
  oldestDueDate: string;
  daysLate: number;
  blocked: boolean;
}

export async function getPanel(): Promise<DelinquencyPanel> {
  const { data } = await api.get<DelinquencyPanel>('/delinquency/panel');
  return data;
}

export async function getDebtors(sort: 'days' | 'value' = 'days'): Promise<Debtor[]> {
  const { data } = await api.get<Debtor[]>('/delinquency/customers', { params: { sort, limit: 100 } });
  return data;
}
