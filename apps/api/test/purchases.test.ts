import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, adminAuth, authed, resetBusinessData, seedProduct } from './helpers.js';

let app: FastifyInstance;
let token: string;
let companyId: string;
let inject: ReturnType<typeof authed>;

beforeAll(async () => {
  app = await makeApp();
  const a = await adminAuth(app);
  token = a.token;
  companyId = a.companyId;
  inject = authed(app, token, companyId);
});
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetBusinessData(); });

async function newSupplier() {
  const res = await inject({ method: 'POST', url: '/suppliers', payload: { name: 'Fornecedor X', document: '11222333000181' } });
  return res.json().id as string;
}

describe('fornecedores', () => {
  it('creates a supplier and rejects duplicate document', async () => {
    const ok = await inject({ method: 'POST', url: '/suppliers', payload: { name: 'Forn A', document: '11222333000181' } });
    expect(ok.statusCode).toBe(201);
    const dup = await inject({ method: 'POST', url: '/suppliers', payload: { name: 'Forn B', document: '11222333000181' } });
    expect(dup.statusCode).toBe(409);
  });
});

describe('compras', () => {
  it('purchase increases stock and updates product cost', async () => {
    const supplierId = await newSupplier();
    const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 0 });

    const purchase = await inject({
      method: 'POST',
      url: '/purchases',
      payload: { supplierId, items: [{ productId, quantity: 20, unitCost: 40 }] },
    });
    expect(purchase.statusCode).toBe(201);
    expect(Number(purchase.json().total)).toBe(800);

    const prod = await inject({ method: 'GET', url: `/products/${productId}` });
    expect(Number(prod.json().stock)).toBe(20);
    expect(Number(prod.json().costPrice)).toBe(40);
  });

  it('optionally generates an account payable', async () => {
    const supplierId = await newSupplier();
    const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 0 });

    await inject({
      method: 'POST',
      url: '/purchases',
      payload: { supplierId, items: [{ productId, quantity: 10, unitCost: 25 }], generatePayable: true, dueDate: '2026-08-01' },
    });

    const payables = await inject({ method: 'GET', url: '/finance/payables' });
    const found = payables.json().items.find((p: { amount: string }) => Number(p.amount) === 250);
    expect(found).toBeTruthy();
  });

  it('requires dueDate when generating a payable', async () => {
    const supplierId = await newSupplier();
    const productId = await seedProduct(app, token, companyId, { stock: 0 });
    const res = await inject({
      method: 'POST',
      url: '/purchases',
      payload: { supplierId, items: [{ productId, quantity: 1, unitCost: 10 }], generatePayable: true },
    });
    expect(res.statusCode).toBe(422);
  });
});
