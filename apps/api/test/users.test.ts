import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, adminAuth, authed } from './helpers.js';

let app: FastifyInstance;
let adminToken: string;
let companyId: string;
let admin: ReturnType<typeof authed>;
let vendedorRoleId: string;

beforeAll(async () => {
  app = await makeApp();
  const a = await adminAuth(app);
  adminToken = a.token;
  companyId = a.companyId;
  admin = authed(app, adminToken, companyId);
  const roles = await admin({ method: 'GET', url: '/users/roles' });
  vendedorRoleId = roles.json().find((r: { name: string }) => r.name === 'vendedor').id;
});
afterAll(async () => { await app.close(); });

// unique email per test run (User table is not truncated between tests)
const email = (tag: string) => `vend_${tag}_${Date.now()}@test.com`;

async function authAs(userEmail: string, password: string) {
  const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: userEmail, password } });
  if (login.statusCode !== 200) return null;
  const token = login.json().accessToken;
  const sel = await app.inject({ method: 'POST', url: '/auth/select-company', headers: { authorization: `Bearer ${token}` }, payload: { companyId } });
  return sel.json().accessToken as string;
}

describe('usuários e permissões', () => {
  it('admin creates a vendedor; vendedor lacks admin permissions', async () => {
    const mail = email('perm');
    const create = await admin({ method: 'POST', url: '/users', payload: { name: 'Vend Perm', email: mail, password: 'senha123', roleId: vendedorRoleId } });
    expect(create.statusCode).toBe(201);

    const vToken = await authAs(mail, 'senha123');
    expect(vToken).toBeTruthy();
    const v = authed(app, vToken!, companyId);

    // vendedor has no user.view nor product.create
    expect((await v({ method: 'GET', url: '/users' })).statusCode).toBe(403);
    expect((await v({ method: 'POST', url: '/products', payload: { name: 'x' } })).statusCode).toBe(403);
    // but can create a sale-related read he owns? he can view products
    expect((await v({ method: 'GET', url: '/products' })).statusCode).toBe(200);
  });

  it('blocking a user prevents login', async () => {
    const mail = email('block');
    const created = await admin({ method: 'POST', url: '/users', payload: { name: 'Vend Block', email: mail, password: 'senha123', roleId: vendedorRoleId } });
    const userId = created.json().id;

    expect(await authAs(mail, 'senha123')).toBeTruthy(); // works before block

    const block = await admin({ method: 'PATCH', url: `/users/${userId}/block` });
    expect(block.statusCode).toBe(200);

    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: mail, password: 'senha123' } });
    expect(login.statusCode).toBe(403);
  });

  it('admin cannot block themselves', async () => {
    const me = await admin({ method: 'GET', url: '/auth/me/companies' }); // sanity the route works
    expect(me.statusCode).toBe(200);
    // fetch admin id via users list
    const list = await admin({ method: 'GET', url: '/users?search=Administrador' });
    const adminId = list.json().items[0].id;
    const res = await admin({ method: 'PATCH', url: `/users/${adminId}/block` });
    expect(res.statusCode).toBe(403);
  });
});
