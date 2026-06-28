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

describe('clientes', () => {
  it('creates and searches a customer', async () => {
    await inject({ method: 'POST', url: '/customers', payload: { name: 'Maria Silva', document: '12345678901', phone: '11999998888' } });
    const list = await inject({ method: 'GET', url: '/customers?search=maria' });
    expect(list.json().total).toBe(1);
    expect(list.json().items[0].name).toBe('Maria Silva');
  });

  it('rejects duplicate document', async () => {
    await inject({ method: 'POST', url: '/customers', payload: { name: 'Cliente A', document: '99999999999' } });
    const dup = await inject({ method: 'POST', url: '/customers', payload: { name: 'Cliente B', document: '99999999999' } });
    expect(dup.statusCode).toBe(409);
  });

  it('allows multiple customers without document', async () => {
    const a = await inject({ method: 'POST', url: '/customers', payload: { name: 'Sem Doc 1' } });
    const b = await inject({ method: 'POST', url: '/customers', payload: { name: 'Sem Doc 2' } });
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
  });

  it('soft deleted customer returns 404', async () => {
    const c = await inject({ method: 'POST', url: '/customers', payload: { name: 'Temp' } });
    const id = c.json().id;
    await inject({ method: 'DELETE', url: `/customers/${id}` });
    const get = await inject({ method: 'GET', url: `/customers/${id}` });
    expect(get.statusCode).toBe(404);
  });
});
