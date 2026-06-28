import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// produção não pode subir com segredos de exemplo
if (env.NODE_ENV === 'production') {
  const weak = (s: string) => s.includes('change-me') || s.length < 24;
  if (weak(env.JWT_SECRET) || weak(env.JWT_REFRESH_SECRET)) {
    console.error('❌ JWT_SECRET/JWT_REFRESH_SECRET fracos ou padrão em produção. Defina segredos fortes (>=24 chars).');
    process.exit(1);
  }
}
