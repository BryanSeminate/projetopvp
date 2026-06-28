import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { apiMessage } from '../lib/axios';
import {
  getSalesReport,
  getFinancialReport,
  getStockReport,
  getCreditReport,
  type SalesReport,
  type FinancialReport,
  type StockReport,
  type CreditReport,
} from '../features/reports/reports.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const typeLabel: Record<string, string> = { CASH: 'À vista', TERM: 'A prazo', INSTALLMENT: 'Crediário' };
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'];

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
    </Card>
  );
}

export function DashboardPage() {
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [fin, setFin] = useState<FinancialReport | null>(null);
  const [stock, setStock] = useState<StockReport | null>(null);
  const [credit, setCredit] = useState<CreditReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getSalesReport({}), getFinancialReport({}), getStockReport(), getCreditReport()])
      .then(([s, f, st, c]) => { setSales(s); setFin(f); setStock(st); setCredit(c); })
      .catch((e) => setError(apiMessage(e)));
  }, []);

  const byType = (sales?.byType ?? []).map((t) => ({ name: typeLabel[t.type] ?? t.type, value: t.total }));
  const top = (sales?.topProducts ?? []).map((p) => ({ name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, value: p.revenue }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Faturamento" value={sales ? brl(sales.total) : '—'} accent="text-brand-600" />
        <Stat label="A receber (aberto)" value={fin ? brl(fin.receivableOpen) : '—'} accent="text-green-600" />
        <Stat label="A pagar (aberto)" value={fin ? brl(fin.payableOpen) : '—'} accent="text-red-600" />
        <Stat label="Vencido (crediário)" value={credit ? brl(credit.overdueTotal) : '—'} accent="text-amber-600" />
        <Stat label="Valor em estoque" value={stock ? brl(stock.stockValue) : '—'} />
        <Stat label="Crédito em uso" value={credit ? brl(credit.totalUsedCredit) : '—'} />
        <Stat label="Estoque baixo" value={stock?.lowStockCount ?? '—'} />
        <Stat label="Parcelas em aberto" value={credit?.activeInstallments ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Vendas por tipo</h2>
          {byType.length === 0 ? (
            <p className="text-sm text-gray-400">Sem vendas ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Top produtos (receita)</h2>
          {top.length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => brl(v)} hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
