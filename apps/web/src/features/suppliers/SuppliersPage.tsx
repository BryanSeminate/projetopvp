import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier, type Supplier } from './suppliers.api';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
});
type Form = z.infer<typeof schema>;

export function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setShowForm(true);
    reset({ name: s.name, document: s.document ?? '', phone: s.phone ?? '', email: s.email ?? '' });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    reset({ name: '', document: '', phone: '', email: '' });
  };
  const remove = async (s: Supplier) => {
    if (!window.confirm(`Excluir fornecedor "${s.name}"?`)) return;
    try {
      await deleteSupplier(s.id);
      setToast('Fornecedor excluído');
      load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await listSuppliers({ search: search || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const onSubmit = async (values: Form) => {
    const payload = { name: values.name, document: values.document || undefined, phone: values.phone || undefined, email: values.email || undefined };
    try {
      if (editingId) await updateSupplier(editingId, payload);
      else await createSupplier(payload);
      setToast(editingId ? 'Fornecedor atualizado' : 'Fornecedor criado');
      cancelEdit();
      load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <Button onClick={() => (showForm ? cancelEdit() : setShowForm(true))}>{showForm ? 'Fechar' : 'Novo fornecedor'}</Button>
      </div>

      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}

      {showForm && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">{editingId ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" {...register('name')} error={formState.errors.name?.message} />
            <Input label="CNPJ/CPF" {...register('document')} />
            <Input label="Telefone" {...register('phone')} />
            <Input label="E-mail" type="email" {...register('email')} error={formState.errors.email?.message} />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={formState.isSubmitting}>{editingId ? 'Atualizar' : 'Salvar'}</Button>
              {editingId && <Button type="button" variant="secondary" onClick={cancelEdit}>Cancelar</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4"><Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Nome</th><th className="py-2">Documento</th><th className="py-2">Telefone</th><th className="py-2 text-center">Status</th><th className="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Nenhum fornecedor</td></tr>}
            {items.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2 font-medium">{s.name}</td>
                <td className="py-2 text-gray-600">{s.document ?? '—'}</td>
                <td className="py-2 text-gray-600">{s.phone ?? '—'}</td>
                <td className="py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{s.isActive ? 'Ativo' : 'Inativo'}</span></td>
                <td className="py-2 text-right">
                  <button onClick={() => startEdit(s)} className="text-brand-600 hover:underline">editar</button>
                  <button onClick={() => remove(s)} className="ml-3 text-red-500 hover:underline">excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-400">{total} fornecedor(es)</p>
      </Card>
    </div>
  );
}
