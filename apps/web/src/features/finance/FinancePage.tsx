import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { apiMessage } from '../../lib/axios';
import {
  listPayables,
  createPayable,
  payPayable,
  listReceivables,
  receiveReceivable,
  listInstallments,
  payInstallment,
  type Payable,
  type Receivable,
  type Installment,
} from './finance.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (s: string) => new Date(s).toLocaleDateString('pt-BR');
type Tab = 'payables' | 'receivables' | 'installments';

const badge = (status: string) => {
  const map: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-700',
    PARTIAL: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELED: 'bg-gray-200 text-gray-600',
    RENEGOTIATED: 'bg-purple-100 text-purple-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
};

interface SettleTarget {
  kind: Tab;
  id: string;
  label: string;
  balance: number;
}

export function FinancePage() {
  const [tab, setTab] = useState<Tab>('receivables');
  const [payables, setPayables] = useState<Payable[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // create payable form
  const [newPay, setNewPay] = useState({ description: '', amount: '', dueDate: '' });

  // settle modal
  const [target, setTarget] = useState<SettleTarget | null>(null);
  const [settle, setSettle] = useState({ amount: '', interest: '0', fine: '0', discount: '0' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, r, i] = await Promise.all([
        listPayables({}),
        listReceivables({}),
        listInstallments({}),
      ]);
      setPayables(p.items);
      setReceivables(r.items);
      setInstallments(i.items);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openSettle = (t: SettleTarget) => {
    setTarget(t);
    setSettle({ amount: String(t.balance), interest: '0', fine: '0', discount: '0' });
  };

  const confirmSettle = async () => {
    if (!target) return;
    setBusy(true);
    setError('');
    setToast('');
    const input = {
      amount: Number(settle.amount),
      interest: Number(settle.interest || 0),
      fine: Number(settle.fine || 0),
      discount: Number(settle.discount || 0),
    };
    try {
      if (target.kind === 'payables') await payPayable(target.id, input);
      else if (target.kind === 'receivables') await receiveReceivable(target.id, input);
      else await payInstallment(target.id, input);
      setToast('Baixa registrada');
      setTarget(null);
      await load();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const addPayable = async () => {
    if (!newPay.description || !newPay.amount || !newPay.dueDate) return setError('Preencha descrição, valor e vencimento');
    try {
      await createPayable({ description: newPay.description, amount: Number(newPay.amount), dueDate: newPay.dueDate });
      setNewPay({ description: '', amount: '', dueDate: '' });
      setToast('Conta a pagar criada');
      load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const settleable = (status: string) => status === 'OPEN' || status === 'PARTIAL' || status === 'OVERDUE';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Financeiro</h1>

      <div className="mb-4 flex gap-2">
        {([
          ['receivables', 'A receber'],
          ['payables', 'A pagar'],
          ['installments', 'Parcelas (crediário)'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {tab === 'payables' && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">Nova conta a pagar</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input placeholder="Descrição" value={newPay.description} onChange={(e) => setNewPay({ ...newPay, description: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Valor" value={newPay.amount} onChange={(e) => setNewPay({ ...newPay, amount: e.target.value })} />
            <Input type="date" value={newPay.dueDate} onChange={(e) => setNewPay({ ...newPay, dueDate: e.target.value })} />
            <Button onClick={addPayable}>Adicionar</Button>
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">{tab === 'payables' ? 'Descrição' : 'Cliente / Descrição'}</th>
              <th className="py-2">Vencimento</th>
              <th className="py-2 text-right">Valor</th>
              <th className="py-2 text-right">Pago</th>
              <th className="py-2 text-center">Status</th>
              <th className="py-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {tab === 'payables' &&
              payables.map((p) => {
                const balance = Number(p.amount) - Number(p.paidAmount);
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{p.description}</td>
                    <td className="py-2 text-gray-600">{date(p.dueDate)}</td>
                    <td className="py-2 text-right">{brl(Number(p.amount))}</td>
                    <td className="py-2 text-right">{brl(Number(p.paidAmount))}</td>
                    <td className="py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs ${badge(p.status)}`}>{p.status}</span></td>
                    <td className="py-2 text-right">
                      {settleable(p.status) && <Button variant="secondary" onClick={() => openSettle({ kind: 'payables', id: p.id, label: p.description, balance })}>Pagar</Button>}
                    </td>
                  </tr>
                );
              })}

            {tab === 'receivables' &&
              receivables.map((r) => {
                const balance = Number(r.amount) - Number(r.paidAmount);
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.customer?.name ?? r.description}</td>
                    <td className="py-2 text-gray-600">{date(r.dueDate)}</td>
                    <td className="py-2 text-right">{brl(Number(r.amount))}</td>
                    <td className="py-2 text-right">{brl(Number(r.paidAmount))}</td>
                    <td className="py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs ${badge(r.status)}`}>{r.status}</span></td>
                    <td className="py-2 text-right">
                      {settleable(r.status) && <Button variant="secondary" onClick={() => openSettle({ kind: 'receivables', id: r.id, label: r.customer?.name ?? r.description, balance })}>Receber</Button>}
                    </td>
                  </tr>
                );
              })}

            {tab === 'installments' &&
              installments.map((i) => {
                const balance = Number(i.amount) - Number(i.paidAmount);
                return (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{i.customer?.name ?? '—'} <span className="text-gray-400">#{i.number}</span></td>
                    <td className="py-2 text-gray-600">{date(i.dueDate)}</td>
                    <td className="py-2 text-right">{brl(Number(i.amount))}</td>
                    <td className="py-2 text-right">{brl(Number(i.paidAmount))}</td>
                    <td className="py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs ${badge(i.status)}`}>{i.status}</span></td>
                    <td className="py-2 text-right">
                      {settleable(i.status) && <Button variant="secondary" onClick={() => openSettle({ kind: 'installments', id: i.id, label: `Parcela #${i.number}`, balance })}>Receber</Button>}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>

      <Modal open={target !== null} title={`Baixa — ${target?.label ?? ''}`} onClose={() => setTarget(null)}>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Saldo em aberto: {target ? brl(target.balance) : '—'}</p>
          <Input label="Valor da baixa" type="number" step="0.01" value={settle.amount} onChange={(e) => setSettle({ ...settle, amount: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <Input label="Juros" type="number" step="0.01" value={settle.interest} onChange={(e) => setSettle({ ...settle, interest: e.target.value })} />
            <Input label="Multa" type="number" step="0.01" value={settle.fine} onChange={(e) => setSettle({ ...settle, fine: e.target.value })} />
            <Input label="Desconto" type="number" step="0.01" value={settle.discount} onChange={(e) => setSettle({ ...settle, discount: e.target.value })} />
          </div>
          <Button className="w-full" onClick={confirmSettle} loading={busy}>Confirmar baixa</Button>
        </div>
      </Modal>
    </div>
  );
}
