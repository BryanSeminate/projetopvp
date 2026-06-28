import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { apiMessage } from '../../lib/axios';
import { listSales, getSale, cancelSale, type SaleListItem, type SaleDetail } from './sales.api';
import { printReceipt } from './receipt';
import { useCompanyStore } from '../../stores/companyStore';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (s: string) => new Date(s).toLocaleString('pt-BR');
const typeLabel: Record<string, string> = { CASH: 'À vista', TERM: 'A prazo', INSTALLMENT: 'Crediário' };

const statusBadge = (s: string) =>
  s === 'CANCELED' ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700';

export function SalesPage() {
  const [items, setItems] = useState<SaleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusF, setStatusF] = useState('');
  const [typeF, setTypeF] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const companyName = useCompanyStore((s) => s.active?.name ?? '');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await listSales({ status: statusF || undefined, type: typeF || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, [statusF, typeF]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id: string) => {
    try {
      setDetail(await getSale(id));
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const doCancel = async () => {
    if (!detail) return;
    const reason = window.prompt('Motivo do cancelamento (mín. 3 caracteres):');
    if (!reason || reason.trim().length < 3) return;
    setBusy(true);
    setError('');
    try {
      const updated = await cancelSale(detail.id, reason);
      setDetail(updated);
      setToast(`Venda #${updated.number} cancelada`);
      load();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Vendas</h1>

      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Card>
        <div className="mb-4 flex gap-3">
          <select aria-label="Filtrar por status" value={statusF} onChange={(e) => setStatusF(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos status</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELED">Cancelada</option>
          </select>
          <select aria-label="Filtrar por tipo" value={typeF} onChange={(e) => setTypeF(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos tipos</option>
            <option value="CASH">À vista</option>
            <option value="TERM">A prazo</option>
            <option value="INSTALLMENT">Crediário</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">#</th>
              <th className="py-2">Data</th>
              <th className="py-2">Cliente</th>
              <th className="py-2">Tipo</th>
              <th className="py-2 text-center">Status</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Nenhuma venda</td></tr>}
            {items.map((s) => (
              <tr key={s.id} onClick={() => open(s.id)} className="cursor-pointer border-b last:border-0 hover:bg-brand-50">
                <td className="py-2 font-medium text-brand-700">{s.number}</td>
                <td className="py-2 text-gray-600">{dt(s.createdAt)}</td>
                <td className="py-2">{s.customer?.name ?? 'Consumidor'}</td>
                <td className="py-2">{typeLabel[s.type] ?? s.type}</td>
                <td className="py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(s.status)}`}>{s.status === 'CANCELED' ? 'Cancelada' : 'Concluída'}</span></td>
                <td className="py-2 text-right font-medium">{brl(Number(s.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-400">{total} venda(s)</p>
      </Card>

      <Modal open={detail !== null} title={detail ? `Venda #${detail.number}` : ''} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{dt(detail.createdAt)}</span>
              <span>{typeLabel[detail.type] ?? detail.type}</span>
            </div>
            <div>Cliente: <b>{detail.customer?.name ?? 'Consumidor'}</b></div>

            <div>
              <p className="mb-1 font-medium">Itens</p>
              <table className="w-full">
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="py-1">{i.product.name}</td>
                      <td className="py-1 text-right text-gray-500">{Number(i.quantity)} × {brl(Number(i.unitPrice))}</td>
                      <td className="py-1 text-right">{brl(Number(i.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detail.payments.length > 0 && (
              <div>
                <p className="mb-1 font-medium">Pagamentos</p>
                {detail.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-gray-600"><span>{p.paymentMethod.name}</span><span>{brl(Number(p.amount))}</span></div>
                ))}
              </div>
            )}

            {detail.installments.length > 0 && (
              <div>
                <p className="mb-1 font-medium">Parcelas</p>
                {detail.installments.map((i) => (
                  <div key={i.id} className="flex justify-between text-gray-600">
                    <span>#{i.number} — vence {new Date(i.dueDate).toLocaleDateString('pt-BR')}</span>
                    <span>{brl(Number(i.amount))} <span className="text-xs text-gray-400">{i.status}</span></span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Desconto</span><span>{brl(Number(detail.discount))}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span><span>{brl(Number(detail.total))}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => printReceipt(detail, companyName)}>Imprimir recibo</Button>
              {detail.status !== 'CANCELED' && (
                <Button variant="danger" className="flex-1" onClick={doCancel} loading={busy}>Cancelar venda</Button>
              )}
            </div>
            {detail.status === 'CANCELED' && (
              <p className="rounded-lg bg-gray-100 px-3 py-2 text-gray-600">Cancelada — {detail.cancelReason}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
