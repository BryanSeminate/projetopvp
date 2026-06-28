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

/** Creates a customer with an overdue crediário installment. */
async function makeDelinquent(name: string) {
  const customer = (await inject({ method: 'POST', url: '/customers', payload: { name, phone: '11912345678' } })).json().id;
  const productId = await seedProduct(app, token, companyId, { salePrice: 200, stock: 10 });
  await inject({ method: 'PUT', url: `/credit/${customer}/limit`, payload: { creditLimit: 5000 } });
  await inject({
    method: 'POST',
    url: '/sales',
    payload: { type: 'INSTALLMENT', customerId: customer, items: [{ productId, quantity: 1 }], installmentPlan: { count: 1, firstDueDate: '2020-01-01' } },
  });
  return customer;
}

describe('inadimplência', () => {
  it('panel counts overdue customers and total', async () => {
    await makeDelinquent('Devedor Painel');
    const panel = await inject({ method: 'GET', url: '/delinquency/panel' });
    expect(panel.json().delinquentCustomers).toBeGreaterThanOrEqual(1);
    expect(panel.json().overdueInstallments).toBeGreaterThanOrEqual(1);
    expect(panel.json().totalOverdue).toBeGreaterThan(0);
  });

  it('lists debtors with days late', async () => {
    const customer = await makeDelinquent('Devedor Lista');
    const debtors = await inject({ method: 'GET', url: '/delinquency/customers?sort=days' });
    const found = debtors.json().find((d: { customerId: string }) => d.customerId === customer);
    expect(found).toBeTruthy();
    expect(found.daysLate).toBeGreaterThan(0);
  });

  it('lists blocked customers', async () => {
    const customer = await makeDelinquent('Devedor Bloqueado');
    await inject({ method: 'POST', url: `/credit/${customer}/block`, payload: { reason: 'inadimplente' } });
    const blocked = await inject({ method: 'GET', url: '/delinquency/blocked' });
    expect(blocked.json().some((b: { customerId: string }) => b.customerId === customer)).toBe(true);
  });
});
