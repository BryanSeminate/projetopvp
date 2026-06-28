import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiMessage } from '../../lib/axios';
import {
  listUsers,
  listRoles,
  createUser,
  updateUser,
  setRole,
  blockUser,
  unblockUser,
  type UserRow,
  type Role,
} from './users.api';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  // obrigatórios só na criação (validado no submit)
  password: z.string().optional(),
  roleId: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const startEdit = (u: UserRow) => {
    setEditingId(u.id);
    setShowForm(true);
    reset({ name: u.name, email: u.email, password: '', roleId: u.role?.id ?? '' });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    reset({ name: '', email: '', password: '', roleId: '' });
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await listUsers({ search: search || undefined });
      setItems(res.items);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    listRoles().then(setRoles).catch(() => undefined);
  }, []);

  const wrap = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    setToast('');
    try {
      await fn();
      setToast(ok);
      await load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  const onSubmit = async (values: Form) => {
    setError('');
    try {
      if (editingId) {
        await updateUser(editingId, { name: values.name, email: values.email });
        setToast('Usuário atualizado');
      } else {
        if (!values.password || values.password.length < 6) return setError('Senha: mínimo 6 caracteres');
        if (!values.roleId) return setError('Selecione um perfil');
        await createUser({ name: values.name, email: values.email, password: values.password, roleId: values.roleId });
        setToast('Usuário criado');
      }
      cancelEdit();
      load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Button onClick={() => (showForm ? cancelEdit() : setShowForm(true))}>{showForm ? 'Fechar' : 'Novo usuário'}</Button>
      </div>

      {toast && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{toast}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {showForm && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">{editingId ? 'Editar usuário' : 'Novo usuário'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Input label="Nome" {...register('name')} error={formState.errors.name?.message} />
            <Input label="E-mail" type="email" {...register('email')} error={formState.errors.email?.message} />
            {!editingId && (
              <>
                <Input label="Senha" type="password" {...register('password')} error={formState.errors.password?.message} />
                <div>
                  <span className="mb-1 block text-sm font-medium text-gray-700">Perfil</span>
                  <select {...register('roleId')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">—</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="flex gap-2 sm:col-span-4">
              <Button type="submit" loading={formState.isSubmitting}>{editingId ? 'Atualizar' : 'Salvar'}</Button>
              {editingId && <Button type="button" variant="secondary" onClick={cancelEdit}>Cancelar</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Nome</th>
              <th className="py-2">E-mail</th>
              <th className="py-2">Perfil</th>
              <th className="py-2 text-center">Status</th>
              <th className="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Nenhum usuário</td></tr>}
            {items.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2 font-medium">{u.name}</td>
                <td className="py-2 text-gray-600">{u.email}</td>
                <td className="py-2">
                  <select
                    value={u.role?.id ?? ''}
                    onChange={(e) => wrap(() => setRole(u.id, e.target.value), 'Perfil atualizado')}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  >
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td className="py-2 text-center">
                  {u.isBlocked ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Bloqueado</span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Ativo</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <Button variant="secondary" onClick={() => startEdit(u)}>Editar</Button>
                  {u.isBlocked ? (
                    <Button variant="secondary" className="ml-2" onClick={() => wrap(() => unblockUser(u.id), 'Desbloqueado')}>Desbloquear</Button>
                  ) : (
                    <Button variant="danger" className="ml-2" onClick={() => wrap(() => blockUser(u.id), 'Bloqueado')}>Bloquear</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
