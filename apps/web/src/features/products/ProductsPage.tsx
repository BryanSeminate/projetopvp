import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import {
  listProducts,
  createProduct,
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [brands, setBrands] = useState<Taxonomy[]>([]);

  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listProducts({ search: search || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

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

  const onCreate = async (values: Form) => {
    try {
      await createProduct({
        name: values.name,
        barcode: values.barcode || undefined,
        costPrice: values.costPrice,
        salePrice: values.salePrice,
        stock: values.stock,
        minStock: values.minStock,
        categoryId: values.categoryId || undefined,
        brandId: values.brandId || undefined,
      });
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
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Fechar' : 'Novo produto'}</Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleSubmit(onCreate)} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Nome" {...register('name')} error={formState.errors.name?.message} />
            <Input label="Código de barras" {...register('barcode')} />
            <div />
            <Input label="Preço de custo" type="number" step="0.01" {...register('costPrice')} />
            <Input label="Preço de venda" type="number" step="0.01" {...register('salePrice')} />
            <Input label="Estoque inicial" type="number" step="0.001" {...register('stock')} />
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
            <div className="sm:col-span-3">
              <Button type="submit" loading={formState.isSubmitting}>Salvar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <Input placeholder="Buscar por nome, código ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Carregando...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Nenhum produto</td></tr>}
              {!loading && items.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-gray-600">{p.barcode ?? '—'}</td>
                  <td className="py-2 text-gray-600">{p.category?.name ?? '—'}</td>
                  <td className="py-2 text-right">{brl(Number(p.salePrice))}</td>
                  <td className="py-2 text-right">{Number(p.stock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400">{total} produto(s)</p>
      </Card>
    </div>
  );
}
