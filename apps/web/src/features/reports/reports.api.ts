import { api } from '../../lib/axios';

export interface SalesReport {
  total: number;
  count: number;
  byType: { type: string; total: number; count: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
}
export interface FinancialReport {
  receivableOpen: number;
  payableOpen: number;
  receivedInPeriod: number;
  paidInPeriod: number;
}
export interface StockReport {
  stockValue: number;
  lowStockCount: number;
  productsCount: number;
}
export interface CreditReport {
  totalUsedCredit: number;
  overdueTotal: number;
  activeInstallments: number;
}

type Period = { from?: string; to?: string };

export const getSalesReport = (p: Period) => api.get<SalesReport>('/reports/sales', { params: p }).then((r) => r.data);
export const getFinancialReport = (p: Period) => api.get<FinancialReport>('/reports/financial', { params: p }).then((r) => r.data);
export const getStockReport = () => api.get<StockReport>('/reports/stock').then((r) => r.data);
export const getCreditReport = () => api.get<CreditReport>('/reports/credit').then((r) => r.data);
