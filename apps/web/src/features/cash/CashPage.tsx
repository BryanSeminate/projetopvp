import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import {
  getCurrentCash,
  openCash,
  withdrawal,
  supply,
  closeCash,
  listCashRegisters,
  type CashRegister,
  type CashMovementType,
} from './cash.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const movLabel: Record<CashMovementType, string> = {
  OPENING: 'Abertura',
  SALE: 'Venda',
  WITHDRAWAL: 'Sangria',
  SUPPLY: 'Suprimento',
  CLOSING: 'Fechamento',
};

export function CashPage() {
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // inputs
  const [opening, setOpening] = useState('0');
  const [moveAmount, setMoveAmount] = useState('');
  const [moveDesc, setMoveDesc] = useState('');
  const [closing, setClosing] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([getCurrentCash(), listCashRegisters({ status: 'CLOSED' })]);
      setCash(c);
      setHistory(h.items);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const wrap = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    setToast('');
    try {
      await fn();
      setToast(ok);
      setMoveAmount('');
      setMoveDesc('');
      setClosing('');
      await refresh();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  if (!ready) return <p className="text-gray-400">Carregando...</p>;

  const expected = cash?.expectedAmount != null ? Number(cash.expectedAmount) : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Caixa</h1>
      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!cash ? (
        <Card className="max-w-md">
          <h2 className="mb-3 font-semibold">Abrir caixa</h2>
          <div className="flex items-end gap-3">
            <Input label="Valor de abertura" type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} />
            <Button onClick={() => wrap(() => openCash(Number(opening || 0)), 'Caixa aberto')}>Abrir</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Abertura</p>
                  <p className="text-xl font-bold">{brl(Number(cash.openingAmount))}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Saldo esperado</p>
                  <p className="text-xl font-bold text-brand-600">{expected != null ? brl(expected) : '—'}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">Aberto em {new Date(cash.openedAt).toLocaleString('pt-BR')}</p>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Movimentos</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Descrição</th>
                    <th className="py-2 text-right">Valor</th>
                    <th className="py-2">Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {(cash.movements ?? []).map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">{movLabel[m.type]}</td>
                      <td className="py-2 text-gray-600">{m.description ?? '—'}</td>
                      <td className={`py-2 text-right ${m.type === 'WITHDRAWAL' || Number(m.amount) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {brl(Number(m.amount))}
                      </td>
                      <td className="py-2 text-gray-500">{new Date(m.createdAt).toLocaleTimeString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 font-semibold">Sangria / Suprimento</h2>
              <Input label="Valor" type="number" step="0.01" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} />
              <Input className="mt-2" placeholder="Descrição (opcional)" value={moveDesc} onChange={(e) => setMoveDesc(e.target.value)} />
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => wrap(() => withdrawal(Number(moveAmount), moveDesc || undefined), 'Sangria registrada')}>
                  Sangria
                </Button>
                <Button className="flex-1" onClick={() => wrap(() => supply(Number(moveAmount), moveDesc || undefined), 'Suprimento registrado')}>
                  Suprimento
                </Button>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Fechar caixa</h2>
              <p className="mb-2 text-sm text-gray-500">Esperado: {expected != null ? brl(expected) : '—'}</p>
              <Input label="Valor contado" type="number" step="0.01" value={closing} onChange={(e) => setClosing(e.target.value)} />
              {closing !== '' && expected != null && (
                <p className={`mt-2 text-sm ${Number(closing) - expected < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  Diferença: {brl(Number(closing) - expected)}
                </p>
              )}
              <Button variant="danger" className="mt-3 w-full" onClick={() => wrap(() => closeCash(Number(closing || 0)), 'Caixa fechado')}>
                Fechar caixa
              </Button>
            </Card>
          </div>
        </div>
      )}

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">Histórico de caixas</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Aberto</th>
              <th className="py-2">Fechado</th>
              <th className="py-2 text-right">Abertura</th>
              <th className="py-2 text-right">Esperado</th>
              <th className="py-2 text-right">Contado</th>
              <th className="py-2 text-right">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-400">Nenhum caixa fechado</td></tr>}
            {history.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-2 text-gray-600">{new Date(c.openedAt).toLocaleString('pt-BR')}</td>
                <td className="py-2 text-gray-600">{c.closedAt ? new Date(c.closedAt).toLocaleString('pt-BR') : '—'}</td>
                <td className="py-2 text-right">{brl(Number(c.openingAmount))}</td>
                <td className="py-2 text-right">{c.expectedAmount != null ? brl(Number(c.expectedAmount)) : '—'}</td>
                <td className="py-2 text-right">{c.closingAmount != null ? brl(Number(c.closingAmount)) : '—'}</td>
                <td className={`py-2 text-right ${c.difference != null && Number(c.difference) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {c.difference != null ? brl(Number(c.difference)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
