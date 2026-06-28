import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiMessage } from '../../lib/axios';
import { getPanel, getDebtors, type DelinquencyPanel, type Debtor } from './delinquency.api';
import { sendCollection } from '../collection/collection.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function DelinquencyPage() {
  const [panel, setPanel] = useState<DelinquencyPanel | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [sort, setSort] = useState<'days' | 'value'>('days');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, d] = await Promise.all([getPanel(), getDebtors(sort)]);
      setPanel(p);
      setDebtors(d);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    load();
  }, [load]);

  const charge = async (d: Debtor) => {
    setToast('');
    setError('');
    setSending(d.customerId);
    try {
      const res = await sendCollection(d.customerId);
      window.open(res.link, '_blank'); // abre WhatsApp com mensagem pronta
      setToast(`Cobrança registrada para ${d.name}`);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(null);
    }
  };

  const cards = [
    { label: 'Clientes devedores', value: panel?.delinquentCustomers ?? '—' },
    { label: 'Parcelas vencidas', value: panel?.overdueInstallments ?? '—' },
    { label: 'Total em atraso', value: panel ? brl(panel.totalOverdue) : '—' },
    { label: 'Clientes bloqueados', value: panel?.blockedCustomers ?? '—' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inadimplência ao vivo</h1>
        <Button variant="secondary" onClick={load} loading={loading}>Atualizar</Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>

      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Ordenar por:</span>
          {(['days', 'value'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-lg px-3 py-1 text-sm ${sort === s ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {s === 'days' ? 'Maior atraso' : 'Maior valor'}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Cliente</th>
                <th className="py-2">Telefone</th>
                <th className="py-2 text-center">Parcelas</th>
                <th className="py-2 text-right">Devido</th>
                <th className="py-2 text-center">Atraso</th>
                <th className="py-2 text-center">Status</th>
                <th className="py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {!loading && debtors.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-gray-400">Nenhum devedor 🎉</td></tr>
              )}
              {debtors.map((d) => (
                <tr key={d.customerId} className="border-b last:border-0">
                  <td className="py-2 font-medium">{d.name}</td>
                  <td className="py-2 text-gray-600">{d.phone ?? '—'}</td>
                  <td className="py-2 text-center">{d.overdueCount}</td>
                  <td className="py-2 text-right font-medium">{brl(d.totalOwed)}</td>
                  <td className="py-2 text-center">
                    <span className={`font-medium ${d.daysLate > 30 ? 'text-red-600' : 'text-amber-600'}`}>{d.daysLate}d</span>
                  </td>
                  <td className="py-2 text-center">
                    {d.blocked ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Bloqueado</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Em atraso</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      variant="secondary"
                      onClick={() => charge(d)}
                      loading={sending === d.customerId}
                      disabled={!d.phone}
                      title={!d.phone ? 'Cliente sem telefone' : 'Cobrar via WhatsApp'}
                    >
                      Cobrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
