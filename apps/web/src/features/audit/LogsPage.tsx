import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { apiMessage } from '../../lib/axios';
import { listAudit, type AuditLog } from './audit.api';

const dt = (s: string) => new Date(s).toLocaleString('pt-BR');

const actionBadge = (action: string) => {
  const map: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    BLOCK: 'bg-red-100 text-red-700',
    OVERRIDE: 'bg-purple-100 text-purple-700',
    SETTLE: 'bg-teal-100 text-teal-700',
    LOGIN: 'bg-gray-100 text-gray-600',
  };
  return map[action] ?? 'bg-gray-100 text-gray-600';
};

export function LogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await listAudit({ entity: entity || undefined, action: action || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, [entity, action]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Logs de auditoria</h1>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Entidade" placeholder="Ex: Sale, Customer, CustomerCredit" value={entity} onChange={(e) => setEntity(e.target.value)} />
          <Input label="Ação" placeholder="Ex: CREATE, UPDATE, OVERRIDE" value={action} onChange={(e) => setAction(e.target.value)} />
        </div>
      </Card>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Data</th>
              <th className="py-2">Usuário</th>
              <th className="py-2">Ação</th>
              <th className="py-2">Entidade</th>
              <th className="py-2 text-right">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Nenhum log</td></tr>}
            {items.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="py-2 text-gray-600">{dt(l.createdAt)}</td>
                <td className="py-2">{l.user?.name ?? '—'}</td>
                <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${actionBadge(l.action)}`}>{l.action}</span></td>
                <td className="py-2 text-gray-600">{l.entity}</td>
                <td className="py-2 text-right">
                  <button onClick={() => setDetail(l)} className="text-brand-600 hover:underline">ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-400">{total} registro(s)</p>
      </Card>

      <Modal open={detail !== null} title={`${detail?.action} · ${detail?.entity}`} onClose={() => setDetail(null)}>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-500">Usuário</p>
            <p>{detail?.user?.name ?? '—'} ({detail?.user?.email ?? '—'})</p>
          </div>
          <div>
            <p className="mb-1 text-gray-500">Antes</p>
            <pre className="max-h-40 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">{detail?.before ? JSON.stringify(detail.before, null, 2) : '—'}</pre>
          </div>
          <div>
            <p className="mb-1 text-gray-500">Depois</p>
            <pre className="max-h-40 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">{detail?.after ? JSON.stringify(detail.after, null, 2) : '—'}</pre>
          </div>
        </div>
      </Modal>
    </div>
  );
}
