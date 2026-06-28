import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export async function makeApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

/** Logs in the seeded admin and selects the demo company. Returns a scoped token. */
export async function adminAuth(app: FastifyInstance) {
  const login = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'admin@demo.com', password: 'admin123' },
  });
  const { accessToken, companies } = login.json();
  const companyId = companies[0].id;

  const sel = await app.inject({
    method: 'POST',
    url: '/auth/select-company',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { companyId },
  });
  const scoped = sel.json().accessToken as string;

  return { token: scoped, companyId };
}

/** Authenticated inject helper. */
export function authed(app: FastifyInstance, token: string, companyId: string) {
  return (opts: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; url: string; payload?: unknown }) =>
    app.inject({
      method: opts.method,
      url: opts.url,
      headers: { authorization: `Bearer ${token}`, 'x-company-id': companyId },
      payload: opts.payload as object | undefined,
    });
}

const BUSINESS_TABLES = [
  'Sale',
  'SaleItem',
  'SalePayment',
  'StockMovement',
  'CustomerInstallment',
  'AccountReceivable',
  'AccountPayable',
  'CashRegister',
  'CashMovement',
  'CustomerCredit',
  'CustomerCreditHistory',
  'Customer',
  'Product',
  'CollectionHistory',
  'AuditLog',
  'DebtRenegotiation',
  'DebtRenegotiationItem',
  'Supplier',
  'Purchase',
  'PurchaseItem',
];

/** Wipes transactional data between tests, keeping users/roles/company/payment methods. */
export async function resetBusinessData() {
  const list = BUSINESS_TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

/** Creates a product with stock for sale tests. Returns its id. */
export async function seedProduct(
  app: FastifyInstance,
  token: string,
  companyId: string,
  opts: { name?: string; salePrice?: number; stock?: number } = {},
) {
  const inject = authed(app, token, companyId);
  const p = await inject({
    method: 'POST',
    url: '/products',
    payload: { name: opts.name ?? 'Produto Teste', salePrice: opts.salePrice ?? 100 },
  });
  const productId = p.json().id as string;
  if (opts.stock) {
    await inject({ method: 'POST', url: '/stock/movements', payload: { productId, type: 'IN', quantity: opts.stock } });
  }
  return productId;
}
