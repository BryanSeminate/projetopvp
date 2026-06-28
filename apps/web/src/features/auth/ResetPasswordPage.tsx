import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { apiMessage } from '../../lib/axios';
import { resetPassword } from './auth.api';

const schema = z
  .object({
    token: z.string().min(10, 'Token inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'As senhas não conferem' });
type Form = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { token: params.get('token') ?? '' },
  });

  const onSubmit = async (values: Form) => {
    setError('');
    try {
      await resetPassword(values.token, values.password);
      navigate('/login');
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-brand-600">Redefinir senha</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Token" {...register('token')} error={formState.errors.token?.message} />
          <Input label="Nova senha" type="password" {...register('password')} error={formState.errors.password?.message} />
          <Input label="Confirmar senha" type="password" {...register('confirm')} error={formState.errors.confirm?.message} />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>Redefinir</Button>
          <Link to="/login" className="block text-center text-sm text-brand-600 hover:underline">Voltar ao login</Link>
        </form>
      </Card>
    </div>
  );
}
