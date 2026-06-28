import type { FastifyInstance } from 'fastify';
import { CreditService } from './credit.service.js';
import { makeCreditController } from './credit.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function creditRoutes(app: FastifyInstance): Promise<void> {
  const c = makeCreditController(new CreditService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });

  app.get('/:customerId', can(PERMISSIONS.CREDIT_VIEW), c.get);
  app.get('/:customerId/history', can(PERMISSIONS.CREDIT_VIEW), c.history);
  app.put('/:customerId/limit', can(PERMISSIONS.CREDIT_MANAGE), c.setLimit);
  app.post('/:customerId/block', can(PERMISSIONS.CREDIT_MANAGE), c.block);
  app.post('/:customerId/unblock', can(PERMISSIONS.CREDIT_MANAGE), c.unblock);
  app.patch('/:customerId/auto-collection', can(PERMISSIONS.CREDIT_MANAGE), c.setAutoCollection);
}
