import type { FastifyInstance } from 'fastify';
import { DelinquencyService } from './delinquency.service.js';
import { makeDelinquencyController } from './delinquency.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function delinquencyRoutes(app: FastifyInstance): Promise<void> {
  const c = makeDelinquencyController(new DelinquencyService());

  const guard = {
    onRequest: [app.authenticate, app.requireCompany],
    preHandler: [app.requirePermission(PERMISSIONS.DELINQUENCY_VIEW)],
  };

  app.get('/panel', guard, c.panel);
  app.get('/customers', guard, c.customers);
  app.get('/overdue', guard, c.overdue);
  app.get('/blocked', guard, c.blocked);
}
