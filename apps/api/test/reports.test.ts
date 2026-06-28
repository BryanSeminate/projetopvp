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

async function dinheiroId() {
  return (await inject({ method: 'GET', url: '/sales/payment-methods' })).json().find((m: { isCash: boolean }) => m.isCash).id as string;
}

describe('relatórios', () => {
  it('sales report totals completed sales and lists top products', async () => {
    const productId = await seedProduct(app, token, companyId, { salePrice: 50, stock: 100 });
    const din = await dinheiroId();
    await inject({ method: 'POST', url: '/sales', payload: { type: 'CASH', items: [{ productId, quantity: 2, unitPrice: 50 }], payments: [{ paymentMethodId: din, amount: 100 }] } });
    await inject({ method: 'POST', url: '/sales', payload: { type: 'CASH', items: [{ productId, quantity: 1, unitPrice: 50 }], payments: [{ paymentMethodId: din, amount: 50 }] } });

    const rep = await inject({ method: 'GET', url: '/reports/sales' });
    expect(rep.statusCode).toBe(200);
    expect(rep.json().total).toBe(150);
    expect(rep.json().count).toBe(2);
    expect(rep.json().topProducts[0].productId).toBe(productId);
    expect(rep.json().topProducts[0].quantity).toBe(3);
  });

  it('stock report computes valuation', async () => {
    const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 0 });
    // purchase sets cost 40, stock 10 → valuation 400
    const supplierId = (await inject({ method: 'POST', url: '/suppliers', payload: { name: 'Forn Rep' } })).json().id;
    await inject({ method: 'POST', url: '/purchases', payload: { supplierId, items: [{ productId, quantity: 10, unitCost: 40 }] } });

    const rep = await inject({ method: 'GET', url: '/reports/stock' });
    expect(rep.json().stockValue).toBe(400);
    expect(rep.json().productsCount).toBeGreaterThanOrEqual(1);
  });

  it('credit report sums used credit and overdue', async () => {
    const customer = (await inject({ method: 'POST', url: '/customers', payload: { name: 'Rep Cli' } })).json().id;
    const productId = await seedProduct(app, token, companyId, { salePrice: 100, stock: 10 });
    await inject({ method: 'PUT', url: `/credit/${customer}/limit`, payload: { creditLimit: 1000 } });
    await inject({ method: 'POST', url: '/sales', payload: { type: 'INSTALLMENT', customerId: customer, items: [{ productId, quantity: 3 }], installmentPlan: { count: 3, firstDueDate: '2020-01-01' } } });

    const rep = await inject({ method: 'GET', url: '/reports/credit' });
    expect(rep.json().totalUsedCredit).toBe(300);
    expect(rep.json().overdueTotal).toBeGreaterThan(0);
    expect(rep.json().activeInstallments).toBe(3);
  });
});
