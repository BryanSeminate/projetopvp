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
beforeEach(async () => {
  await resetBusinessData();
  await inject({ method: 'POST', url: '/cash/open', payload: { openingAmount: 0 } });
});

async function newCustomer() {
  const res = await inject({ method: 'POST', url: '/customers', payload: { name: 'Cliente Credito', phone: '11999990000' } });
  return res.json().id as string;
}

function crediario(customerId: string, productId: string, qty: number, count: number, extra: object = {}) {
  return inject({
    method: 'POST',
    url: '/sales',
    payload: { type: 'INSTALLMENT', customerId, items: [{ productId, quantity: qty }], installmentPlan: { count }, ...extra },
  });
}

describe('crédito do cliente', () => {
  it('blocks crediário when there is no credit limit', async () => {
    const customerId = await newCustomer();
    const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 10 });
    const res = await crediario(customerId, productId, 3, 3);
    expect(res.statusCode).toBe(400);
  });

  it('allows crediário within limit and increments used credit', async () => {
    const customerId = await newCustomer();
    const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 10 });
    await inject({ method: 'PUT', url: `/credit/${customerId}/limit`, payload: { creditLimit: 500 } });

    const sale = await crediario(customerId, productId, 3, 3); // 300
    expect(sale.statusCode).toBe(201);

    const credit = await inject({ method: 'GET', url: `/credit/${customerId}` });
    expect(Number(credit.json().usedCredit)).toBe(300);
    expect(credit.json().available).toBe(200);
  });

  it('blocks over-limit sale but allows it with manager override', async () => {
    const customerId = await newCustomer();
    const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 20 });
    await inject({ method: 'PUT', url: `/credit/${customerId}/limit`, payload: { creditLimit: 500 } });
    await crediario(customerId, productId, 3, 3); // used 300, avail 200

    const over = await crediario(customerId, productId, 3, 3); // 300 > 200
    expect(over.statusCode).toBe(400);

    const withOverride = await crediario(customerId, productId, 3, 3, {
      creditOverride: true,
      overrideReason: 'gerente liberou cliente fiel',
    });
    expect(withOverride.statusCode).toBe(201);
  });

  it('blocked credit is not overridable', async () => {
    const customerId = await newCustomer();
    const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 10 });
    await inject({ method: 'PUT', url: `/credit/${customerId}/limit`, payload: { creditLimit: 1000 } });
    await inject({ method: 'POST', url: `/credit/${customerId}/block`, payload: { reason: 'fraude' } });

    const res = await crediario(customerId, productId, 1, 1, {
      creditOverride: true,
      overrideReason: 'tentativa de liberar',
    });
    expect(res.statusCode).toBe(403);
  });
});
