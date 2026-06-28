import type { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { makeAuthController } from './auth.controller.js';
import type { AccessTokenPayload } from '../../types/fastify.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const service = new AuthService((payload: AccessTokenPayload) => app.jwt.sign(payload));
  const c = makeAuthController(service);

  app.post('/login', c.login);
  app.post('/refresh', c.refresh);
  app.post('/logout', c.logout);
  app.post('/forgot-password', c.forgotPassword);
  app.post('/reset-password', c.resetPassword);

  // requires a valid access token (company not yet required)
  app.post('/select-company', { onRequest: [app.authenticate] }, c.selectCompany);
  app.get('/me/companies', { onRequest: [app.authenticate] }, c.myCompanies);
}
