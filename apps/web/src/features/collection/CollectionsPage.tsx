import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import {
  listMessages,
  createMessage,
  deleteMessage,
  listHistory,
  listRules,
  createRule,
  deleteRule,
  runCollections,
  type CollectionMessage,
  type CollectionHistoryItem,
  type CollectionRule,
} from './collection.api';

const dt = (s: string) => new Date(s).toLocaleString('pt-BR');
type Tab = 'templates' | 'rules' | 'history';

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    SENT: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return map[s] ?? 'bg-gray-100 text-gray-600';
};

export function CollectionsPage() {
  const [tab, setTab] = useState<Tab>('templates');
  const [messages, setMessages] = useState<CollectionMessage[]>([]);
  const [history, setHistory] = useState<CollectionHistoryItem[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [form, setForm] = useState({ name: '', template: '' });
  const [rules, setRules] = useState<CollectionRule[]>([]);
  const [ruleForm, setRuleForm] = useState({ name: '', daysOverdue: '1', startHour: '8', endHour: '20' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [m, h, rl] = await Promise.all([listMessages(), listHistory({}), listRules()]);
      setMessages(m);
      setHistory(h.items);
      setRules(rl);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, []);

  const addRule = async () => {
    setError('');
    setToast('');
    try {
      await createRule({
        name: ruleForm.name,
        daysOverdue: Number(ruleForm.daysOverdue),
        startHour: Number(ruleForm.startHour),
        endHour: Number(ruleForm.endHour),
      });
      setRuleForm({ name: '', daysOverdue: '1', startHour: '8', endHour: '20' });
      setToast('Regra criada');
      await load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const removeRule = async (id: string) => {
    if (!window.confirm('Remover esta regra?')) return;
    try {
      await deleteRule(id);
      await load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const runNow = async () => {
    setError('');
    setToast('');
    setBusy(true);
    try {
      const res = await runCollections();
      setToast(`Motor executado: ${res.sent} cobrança(s) gerada(s)`);
      await load();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (form.name.trim().length < 2 || form.template.trim().length < 10)
      return setError('Nome (2+) e modelo (10+) obrigatórios');
    setBusy(true);
    setError('');
    setToast('');
    try {
      await createMessage(form);
      setForm({ name: '', template: '' });
      setToast('Modelo criado');
      await load();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remover este modelo?')) return;
    try {
      await deleteMessage(id);
      setToast('Modelo removido');
      await load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cobranças</h1>
        <Button onClick={runNow} loading={busy}>Rodar cobrança agora</Button>
      </div>

      <div className="mb-4 flex gap-2">
        {([['templates', 'Modelos'], ['rules', 'Regras automáticas'], ['history', 'Histórico']] as [Tab, string][]).map(([t, label]) => (
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

      {tab === 'templates' && (
        <>
          <Card className="mb-4">
            <h2 className="mb-3 font-semibold">Novo modelo</h2>
            <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Mensagem</span>
              <textarea
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="Olá {nome}, a parcela {parcela} de R$ {valor} venceu há {dias} dias..."
              />
            </label>
            <p className="mt-1 text-xs text-gray-400">Variáveis: {'{nome} {valor} {dias} {parcela} {empresa}'}</p>
            <Button className="mt-3" onClick={add} loading={busy}>Salvar modelo</Button>
          </Card>

          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Nome</th>
                  <th className="py-2">Mensagem</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400">Nenhum modelo</td></tr>}
                {messages.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{m.name}</td>
                    <td className="py-2 text-gray-600">{m.template}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => remove(m.id)} className="text-red-500 hover:underline">remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'rules' && (
        <>
          <Card className="mb-4">
            <h2 className="mb-3 font-semibold">Nova regra</h2>
            <p className="mb-3 text-sm text-gray-500">
              Cobra clientes com parcelas vencidas há ≥ X dias, dentro da janela de horário. O motor roda de hora em hora (ou no botão acima).
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input label="Nome" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
              <Input label="Dias de atraso" type="number" min={0} value={ruleForm.daysOverdue} onChange={(e) => setRuleForm({ ...ruleForm, daysOverdue: e.target.value })} />
              <Input label="Hora início" type="number" min={0} max={23} value={ruleForm.startHour} onChange={(e) => setRuleForm({ ...ruleForm, startHour: e.target.value })} />
              <Input label="Hora fim" type="number" min={1} max={24} value={ruleForm.endHour} onChange={(e) => setRuleForm({ ...ruleForm, endHour: e.target.value })} />
            </div>
            <Button className="mt-3" onClick={addRule} disabled={ruleForm.name.trim().length < 2}>Salvar regra</Button>
          </Card>

          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Nome</th>
                  <th className="py-2 text-center">Dias atraso</th>
                  <th className="py-2 text-center">Janela</th>
                  <th className="py-2 text-center">Ativa</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-400">Nenhuma regra</td></tr>}
                {rules.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2 text-center">≥ {r.daysOverdue}d</td>
                    <td className="py-2 text-center">{r.startHour}h–{r.endHour}h</td>
                    <td className="py-2 text-center">{r.isActive ? 'Sim' : 'Não'}</td>
                    <td className="py-2 text-right"><button onClick={() => removeRule(r.id)} className="text-red-500 hover:underline">remover</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'history' && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Data</th>
                <th className="py-2">Canal</th>
                <th className="py-2">Status</th>
                <th className="py-2">Mensagem</th>
                <th className="py-2 text-right">Abrir</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-400">Sem cobranças</td></tr>}
              {history.map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="py-2 text-gray-600">{dt(h.createdAt)}</td>
                  <td className="py-2">{h.channel}</td>
                  <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(h.status)}`}>{h.status}</span></td>
                  <td className="py-2 text-gray-600">{h.content.slice(0, 60)}…</td>
                  <td className="py-2 text-right">
                    {h.link ? <a href={h.link} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">WhatsApp</a> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
