import { defineConfig } from 'vitest/config';

// honor an externally-provided DATABASE_URL (CI); fall back to the local dev port
const TEST_DB =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5434/sistema_mateus_test?schema=public';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './test/globalSetup.ts',
    fileParallelism: false, // shared test DB → run files serially
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DB,
      JWT_SECRET: 'test-access-secret-1234567890',
      JWT_REFRESH_SECRET: 'test-refresh-secret-1234567890',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
