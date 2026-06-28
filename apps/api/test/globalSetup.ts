import { execSync } from 'node:child_process';

const TEST_DB =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5434/sistema_mateus_test?schema=public';

/** Runs once before the whole suite: migrate + seed the test database. */
export default function setup() {
  const env = { ...process.env, DATABASE_URL: TEST_DB };
  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npx tsx prisma/seed.ts', { env, stdio: 'inherit' });
}
