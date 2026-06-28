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

async function dinheiroId() {
  const res = await inject({ method: 'GET', url: '/sales/payment-methods' });
  return res.json().find((m: { isCash: boolean }) => m.isCash).id as string;
}

describe('PDV / vendas', () => {
  it('refuses sale without open cash register', async () => {
    const productId = await seedProduct(app, token, companyId, { stock: 10 });
    const din = await dinheiroId();
    const res = await inject({
      method: 'POST',
      url: '/sales',
      payload: { type: 'CASH', items: [{ productId, quantity: 1 }], payments: [{ paymentMethodId: din, amount: 100 }] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cash sale decrements stock and feeds the cash drawer', async () => {
    await inject({ method: 'POST', url: '/cash/open', payload: { openingAmount: 0 } });
    const productId = await seedProduct(app, token, companyId, { salePrice: 50, stock: 10 });
    const din = await dinheiroId();

    const sale = await inject({
      method: 'POST',
      url: '/sales',
      payload: { type: 'CASH', items: [{ productId, quantity: 2, unitPrice: 50 }], payments: [{ paymentMethodId: din, amount: 100 }] },
    });
    expect(sale.statusCode).toBe(201);
    expect(Number(sale.json().total)).toBe(100);

    const prod = await inject({ method: 'GET', url: `/products/${productId}` });
    expect(Number(prod.json().stock)).toBe(8);

    const cash = await inject({ method: 'GET', url: '/cash/current' });
    expect(cash.json().expectedAmount).toBe(100);
  });

  it('rejects cash sale with insufficient payment', async () => {
    await inject({ method: 'POST', url: '/cash/open', payload: { openingAmount: 0 } });
    const productId = await seedProduct(app, token, companyId, { salePrice: 50, stock: 10 });
    const din = await dinheiroId();
    const res = await inject({
      method: 'POST',
      url: '/sales',
      payload: { type: 'CASH', items: [{ productId, quantity: 1, unitPrice: 50 }], payments: [{ paymentMethodId: din, amount: 10 }] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cancelling a sale restores stock', async () => {
    await inject({ method: 'POST', url: '/cash/open', payload: { openingAmount: 0 } });
    const productId = await seedProduct(app, token, companyId, { salePrice: 50, stock: 10 });
    const din = await dinheiroId();
    const sale = await inject({
      method: 'POST',
      url: '/sales',
      payload: { type: 'CASH', items: [{ productId, quantity: 3, unitPrice: 50 }], payments: [{ paymentMethodId: din, amount: 150 }] },
    });
    const saleId = sale.json().id;

    const cancel = await inject({ method: 'POST', url: `/sales/${saleId}/cancel`, payload: { reason: 'teste cancelamento' } });
    expect(cancel.statusCode).toBe(200);

    const prod = await inject({ method: 'GET', url: `/products/${productId}` });
    expect(Number(prod.json().stock)).toBe(10);
  });
});
