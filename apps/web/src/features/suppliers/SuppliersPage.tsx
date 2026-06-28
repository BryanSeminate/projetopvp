import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import { listSuppliers, createSupplier, type Supplier } from './suppliers.api';

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
  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema) });

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

  const onCreate = async (values: Form) => {
    try {
      await createSupplier({ name: values.name, document: values.document || undefined, phone: values.phone || undefined, email: values.email || undefined });
      reset();
      setShowForm(false);
      load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Fechar' : 'Novo fornecedor'}</Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleSubmit(onCreate)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" {...register('name')} error={formState.errors.name?.message} />
            <Input label="CNPJ/CPF" {...register('document')} />
            <Input label="Telefone" {...register('phone')} />
            <Input label="E-mail" type="email" {...register('email')} error={formState.errors.email?.message} />
            <div className="sm:col-span-2"><Button type="submit" loading={formState.isSubmitting}>Salvar</Button></div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4"><Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Nome</th><th className="py-2">Documento</th><th className="py-2">Telefone</th><th className="py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">Nenhum fornecedor</td></tr>}
            {items.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2 font-medium">{s.name}</td>
                <td className="py-2 text-gray-600">{s.document ?? '—'}</td>
                <td className="py-2 text-gray-600">{s.phone ?? '—'}</td>
                <td className="py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{s.isActive ? 'Ativo' : 'Inativo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-400">{total} fornecedor(es)</p>
      </Card>
    </div>
  );
}
