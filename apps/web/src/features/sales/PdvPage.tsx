import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { getCurrentCash, openCash, type CashRegister } from '../cash/cash.api';
import { listProducts, getProductByBarcode, type Product } from '../products/products.api';
import { listCustomers, type Customer } from '../customers/customers.api';
import { listPaymentMethods, createSale, type PaymentMethod, type SaleType } from './sales.api';

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function PdvPage() {
  // cash
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [cashReady, setCashReady] = useState(false);
  const [opening, setOpening] = useState('0');

  // catalog
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);

  // cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');

  // customer
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState<Customer[]>([]);

  // payment
  const [saleType, setSaleType] = useState<SaleType>('CASH');
  const [methodId, setMethodId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [intervalDays, setIntervalDays] = useState('30');

  // override + status
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [needsOverride, setNeedsOverride] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const total = cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0) - Number(discount || 0);

  // load cash + methods once
  useEffect(() => {
    getCurrentCash()
      .then(setCash)
      .catch((e) => setError(apiMessage(e)))
      .finally(() => setCashReady(true));
    listPaymentMethods()
      .then((m) => {
        setMethods(m);
        setMethodId(m.find((x) => x.isCash)?.id ?? m[0]?.id ?? '');
      })
      .catch(() => undefined);
  }, []);

  // product search (debounced)
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await listProducts({ search });
        setResults(res.items);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // customer search (debounced)
  useEffect(() => {
    if (!custSearch.trim()) {
      setCustResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await listCustomers({ search: custSearch });
        setCustResults(res.items);
      } catch {
        setCustResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [custSearch]);

  const addToCart = useCallback((p: Product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.productId === p.id);
      if (found) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: p.id, name: p.name, unitPrice: Number(p.salePrice), quantity: 1 }];
    });
    setSearch('');
    setResults([]);
  }, []);

  const onSearchKey = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !search.trim()) return;
    try {
      const p = await getProductByBarcode(search.trim());
      addToCart(p);
    } catch {
      if (results[0]) addToCart(results[0]);
    }
  };

  const setQty = (id: string, qty: number) =>
    setCart((prev) => prev.map((i) => (i.productId === id ? { ...i, quantity: Math.max(1, qty) } : i)));
  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.productId !== id));

  const reset = () => {
    setCart([]);
    setDiscount('0');
    setCustomer(null);
    setSaleType('CASH');
    setInstallments('1');
    setOverride(false);
    setOverrideReason('');
    setNeedsOverride(false);
  };

  const handleOpenCash = async () => {
    try {
      const c = await openCash(Number(opening || 0));
      setCash(c);
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const finalize = async () => {
    setError('');
    setSuccess('');
    if (!cart.length) return setError('Carrinho vazio');
    if (total < 0) return setError('Desconto maior que o total');
    if ((saleType === 'TERM' || saleType === 'INSTALLMENT') && !customer)
      return setError('Venda a prazo/crediário exige cliente');

    setSubmitting(true);
    try {
      const sale = await createSale({
        type: saleType,
        customerId: customer?.id,
        discount: Number(discount || 0),
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        payments: saleType === 'CASH' ? [{ paymentMethodId: methodId, amount: total }] : [],
        installmentPlan:
          saleType === 'INSTALLMENT'
            ? { count: Number(installments || 1), intervalDays: Number(intervalDays || 30) }
            : undefined,
        creditOverride: override || undefined,
        overrideReason: override ? overrideReason : undefined,
      });
      setSuccess(`Venda #${sale.number} concluída — ${brl(Number(sale.total))}`);
      reset();
    } catch (e) {
      const msg = apiMessage(e);
      setError(msg);
      if (/crediário|limite|inadimplente/i.test(msg)) setNeedsOverride(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!cashReady) return <p className="text-gray-400">Carregando...</p>;

  if (!cash) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-2xl font-bold">PDV</h1>
        <Card>
          <p className="mb-4 text-gray-600">Nenhum caixa aberto. Abra o caixa para vender.</p>
          <div className="flex items-end gap-3">
            <Input label="Valor de abertura" type="number" value={opening} onChange={(e) => setOpening(e.target.value)} />
            <Button onClick={handleOpenCash}>Abrir caixa</Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">PDV</h1>
      {success && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* left: catalog + cart */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <Input
              placeholder="Buscar produto ou ler código de barras + Enter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKey}
              autoFocus
            />
            {results.length > 0 && (
              <div className="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                  >
                    <span>{p.name}</span>
                    <span className="text-gray-500">{brl(Number(p.salePrice))} · est {p.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Produto</th>
                  <th className="py-2 w-24">Qtd</th>
                  <th className="py-2 w-28 text-right">Unit.</th>
                  <th className="py-2 w-28 text-right">Subtotal</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">Carrinho vazio</td></tr>
                )}
                {cart.map((i) => (
                  <tr key={i.productId} className="border-b last:border-0">
                    <td className="py-2 font-medium">{i.name}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={1}
                        value={i.quantity}
                        onChange={(e) => setQty(i.productId, Number(e.target.value))}
                        className="w-20 rounded border border-gray-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 text-right">{brl(i.unitPrice)}</td>
                    <td className="py-2 text-right">{brl(i.unitPrice * i.quantity)}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => removeItem(i.productId)} className="text-red-500 hover:underline">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* right: checkout */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold">Cliente</h2>
            {customer ? (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span>{customer.name}</span>
                <button onClick={() => setCustomer(null)} className="text-red-500">remover</button>
              </div>
            ) : (
              <>
                <Input placeholder="Buscar cliente..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} />
                {custResults.length > 0 && (
                  <div className="mt-2 max-h-40 divide-y overflow-y-auto rounded-lg border">
                    {custResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setCustomer(c); setCustSearch(''); setCustResults([]); }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Pagamento</h2>
            <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
              {(['CASH', 'TERM', 'INSTALLMENT'] as SaleType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setSaleType(t)}
                  className={`rounded-lg border px-2 py-2 ${saleType === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300'}`}
                >
                  {t === 'CASH' ? 'À vista' : t === 'TERM' ? 'A prazo' : 'Crediário'}
                </button>
              ))}
            </div>

            {saleType === 'CASH' && (
              <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {methods.filter((m) => !m.isCredit).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}

            {saleType === 'INSTALLMENT' && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Input label="Parcelas" type="number" min={1} value={installments} onChange={(e) => setInstallments(e.target.value)} />
                <Input label="Intervalo (dias)" type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
              </div>
            )}

            <Input label="Desconto" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />

            {needsOverride && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                  Liberar venda (gerente)
                </label>
                {override && (
                  <Input className="mt-2" placeholder="Justificativa..." value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <span className="text-gray-500">Total</span>
              <span className="text-2xl font-bold">{brl(total)}</span>
            </div>

            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <Button className="mt-3 w-full" onClick={finalize} loading={submitting} disabled={!cart.length}>
              Finalizar venda
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
