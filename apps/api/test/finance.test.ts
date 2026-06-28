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

describe('financeiro', () => {
  it('paying an installment releases the customer credit', async () => {
    const customer = (await inject({ method: 'POST', url: '/customers', payload: { name: 'Fin Cli' } })).json().id;
    const productId = await seedProduct(app, token, companyId, { salePrice: 150, stock: 10 });
    await inject({ method: 'PUT', url: `/credit/${customer}/limit`, payload: { creditLimit: 1000 } });
    await inject({
      method: 'POST',
      url: '/sales',
      payload: { type: 'INSTALLMENT', customerId: customer, items: [{ productId, quantity: 3 }], installmentPlan: { count: 3 } },
    }); // 450, 3x150

    const before = await inject({ method: 'GET', url: `/credit/${customer}` });
    expect(Number(before.json().usedCredit)).toBe(450);

    const insts = await inject({ method: 'GET', url: `/finance/installments?customerId=${customer}` });
    const first = insts.json().items[0];
    const pay = await inject({ method: 'POST', url: `/finance/installments/${first.id}/pay`, payload: { amount: 150 } });
    expect(pay.statusCode).toBe(200);
    expect(pay.json().status).toBe('PAID');

    const after = await inject({ method: 'GET', url: `/credit/${customer}` });
    expect(Number(after.json().usedCredit)).toBe(300);
  });

  it('settles a payable: partial then full', async () => {
    const created = await inject({
      method: 'POST',
      url: '/finance/payables',
      payload: { description: 'Fornecedor', amount: 300, dueDate: '2026-07-10' },
    });
    const id = created.json().id;

    const partial = await inject({ method: 'POST', url: `/finance/payables/${id}/pay`, payload: { amount: 100 } });
    expect(partial.json().status).toBe('PARTIAL');

    const full = await inject({ method: 'POST', url: `/finance/payables/${id}/pay`, payload: { amount: 200, interest: 5, fine: 10 } });
    expect(full.json().status).toBe('PAID');
    expect(Number(full.json().interest)).toBe(5);
    expect(Number(full.json().fine)).toBe(10);

    const over = await inject({ method: 'POST', url: `/finance/payables/${id}/pay`, payload: { amount: 50 } });
    expect(over.statusCode).toBe(400);
  });
});
