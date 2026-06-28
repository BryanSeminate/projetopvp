import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { listCustomers, type Customer } from '../customers/customers.api';
import { listInstallments, type Installment } from '../finance/finance.api';
import { createRenegotiation, type RenegotiationResult } from './renegotiation.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (s: string) => new Date(s).toLocaleDateString('pt-BR');

export function RenegotiationPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [discount, setDiscount] = useState('0');
  const [interest, setInterest] = useState('0');
  const [count, setCount] = useState('1');
  const [intervalDays, setIntervalDays] = useState('30');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<RenegotiationResult | null>(null);

  // customer search
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults((await listCustomers({ search })).items); } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const pickCustomer = async (c: Customer) => {
    setCustomer(c);
    setSearch('');
    setResults([]);
    setDone(null);
    setSelected(new Set());
    try {
      const res = await listInstallments({ customerId: c.id });
      // só parcelas em aberto/vencidas entram na renegociação
      setInstallments(res.items.filter((i) => i.status === 'OPEN' || i.status === 'OVERDUE'));
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedItems = installments.filter((i) => selected.has(i.id));
  const originalTotal = selectedItems.reduce((acc, i) => acc + (Number(i.amount) - Number(i.paidAmount)), 0);
  const newTotal = Math.max(0, originalTotal - Number(discount || 0) + Number(interest || 0));

  const submit = async () => {
    setError('');
    if (selected.size === 0) return setError('Selecione ao menos uma parcela');
    setBusy(true);
    try {
      const res = await createRenegotiation({
        customerId: customer!.id,
        installmentIds: [...selected],
        discount: Number(discount || 0),
        interest: Number(interest || 0),
        count: Number(count || 1),
        intervalDays: Number(intervalDays || 30),
      });
      setDone(res);
      // recarrega parcelas em aberto (antigas saíram)
      const refreshed = await listInstallments({ customerId: customer!.id });
      setInstallments(refreshed.items.filter((i) => i.status === 'OPEN' || i.status === 'OVERDUE'));
      setSelected(new Set());
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Renegociação de dívidas</h1>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Cliente</h2>
        {customer ? (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <span className="font-medium">{customer.name}</span>
            <button onClick={() => { setCustomer(null); setInstallments([]); setDone(null); }} className="text-red-500">trocar</button>
          </div>
        ) : (
          <>
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {results.length > 0 && (
              <div className="mt-2 max-h-40 divide-y overflow-y-auto rounded-lg border">
                {results.map((c) => (
                  <button key={c.id} onClick={() => pickCustomer(c)} className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50">{c.name}</button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {done && (
        <Card className="mb-4 border-green-300 bg-green-50">
          <h2 className="mb-2 font-semibold text-green-800">Acordo criado ✓</h2>
          <p className="text-sm text-green-700">
            Original {brl(Number(done.originalTotal))} → Novo {brl(Number(done.newTotal))} em {done.installments}x
          </p>
          <ul className="mt-2 text-sm text-green-700">
            {done.newInstallments.map((i) => (
              <li key={i.id}>Parcela #{i.number}: {brl(Number(i.amount))} — vence {date(i.dueDate)}</li>
            ))}
          </ul>
        </Card>
      )}

      {customer && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="mb-3 font-semibold">Parcelas em aberto</h2>
            {installments.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma parcela em aberto.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 w-8"></th>
                    <th className="py-2">Parcela</th>
                    <th className="py-2">Vencimento</th>
                    <th className="py-2 text-center">Status</th>
                    <th className="py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="py-2"><input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} /></td>
                      <td className="py-2 font-medium">#{i.number}</td>
                      <td className="py-2 text-gray-600">{date(i.dueDate)}</td>
                      <td className="py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs ${i.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{i.status}</span></td>
                      <td className="py-2 text-right">{brl(Number(i.amount) - Number(i.paidAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Novo acordo</h2>
            <p className="mb-3 text-sm text-gray-500">Selecionadas: {selected.size} · {brl(originalTotal)}</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Desconto" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <Input label="Juros" type="number" step="0.01" value={interest} onChange={(e) => setInterest(e.target.value)} />
              <Input label="Parcelas" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
              <Input label="Intervalo (dias)" type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <span className="text-gray-500">Novo total</span>
              <span className="text-xl font-bold">{brl(newTotal)}</span>
            </div>
            <Button className="mt-3 w-full" onClick={submit} loading={busy} disabled={selected.size === 0}>
              Gerar acordo
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
