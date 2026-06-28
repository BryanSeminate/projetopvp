import type { FastifyInstance } from 'fastify';
import { SaleService } from './sale.service.js';
import { makeSaleController } from './sale.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function saleRoutes(app: FastifyInstance): Promise<void> {
  const c = makeSaleController(new SaleService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });

  app.get('/payment-methods', can(PERMISSIONS.SALE_CREATE), c.paymentMethods);
  app.get('/', can(PERMISSIONS.SALE_CREATE), c.list);
  app.get('/:id', can(PERMISSIONS.SALE_CREATE), c.getById);
  app.post('/', can(PERMISSIONS.SALE_CREATE), c.create);
  app.post('/:id/cancel', can(PERMISSIONS.SALE_CANCEL), c.cancel);
}
