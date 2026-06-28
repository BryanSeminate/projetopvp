import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { apiMessage } from '../../lib/axios';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  createCategory,
  listBrands,
  createBrand,
  type Product,
  type Taxonomy,
} from './products.api';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  barcode: z.string().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [brands, setBrands] = useState<Taxonomy[]>([]);

  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setShowForm(true);
    reset({
      name: p.name,
      barcode: p.barcode ?? '',
      costPrice: p.costPrice ? Number(p.costPrice) : undefined,
      salePrice: Number(p.salePrice),
      stock: undefined, // estoque se ajusta pela tela de Estoque
      minStock: undefined,
      categoryId: p.category?.id ?? '',
      brandId: p.brand?.id ?? '',
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    reset({ name: '', barcode: '', categoryId: '', brandId: '' });
  };
  const remove = async (p: Product) => {
    if (!window.confirm(`Excluir produto "${p.name}"?`)) return;
    try {
      await deleteProduct(p.id);
      setToast('Produto excluído');
      load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listProducts({ search: search || undefined, page });
      setItems(res.items);
      setTotal(res.total);
      setPageSize(res.pageSize);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const loadTaxonomies = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([listCategories(), listBrands()]);
      setCategories(c);
      setBrands(b);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    loadTaxonomies();
  }, [loadTaxonomies]);

  const addCategory = async () => {
    const name = window.prompt('Nome da categoria');
    if (!name) return;
    try {
      await createCategory(name);
      loadTaxonomies();
    } catch (e) {
      setError(apiMessage(e));
    }
  };
  const addBrand = async () => {
    const name = window.prompt('Nome da marca');
    if (!name) return;
    try {
      await createBrand(name);
      loadTaxonomies();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const onSubmit = async (values: Form) => {
    const base = {
      name: values.name,
      barcode: values.barcode || undefined,
      costPrice: values.costPrice,
      salePrice: values.salePrice,
      minStock: values.minStock,
      categoryId: values.categoryId || undefined,
      brandId: values.brandId || undefined,
    };
    try {
      if (editingId) {
        await updateProduct(editingId, base); // estoque não muda aqui (use a tela de Estoque)
      } else {
        await createProduct({ ...base, stock: values.stock });
      }
      setToast(editingId ? 'Produto atualizado' : 'Produto criado');
      cancelEdit();
      load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Button onClick={() => (showForm ? cancelEdit() : setShowForm(true))}>{showForm ? 'Fechar' : 'Novo produto'}</Button>
      </div>

      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}

      {showForm && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">{editingId ? 'Editar produto' : 'Novo produto'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Nome" {...register('name')} error={formState.errors.name?.message} />
            <Input label="Código de barras" {...register('barcode')} />
            <div />
            <Input label="Preço de custo" type="number" step="0.01" {...register('costPrice')} />
            <Input label="Preço de venda" type="number" step="0.01" {...register('salePrice')} />
            {!editingId && <Input label="Estoque inicial" type="number" step="0.001" {...register('stock')} />}
            <Input label="Estoque mínimo" type="number" step="0.001" {...register('minStock')} />
            <div>
              <span className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                Categoria <button type="button" onClick={addCategory} className="text-brand-600">+ nova</button>
              </span>
              <select {...register('categoryId')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <span className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                Marca <button type="button" onClick={addBrand} className="text-brand-600">+ nova</button>
              </span>
              <select {...register('brandId')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" loading={formState.isSubmitting}>{editingId ? 'Atualizar' : 'Salvar'}</Button>
              {editingId && <Button type="button" variant="secondary" onClick={cancelEdit}>Cancelar</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <Input placeholder="Buscar por nome, código ou SKU..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Produto</th>
                <th className="py-2">Código</th>
                <th className="py-2">Categoria</th>
                <th className="py-2 text-right">Preço</th>
                <th className="py-2 text-right">Estoque</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Carregando...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Nenhum produto</td></tr>}
              {!loading && items.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-gray-600">{p.barcode ?? '—'}</td>
                  <td className="py-2 text-gray-600">{p.category?.name ?? '—'}</td>
                  <td className="py-2 text-right">{brl(Number(p.salePrice))}</td>
                  <td className="py-2 text-right">{Number(p.stock)}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => startEdit(p)} className="text-brand-600 hover:underline">editar</button>
                    <button onClick={() => remove(p)} className="ml-3 text-red-500 hover:underline">excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      </Card>
    </div>
  );
}
