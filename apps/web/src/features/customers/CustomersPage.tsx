import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, type Customer } from './customers.api';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setShowForm(true);
    reset({ name: c.name, document: c.document ?? '', phone: c.phone ?? '', email: c.email ?? '' });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    reset({ name: '', document: '', phone: '', email: '' });
  };
  const remove = async (c: Customer) => {
    if (!window.confirm(`Excluir cliente "${c.name}"?`)) return;
    try {
      await deleteCustomer(c.id);
      setToast('Cliente excluído');
      load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

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

  const onSubmit = async (values: Form) => {
    const payload = {
      name: values.name,
      document: values.document || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
    };
    try {
      if (editingId) await updateCustomer(editingId, payload);
      else await createCustomer(payload);
      setToast(editingId ? 'Cliente atualizado' : 'Cliente criado');
      cancelEdit();
      load();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => (showForm ? cancelEdit() : setShowForm(true))}>{showForm ? 'Fechar' : 'Novo cliente'}</Button>
      </div>

      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}

      {showForm && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">{editingId ? 'Editar cliente' : 'Novo cliente'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" {...register('name')} error={formState.errors.name?.message} />
            <Input label="CPF/CNPJ" {...register('document')} />
            <Input label="Telefone" {...register('phone')} />
            <Input label="E-mail" type="email" {...register('email')} error={formState.errors.email?.message} />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={formState.isSubmitting}>
                {editingId ? 'Atualizar' : 'Salvar'}
              </Button>
              {editingId && <Button type="button" variant="secondary" onClick={cancelEdit}>Cancelar</Button>}
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
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">Carregando...</td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">Nenhum cliente</td>
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
                    <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => startEdit(c)} className="text-brand-600 hover:underline">editar</button>
                      <button onClick={() => remove(c)} className="ml-3 text-red-500 hover:underline">excluir</button>
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
