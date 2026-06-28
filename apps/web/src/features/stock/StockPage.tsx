import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { listProducts, type Product } from '../products/products.api';
import {
  listMovements,
  createMovement,
  listLowStock,
  type StockMovement,
  type MovementType,
  type LowStockItem,
} from './stock.api';

const typeLabel: Record<MovementType, string> = { IN: 'Entrada', OUT: 'Saída', ADJUSTMENT: 'Ajuste' };

export function StockPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);

  const [type, setType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [low, setLow] = useState<LowStockItem[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  // product search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setResults((await listProducts({ search })).items);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadLow = useCallback(async () => {
    try {
      setLow(await listLowStock());
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    loadLow();
  }, [loadLow]);

  const loadMovements = useCallback(async (productId: string) => {
    try {
      setMovements((await listMovements({ productId })).items);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, []);

  const pick = (p: Product) => {
    setSelected(p);
    setSearch('');
    setResults([]);
    loadMovements(p.id);
  };

  const submit = async () => {
    if (!selected) return;
    setError('');
    setToast('');
    const qty = Number(quantity);
    if (!qty && type !== 'ADJUSTMENT') return setError('Quantidade obrigatória');
    if (type === 'ADJUSTMENT' && !reason.trim()) return setError('Motivo obrigatório no ajuste');
    setBusy(true);
    try {
      await createMovement({ productId: selected.id, type, quantity: qty, reason: reason || undefined });
      setToast('Movimento registrado');
      setQuantity('');
      setReason('');
      await Promise.all([loadMovements(selected.id), loadLow()]);
      // refresh selected stock
      const updated = (await listProducts({ search: selected.name })).items.find((x) => x.id === selected.id);
      if (updated) setSelected(updated);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Estoque</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold">Movimentar estoque</h2>
            {!selected ? (
              <>
                <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {results.length > 0 && (
                  <div className="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border">
                    {results.map((p) => (
                      <button key={p.id} onClick={() => pick(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50">
                        <span>{p.name}</span>
                        <span className="text-gray-500">est {Number(p.stock)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span className="font-medium">{selected.name}</span>
                  <span className="text-sm text-gray-500">
                    estoque atual: <b>{Number(selected.stock)}</b>
                    <button onClick={() => setSelected(null)} className="ml-3 text-red-500">trocar</button>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['IN', 'OUT', 'ADJUSTMENT'] as MovementType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`rounded-lg border px-2 py-2 text-sm ${type === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300'}`}
                    >
                      {typeLabel[t]}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label={type === 'ADJUSTMENT' ? 'Novo estoque (alvo)' : 'Quantidade'}
                    type="number"
                    step="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <Input
                    label={type === 'ADJUSTMENT' ? 'Motivo (obrigatório)' : 'Motivo (opcional)'}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                {toast && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
                {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                <Button className="mt-3" onClick={submit} loading={busy}>Registrar</Button>
              </>
            )}
          </Card>

          {selected && (
            <Card>
              <h2 className="mb-3 font-semibold">Movimentos — {selected.name}</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">Tipo</th>
                    <th className="py-2 text-right">Qtd</th>
                    <th className="py-2 text-right">Saldo</th>
                    <th className="py-2">Origem</th>
                    <th className="py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-400">Sem movimentos</td></tr>}
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">{typeLabel[m.type]}</td>
                      <td className="py-2 text-right">{Number(m.quantity)}</td>
                      <td className="py-2 text-right">{Number(m.balanceAfter)}</td>
                      <td className="py-2 text-gray-500">{m.refType ?? '—'}</td>
                      <td className="py-2 text-gray-500">{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          <h2 className="mb-3 font-semibold">Estoque baixo</h2>
          {low.length === 0 ? (
            <p className="text-sm text-gray-400">Tudo acima do mínimo 👍</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {low.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                  <span>{p.name}</span>
                  <span className="text-amber-700">{Number(p.stock)} / min {Number(p.minStock)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
