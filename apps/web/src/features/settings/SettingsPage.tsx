import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { getSettings, updateSettings } from './settings.api';

export function SettingsPage() {
  const [form, setForm] = useState({ defaultInterest: '0', defaultFine: '0', daysToOverdue: '0', lowStockAlert: true });
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) =>
        setForm({
          defaultInterest: String(Number(s.defaultInterest)),
          defaultFine: String(Number(s.defaultFine)),
          daysToOverdue: String(s.daysToOverdue),
          lowStockAlert: s.lowStockAlert,
        }),
      )
      .catch((e) => setError(apiMessage(e)))
      .finally(() => setLoaded(true));
  }, []);

  const save = async () => {
    setError('');
    setToast('');
    setBusy(true);
    try {
      await updateSettings({
        defaultInterest: Number(form.defaultInterest),
        defaultFine: Number(form.defaultFine),
        daysToOverdue: Number(form.daysToOverdue),
        lowStockAlert: form.lowStockAlert,
      });
      setToast('Configurações salvas');
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <p className="text-gray-400">Carregando...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Configurações</h1>
      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Card className="max-w-xl">
        <h2 className="mb-4 font-semibold">Financeiro & crediário</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Juros padrão (% a.m.)" type="number" step="0.01" value={form.defaultInterest} onChange={(e) => setForm({ ...form, defaultInterest: e.target.value })} />
          <Input label="Multa padrão (%)" type="number" step="0.01" value={form.defaultFine} onChange={(e) => setForm({ ...form, defaultFine: e.target.value })} />
          <Input label="Carência p/ inadimplência (dias)" type="number" min={0} value={form.daysToOverdue} onChange={(e) => setForm({ ...form, daysToOverdue: e.target.value })} />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.lowStockAlert} onChange={(e) => setForm({ ...form, lowStockAlert: e.target.checked })} />
          Alertar estoque baixo
        </label>
        <Button className="mt-4" onClick={save} loading={busy}>Salvar</Button>
      </Card>
    </div>
  );
}
