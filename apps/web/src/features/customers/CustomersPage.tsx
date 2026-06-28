import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { listCustomers, createCustomer, type Customer } from './customers.api';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
});
type Form = z.infer<typeof schema>;

export function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listCustomers({ search: search || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  const onCreate = async (values: Form) => {
    try {
      await createCustomer({
        name: values.name,
        document: values.document || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
      });
      reset();
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Fechar' : 'Novo cliente'}</Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleSubmit(onCreate)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" {...register('name')} error={formState.errors.name?.message} />
            <Input label="CPF/CNPJ" {...register('document')} />
            <Input label="Telefone" {...register('phone')} />
            <Input label="E-mail" type="email" {...register('email')} error={formState.errors.email?.message} />
            <div className="sm:col-span-2">
              <Button type="submit" loading={formState.isSubmitting}>
                Salvar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <Input placeholder="Buscar por nome, documento ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Nome</th>
                <th className="py-2">Documento</th>
                <th className="py-2">Telefone</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">Carregando...</td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">Nenhum cliente</td>
                </tr>
              )}
              {!loading &&
                items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clientes/${c.id}`)}
                    className="cursor-pointer border-b last:border-0 hover:bg-brand-50"
                  >
                    <td className="py-2 font-medium text-brand-700">{c.name}</td>
                    <td className="py-2 text-gray-600">{c.document ?? '—'}</td>
                    <td className="py-2 text-gray-600">{c.phone ?? '—'}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {c.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400">{total} cliente(s)</p>
      </Card>
    </div>
  );
}
