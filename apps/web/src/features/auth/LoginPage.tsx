import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { apiMessage } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { login, selectCompany } from './auth.api';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type Form = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setActive = useCompanyStore((s) => s.setActive);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    setError('');
    try {
      const res = await login(values.email, values.password);
      setSession(res);

      // auto-select when the user has a single company
      if (res.companies.length === 1) {
        const c = res.companies[0];
        const sel = await selectCompany(c.id);
        setAccessToken(sel.accessToken);
        setActive(sel.company);
        navigate('/');
      } else {
        navigate('/empresas');
      }
    } catch (err) {
      setError(apiMessage(err, 'Falha no login'));
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-brand-600">Sistema Mateus</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Entre na sua conta</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="E-mail" type="email" autoComplete="email" {...register('email')} error={formState.errors.email?.message} />
          <Input label="Senha" type="password" autoComplete="current-password" {...register('password')} error={formState.errors.password?.message} />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
