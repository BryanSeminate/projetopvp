import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { apiMessage } from '../../lib/axios';
import { forgotPassword } from './auth.api';

const schema = z.object({ email: z.string().email('E-mail inválido') });
type Form = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    setError('');
    try {
      const res = await forgotPassword(values.email);
      setSent(true);
      setDevToken(res.token ?? null);
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-brand-600">Recuperar senha</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Informe seu e-mail</p>

        {sent ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-lg bg-green-50 px-3 py-2 text-green-700">
              Se o e-mail existir, enviamos instruções de redefinição.
            </p>
            {devToken && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700 break-all">
                (DEV) Token: <b>{devToken}</b><br />
                <Link to={`/redefinir-senha?token=${devToken}`} className="text-brand-600 underline">Redefinir agora</Link>
              </p>
            )}
            <Link to="/login" className="block text-center text-brand-600 hover:underline">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="E-mail" type="email" {...register('email')} error={formState.errors.email?.message} />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={formState.isSubmitting}>Enviar</Button>
            <Link to="/login" className="block text-center text-sm text-brand-600 hover:underline">Voltar ao login</Link>
          </form>
        )}
      </Card>
    </div>
  );
}
