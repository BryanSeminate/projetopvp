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

/** Customer with a 3x crediário (overdue), credit limit set. */
async function setup() {
  const customer = (await inject({ method: 'POST', url: '/customers', payload: { name: 'Reneg Cli', phone: '11999990000' } })).json().id;
  const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 10 });
  await inject({ method: 'PUT', url: `/credit/${customer}/limit`, payload: { creditLimit: 5000 } });
  await inject({
    method: 'POST',
    url: '/sales',
    payload: { type: 'INSTALLMENT', customerId: customer, items: [{ productId, quantity: 3 }], installmentPlan: { count: 3, firstDueDate: '2020-01-01' } },
  }); // 300 em 3x100, vencidas
  const insts = (await inject({ method: 'GET', url: `/finance/installments?customerId=${customer}` })).json().items;
  return { customer, installmentIds: insts.map((i: { id: string }) => i.id) };
}

describe('renegociação', () => {
  it('retires old installments, creates new ones, applies interest to credit', async () => {
    const { customer, installmentIds } = await setup();

    const reneg = await inject({
      method: 'POST',
      url: '/renegotiations',
      payload: { customerId: customer, installmentIds, interest: 60, count: 2, intervalDays: 30 },
    });
    expect(reneg.statusCode).toBe(201);
    const body = reneg.json();
    expect(Number(body.originalTotal)).toBe(300);
    expect(Number(body.newTotal)).toBe(360); // 300 + 60 juros
    expect(body.newInstallments.length).toBe(2);
    expect(body.newInstallments.reduce((s: number, i: { amount: string }) => s + Number(i.amount), 0)).toBe(360);

    // used credit moves from 300 to 360 (delta +60)
    const credit = await inject({ method: 'GET', url: `/credit/${customer}` });
    expect(Number(credit.json().usedCredit)).toBe(360);

    // old installments left the delinquency panel (now RENEGOTIATED)
    const overdue = await inject({ method: 'GET', url: `/finance/installments?customerId=${customer}&status=RENEGOTIATED` });
    expect(overdue.json().total).toBe(3);
  });

  it('stops collection on renegotiated debt', async () => {
    const { customer, installmentIds } = await setup();
    await inject({ method: 'POST', url: '/renegotiations', payload: { customerId: customer, installmentIds, count: 1 } });

    // new installments are future-dated → no overdue → collection refused
    const send = await inject({ method: 'POST', url: '/collections/send', payload: { customerId: customer } });
    expect(send.statusCode).toBe(400);
  });

  it('rejects renegotiating already-settled installments', async () => {
    const { customer, installmentIds } = await setup();
    await inject({ method: 'POST', url: '/renegotiations', payload: { customerId: customer, installmentIds, count: 1 } });
    // try again with the same (now RENEGOTIATED) installments
    const again = await inject({ method: 'POST', url: '/renegotiations', payload: { customerId: customer, installmentIds, count: 1 } });
    expect(again.statusCode).toBe(400);
  });
});
