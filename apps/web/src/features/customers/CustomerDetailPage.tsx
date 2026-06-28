import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { apiMessage } from '../../lib/axios';
import { getCustomer, type Customer } from './customers.api';
import {
  getCredit,
  setCreditLimit,
  blockCredit,
  unblockCredit,
  getCreditHistory,
  type Credit,
  type CreditHistoryItem,
} from '../credit/credit.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (s: string) => new Date(s).toLocaleString('pt-BR');

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [credit, setCredit] = useState<Credit | null>(null);
  const [history, setHistory] = useState<CreditHistoryItem[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [limitModal, setLimitModal] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  const [limitValue, setLimitValue] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [c, cr, h] = await Promise.all([getCustomer(id), getCredit(id), getCreditHistory(id)]);
      setCustomer(c);
      setCredit(cr);
      setHistory(h);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveLimit = async () => {
    setBusy(true);
    setError('');
    try {
      await setCreditLimit(id, Number(limitValue || 0));
      setLimitModal(false);
      setToast('Limite atualizado');
      await load();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doBlock = async () => {
    setBusy(true);
    setError('');
    try {
      await blockCredit(id, blockReason);
      setBlockModal(false);
      setBlockReason('');
      setToast('Crédito bloqueado');
      await load();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doUnblock = async () => {
    setError('');
    try {
      await unblockCredit(id);
      setToast('Crédito desbloqueado');
      await load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  if (!customer || !credit) return <p className="text-gray-400">Carregando...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/clientes" className="text-brand-600 hover:underline">← Clientes</Link>
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        {credit.delinquent && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Inadimplente</span>}
      </div>

      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* dados */}
        <Card>
          <h2 className="mb-3 font-semibold">Dados</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Documento</dt><dd>{customer.document ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Telefone</dt><dd>{customer.phone ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">E-mail</dt><dd>{customer.email ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd>{customer.isActive ? 'Ativo' : 'Inativo'}</dd></div>
          </dl>
        </Card>

        {/* crédito */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Crédito</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs ${credit.status === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {credit.status === 'BLOCKED' ? 'Bloqueado' : 'Ativo'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-sm text-gray-500">Limite</p><p className="text-xl font-bold">{brl(Number(credit.creditLimit))}</p></div>
            <div><p className="text-sm text-gray-500">Usado</p><p className="text-xl font-bold text-amber-600">{brl(Number(credit.usedCredit))}</p></div>
            <div><p className="text-sm text-gray-500">Disponível</p><p className="text-xl font-bold text-green-600">{brl(credit.available)}</p></div>
          </div>
          {credit.status === 'BLOCKED' && credit.blockReason && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Motivo: {credit.blockReason}</p>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => { setLimitValue(credit.creditLimit); setLimitModal(true); }}>Editar limite</Button>
            {credit.status === 'BLOCKED' ? (
              <Button onClick={doUnblock}>Desbloquear</Button>
            ) : (
              <Button variant="danger" onClick={() => setBlockModal(true)}>Bloquear</Button>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 font-semibold">Histórico de crédito</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Data</th>
              <th className="py-2">Tipo</th>
              <th className="py-2 text-right">Valor</th>
              <th className="py-2">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sem histórico</td></tr>}
            {history.map((h) => (
              <tr key={h.id} className="border-b last:border-0">
                <td className="py-2 text-gray-600">{dt(h.createdAt)}</td>
                <td className="py-2 font-medium">{h.type}</td>
                <td className="py-2 text-right">{h.amount != null ? brl(Number(h.amount)) : '—'}</td>
                <td className="py-2 text-gray-600">{h.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={limitModal} title="Editar limite de crédito" onClose={() => setLimitModal(false)}>
        <Input label="Novo limite" type="number" step="0.01" value={limitValue} onChange={(e) => setLimitValue(e.target.value)} />
        <Button className="mt-3 w-full" onClick={saveLimit} loading={busy}>Salvar</Button>
      </Modal>

      <Modal open={blockModal} title="Bloquear crédito" onClose={() => setBlockModal(false)}>
        <Input label="Motivo" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
        <Button variant="danger" className="mt-3 w-full" onClick={doBlock} loading={busy} disabled={blockReason.trim().length < 3}>
          Bloquear
        </Button>
      </Modal>
    </div>
  );
}
