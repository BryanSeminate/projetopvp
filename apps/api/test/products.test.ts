import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, adminAuth, authed, resetBusinessData } from './helpers.js';

let app: FastifyInstance;
let inject: ReturnType<typeof authed>;

beforeAll(async () => {
  app = await makeApp();
  const a = await adminAuth(app);
  inject = authed(app, a.token, a.companyId);
});
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetBusinessData(); });

describe('produtos', () => {
  it('creates a product and finds it by barcode', async () => {
    const create = await inject({ method: 'POST', url: '/products', payload: { name: 'Refri', barcode: '111', salePrice: 8.9 } });
    expect(create.statusCode).toBe(201);
    const byCode = await inject({ method: 'GET', url: '/products/barcode/111' });
    expect(byCode.statusCode).toBe(200);
    expect(byCode.json().name).toBe('Refri');
  });

  it('rejects duplicate barcode', async () => {
    await inject({ method: 'POST', url: '/products', payload: { name: 'Produto A', barcode: '222' } });
    const dup = await inject({ method: 'POST', url: '/products', payload: { name: 'Produto B', barcode: '222' } });
    expect(dup.statusCode).toBe(409);
  });

  it('soft deletes a product (removed from list)', async () => {
    const p = await inject({ method: 'POST', url: '/products', payload: { name: 'Temp', barcode: '333' } });
    const id = p.json().id;
    await inject({ method: 'DELETE', url: `/products/${id}` });
    const list = await inject({ method: 'GET', url: '/products?search=Temp' });
    expect(list.json().total).toBe(0);
  });
});

describe('estoque', () => {
  async function makeProduct() {
    const p = await inject({ method: 'POST', url: '/products', payload: { name: 'Estoque', barcode: '900', minStock: 5 } });
    return p.json().id as string;
  }

  it('IN then OUT adjusts the balance', async () => {
    const id = await makeProduct();
    await inject({ method: 'POST', url: '/stock/movements', payload: { productId: id, type: 'IN', quantity: 100 } });
    const out = await inject({ method: 'POST', url: '/stock/movements', payload: { productId: id, type: 'OUT', quantity: 30 } });
    expect(Number(out.json().balanceAfter)).toBe(70);
  });

  it('rejects OUT beyond available stock', async () => {
    const id = await makeProduct();
    await inject({ method: 'POST', url: '/stock/movements', payload: { productId: id, type: 'IN', quantity: 10 } });
    const out = await inject({ method: 'POST', url: '/stock/movements', payload: { productId: id, type: 'OUT', quantity: 50 } });
    expect(out.statusCode).toBe(400);
  });

  it('requires a reason on ADJUSTMENT', async () => {
    const id = await makeProduct();
    const res = await inject({ method: 'POST', url: '/stock/movements', payload: { productId: id, type: 'ADJUSTMENT', quantity: 50 } });
    expect(res.statusCode).toBe(422);
  });

  it('reports low stock', async () => {
    const id = await makeProduct();
    await inject({ method: 'POST', url: '/stock/movements', payload: { productId: id, type: 'IN', quantity: 3 } });
    const low = await inject({ method: 'GET', url: '/stock/low' });
    expect(low.json().some((p: { id: string }) => p.id === id)).toBe(true);
  });
});
