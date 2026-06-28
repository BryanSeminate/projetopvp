import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, adminAuth } from './helpers.js';

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });

describe('auth', () => {
  it('logs in the seeded admin', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'admin@demo.com', password: 'admin123' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.companies.length).toBeGreaterThan(0);
  });

  it('rejects wrong password', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'admin@demo.com', password: 'wrongpass' } });
    expect(res.statusCode).toBe(401);
  });

  it('blocks protected route without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/customers' });
    expect(res.statusCode).toBe(401);
  });

  it('blocks protected route with token but no company selected', async () => {
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'admin@demo.com', password: 'admin123' } });
    const token = login.json().accessToken;
    const res = await app.inject({ method: 'GET', url: '/customers', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(403);
  });

  it('allows access after selecting company', async () => {
    const { token, companyId } = await adminAuth(app);
    const res = await app.inject({ method: 'GET', url: '/customers', headers: { authorization: `Bearer ${token}`, 'x-company-id': companyId } });
    expect(res.statusCode).toBe(200);
  });
});
