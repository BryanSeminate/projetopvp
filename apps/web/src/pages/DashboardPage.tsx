import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { api, apiMessage } from '../lib/axios';

interface Panel {
  delinquentCustomers: number;
  overdueInstallments: number;
  totalOverdue: number;
  blockedCustomers: number;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function DashboardPage() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Panel>('/delinquency/panel')
      .then((r) => setPanel(r.data))
      .catch((e) => setError(apiMessage(e)));
  }, []);

  const cards = [
    { label: 'Clientes devedores', value: panel?.delinquentCustomers ?? '—' },
    { label: 'Parcelas vencidas', value: panel?.overdueInstallments ?? '—' },
    { label: 'Total em atraso', value: panel ? brl(panel.totalOverdue) : '—' },
    { label: 'Clientes bloqueados', value: panel?.blockedCustomers ?? '—' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{c.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
