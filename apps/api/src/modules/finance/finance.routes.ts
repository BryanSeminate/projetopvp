import type { FastifyInstance } from 'fastify';
import { FinanceService } from './finance.service.js';
import { makeFinanceController } from './finance.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function financeRoutes(app: FastifyInstance): Promise<void> {
  const c = makeFinanceController(new FinanceService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });
  const V = PERMISSIONS.FINANCE_VIEW;
  const M = PERMISSIONS.FINANCE_MANAGE;

  // payables
  app.get('/payables', can(V), c.listPayables);
  app.get('/payables/:id', can(V), c.getPayable);
  app.post('/payables', can(M), c.createPayable);
  app.put('/payables/:id', can(M), c.updatePayable);
  app.post('/payables/:id/pay', can(M), c.payPayable);
  app.delete('/payables/:id', can(M), c.cancelPayable);

  // receivables
  app.get('/receivables', can(V), c.listReceivables);
  app.get('/receivables/:id', can(V), c.getReceivable);
  app.post('/receivables', can(M), c.createReceivable);
  app.post('/receivables/:id/receive', can(M), c.receiveReceivable);

  // installments (crediário)
  app.get('/installments', can(V), c.listInstallments);
  app.post('/installments/:id/pay', can(M), c.payInstallment);
}
