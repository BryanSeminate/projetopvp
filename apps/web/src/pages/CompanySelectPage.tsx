import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { apiMessage } from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import { selectCompany } from '../features/auth/auth.api';

export function CompanySelectPage() {
  const navigate = useNavigate();
  const companies = useAuthStore((s) => s.companies);
  const token = useAuthStore((s) => s.accessToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setActive = useCompanyStore((s) => s.setActive);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  if (!token) {
    navigate('/login');
    return null;
  }

  const choose = async (id: string) => {
    setError('');
    setBusy(id);
    try {
      const sel = await selectCompany(id);
      setAccessToken(sel.accessToken);
      setActive(sel.company);
      navigate('/');
    } catch (err) {
      setError(apiMessage(err, 'Falha ao selecionar empresa'));
      setBusy(null);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-bold">Selecione a empresa</h1>
        <p className="mb-4 text-sm text-gray-500">Você tem acesso a {companies.length} empresa(s)</p>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => choose(c.id)}
              disabled={busy !== null}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-xs uppercase text-gray-400">{c.role}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
