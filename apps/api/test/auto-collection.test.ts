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

/** Customer with an overdue installment + a default collection rule (0 days, 24h window). */
async function setup(phone: string | null, autoCollection = true) {
  const customer = (await inject({ method: 'POST', url: '/customers', payload: { name: 'Auto Cli', phone: phone ?? undefined } })).json().id;
  const productId = await seedProduct(app, token, companyId, { salePrice: 200, stock: 10 });
  await inject({ method: 'PUT', url: `/credit/${customer}/limit`, payload: { creditLimit: 5000 } });
  if (!autoCollection) await inject({ method: 'PATCH', url: `/credit/${customer}/auto-collection`, payload: { autoCollection: false } });
  await inject({
    method: 'POST',
    url: '/sales',
    payload: { type: 'INSTALLMENT', customerId: customer, items: [{ productId, quantity: 1 }], installmentPlan: { count: 1, firstDueDate: '2020-01-01' } },
  });
  await inject({ method: 'POST', url: '/collections/rules', payload: { name: 'R1', daysOverdue: 0, startHour: 0, endHour: 24 } });
  return customer;
}

describe('cobrança automática', () => {
  it('engine creates a collection for an eligible delinquent customer', async () => {
    const customer = await setup('11999990000');
    const run = await inject({ method: 'POST', url: '/collections/run' });
    expect(run.statusCode).toBe(200);
    expect(run.json().sent).toBe(1);

    const hist = await inject({ method: 'GET', url: `/collections/history?customerId=${customer}` });
    expect(hist.json().total).toBe(1);
    expect(hist.json().items[0].status).toBe('SENT');
  });

  it('does not duplicate on the same day', async () => {
    await setup('11999990000');
    await inject({ method: 'POST', url: '/collections/run' });
    const second = await inject({ method: 'POST', url: '/collections/run' });
    expect(second.json().sent).toBe(0);
  });

  it('skips customers who opted out (autoCollection=false)', async () => {
    await setup('11999990000', false);
    const run = await inject({ method: 'POST', url: '/collections/run' });
    expect(run.json().sent).toBe(0);
  });

  it('skips customers without phone', async () => {
    await setup(null);
    const run = await inject({ method: 'POST', url: '/collections/run' });
    expect(run.json().sent).toBe(0);
  });
});
