import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { listSuppliers, type Supplier } from '../suppliers/suppliers.api';
import { listProducts, type Product } from '../products/products.api';
import { listPurchases, createPurchase, type Purchase } from './purchases.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (s: string) => new Date(s).toLocaleDateString('pt-BR');

interface Line {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [generatePayable, setGeneratePayable] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const total = lines.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);

  const loadPurchases = useCallback(async () => {
    try {
      setPurchases((await listPurchases({})).items);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, []);

  useEffect(() => {
    listSuppliers({}).then((r) => setSuppliers(r.items)).catch(() => undefined);
    loadPurchases();
  }, [loadPurchases]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults((await listProducts({ search })).items); } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const addLine = (p: Product) => {
    setLines((prev) => prev.some((l) => l.productId === p.id) ? prev : [...prev, { productId: p.id, name: p.name, quantity: 1, unitCost: Number(p.costPrice ?? 0) }]);
    setSearch('');
    setResults([]);
  };
  const updateLine = (id: string, field: 'quantity' | 'unitCost', value: number) =>
    setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, [field]: value } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.productId !== id));

  const submit = async () => {
    setError('');
    setToast('');
    if (!supplierId) return setError('Selecione um fornecedor');
    if (lines.length === 0) return setError('Adicione ao menos um item');
    if (generatePayable && !dueDate) return setError('Informe o vencimento da conta a pagar');
    setBusy(true);
    try {
      await createPurchase({
        supplierId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
        generatePayable,
        dueDate: generatePayable ? dueDate : undefined,
      });
      setToast('Compra registrada — estoque atualizado');
      setLines([]);
      setGeneratePayable(false);
      setDueDate('');
      await loadPurchases();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Compras</h1>
      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Nova compra</h2>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Fornecedor</span>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="relative">
            <span className="mb-1 block text-sm font-medium text-gray-700">Adicionar produto</span>
            <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-40 w-full divide-y overflow-y-auto rounded-lg border bg-white shadow">
                {results.map((p) => (
                  <button key={p.id} onClick={() => addLine(p)} className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50">{p.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Produto</th><th className="py-2 w-24">Qtd</th><th className="py-2 w-32">Custo unit.</th><th className="py-2 w-28 text-right">Subtotal</th><th className="py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-400">Nenhum item</td></tr>}
            {lines.map((l) => (
              <tr key={l.productId} className="border-b last:border-0">
                <td className="py-2 font-medium">{l.name}</td>
                <td className="py-2"><input type="number" min={1} step="0.001" value={l.quantity} onChange={(e) => updateLine(l.productId, 'quantity', Number(e.target.value))} className="w-20 rounded border border-gray-300 px-2 py-1" /></td>
                <td className="py-2"><input type="number" min={0} step="0.01" value={l.unitCost} onChange={(e) => updateLine(l.productId, 'unitCost', Number(e.target.value))} className="w-28 rounded border border-gray-300 px-2 py-1" /></td>
                <td className="py-2 text-right">{brl(l.quantity * l.unitCost)}</td>
                <td className="py-2 text-right"><button onClick={() => removeLine(l.productId)} className="text-red-500">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={generatePayable} onChange={(e) => setGeneratePayable(e.target.checked)} />
            Gerar conta a pagar
            {generatePayable && (
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="ml-2 rounded border border-gray-300 px-2 py-1" />
            )}
          </label>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Total</span>
            <span className="text-2xl font-bold">{brl(total)}</span>
            <Button onClick={submit} loading={busy} disabled={lines.length === 0}>Registrar compra</Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Compras recentes</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Data</th><th className="py-2">Fornecedor</th><th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhuma compra</td></tr>}
            {purchases.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 text-gray-600">{date(p.createdAt)}</td>
                <td className="py-2 font-medium">{p.supplier?.name ?? '—'}</td>
                <td className="py-2 text-right">{brl(Number(p.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
