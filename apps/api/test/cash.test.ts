import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, adminAuth, authed, resetBusinessData } from './helpers.js';

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

describe('caixa', () => {
  it('opens, blocks double open, and computes expected balance', async () => {
    const open = await inject({ method: 'POST', url: '/cash/open', payload: { openingAmount: 200 } });
    expect(open.statusCode).toBe(201);

    const again = await inject({ method: 'POST', url: '/cash/open', payload: { openingAmount: 50 } });
    expect(again.statusCode).toBe(409);

    await inject({ method: 'POST', url: '/cash/supply', payload: { amount: 100 } });
    await inject({ method: 'POST', url: '/cash/withdrawal', payload: { amount: 50 } });

    const cur = await inject({ method: 'GET', url: '/cash/current' });
    expect(cur.json().expectedAmount).toBe(250); // 200 + 100 - 50
  });

  it('rejects withdrawal larger than balance', async () => {
    await inject({ method: 'POST', url: '/cash/open', payload: { openingAmount: 100 } });
    const res = await inject({ method: 'POST', url: '/cash/withdrawal', payload: { amount: 1000 } });
    expect(res.statusCode).toBe(400);
  });

  it('closes with difference', async () => {
    await inject({ method: 'POST', url: '/cash/open', payload: { openingAmount: 200 } });
    const close = await inject({ method: 'POST', url: '/cash/close', payload: { closingAmount: 190 } });
    expect(close.statusCode).toBe(200);
    expect(Number(close.json().difference)).toBe(-10);
    expect(close.json().status).toBe('CLOSED');
  });
});
