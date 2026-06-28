import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiMessage } from '../../lib/axios';
import {
  getSalesReport,
  getFinancialReport,
  getStockReport,
  getCreditReport,
  type SalesReport,
  type FinancialReport,
  type StockReport,
  type CreditReport,
} from './reports.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const typeLabel: Record<string, string> = { CASH: 'À vista', TERM: 'A prazo', INSTALLMENT: 'Crediário' };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}

export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [fin, setFin] = useState<FinancialReport | null>(null);
  const [stock, setStock] = useState<StockReport | null>(null);
  const [credit, setCredit] = useState<CreditReport | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const period = { from: from || undefined, to: to || undefined };
    try {
      const [s, f, st, c] = await Promise.all([
        getSalesReport(period),
        getFinancialReport(period),
        getStockReport(),
        getCreditReport(),
      ]);
      setSales(s); setFin(f); setStock(st); setCredit(c);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <div className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-gray-500">De</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-500">Até</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <Button variant="secondary" onClick={load}>Aplicar</Button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <h2 className="mb-2 font-semibold text-gray-700">Vendas {(from || to) && <span className="text-sm font-normal text-gray-400">(período)</span>}</h2>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Faturamento" value={sales ? brl(sales.total) : '—'} />
        <Stat label="Vendas" value={sales?.count ?? '—'} />
        {sales?.byType.map((t) => <Stat key={t.type} label={typeLabel[t.type] ?? t.type} value={brl(t.total)} />)}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Top produtos</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500"><th className="py-2">Produto</th><th className="py-2 text-right">Qtd</th><th className="py-2 text-right">Receita</th></tr></thead>
            <tbody>
              {(!sales || sales.topProducts.length === 0) && <tr><td colSpan={3} className="py-4 text-center text-gray-400">Sem dados</td></tr>}
              {sales?.topProducts.map((p) => (
                <tr key={p.productId} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-right">{p.quantity}</td>
                  <td className="py-2 text-right">{brl(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Financeiro</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">A receber (aberto)</dt><dd className="font-medium text-green-600">{fin ? brl(fin.receivableOpen) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">A pagar (aberto)</dt><dd className="font-medium text-red-600">{fin ? brl(fin.payableOpen) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Recebido no período</dt><dd>{fin ? brl(fin.receivedInPeriod) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Pago no período</dt><dd>{fin ? brl(fin.paidInPeriod) : '—'}</dd></div>
          </dl>
        </Card>
      </div>

      <h2 className="mb-2 font-semibold text-gray-700">Estoque & Crédito</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Valor em estoque" value={stock ? brl(stock.stockValue) : '—'} />
        <Stat label="Produtos abaixo do mínimo" value={stock?.lowStockCount ?? '—'} />
        <Stat label="Produtos ativos" value={stock?.productsCount ?? '—'} />
        <Stat label="Crédito em uso" value={credit ? brl(credit.totalUsedCredit) : '—'} />
        <Stat label="Total vencido (crediário)" value={credit ? brl(credit.overdueTotal) : '—'} />
        <Stat label="Parcelas em aberto" value={credit?.activeInstallments ?? '—'} />
      </div>
    </div>
  );
}
