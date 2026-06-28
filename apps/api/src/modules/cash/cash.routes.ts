import type { FastifyInstance } from 'fastify';
import { CashService } from './cash.service.js';
import { makeCashController } from './cash.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function cashRoutes(app: FastifyInstance): Promise<void> {
  const c = makeCashController(new CashService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });

  app.post('/open', can(PERMISSIONS.CASH_OPEN), c.open);
  app.get('/current', can(PERMISSIONS.CASH_OPEN), c.current);
  app.post('/withdrawal', can(PERMISSIONS.CASH_MOVE), c.withdrawal); // sangria
  app.post('/supply', can(PERMISSIONS.CASH_MOVE), c.supply); // suprimento
  app.post('/close', can(PERMISSIONS.CASH_CLOSE), c.close);
  app.get('/', can(PERMISSIONS.CASH_OPEN), c.list);
  app.get('/:id', can(PERMISSIONS.CASH_OPEN), c.getById);
}
