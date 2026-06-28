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

async function makeDelinquent(phone: string | null) {
  const customer = (await inject({ method: 'POST', url: '/customers', payload: { name: 'Cobranca Cli', phone: phone ?? undefined } })).json().id;
  const productId = await seedProduct(app, token, companyId, { salePrice: 200, stock: 10 });
  await inject({ method: 'PUT', url: `/credit/${customer}/limit`, payload: { creditLimit: 5000 } });
  await inject({
    method: 'POST',
    url: '/sales',
    payload: { type: 'INSTALLMENT', customerId: customer, items: [{ productId, quantity: 1 }], installmentPlan: { count: 1, firstDueDate: '2020-01-01' } },
  });
  return customer;
}

describe('cobrança', () => {
  it('sends a manual collection and returns a wa.me link', async () => {
    const customer = await makeDelinquent('11912345678');
    const res = await inject({ method: 'POST', url: '/collections/send', payload: { customerId: customer } });
    expect(res.statusCode).toBe(201);
    expect(res.json().link).toContain('wa.me');
    expect(res.json().content.length).toBeGreaterThan(10);
  });

  it('blocks duplicate collection on the same day', async () => {
    const customer = await makeDelinquent('11912345678');
    await inject({ method: 'POST', url: '/collections/send', payload: { customerId: customer } });
    const dup = await inject({ method: 'POST', url: '/collections/send', payload: { customerId: customer } });
    expect(dup.statusCode).toBe(409);
  });

  it('rejects collection for customer without phone', async () => {
    const customer = await makeDelinquent(null);
    const res = await inject({ method: 'POST', url: '/collections/send', payload: { customerId: customer } });
    expect(res.statusCode).toBe(400);
  });

  it('rejects collection when customer has no overdue installment', async () => {
    const customer = (await inject({ method: 'POST', url: '/customers', payload: { name: 'Em Dia', phone: '11900000000' } })).json().id;
    const res = await inject({ method: 'POST', url: '/collections/send', payload: { customerId: customer } });
    expect(res.statusCode).toBe(400);
  });

  it('lists and creates message templates', async () => {
    const list = await inject({ method: 'GET', url: '/collections/messages' });
    expect(list.statusCode).toBe(200);
    const created = await inject({ method: 'POST', url: '/collections/messages', payload: { name: 'Lembrete', template: 'Olá {nome}, sua parcela venceu.' } });
    expect(created.statusCode).toBe(201);
  });
});
