import type { FastifyInstance } from 'fastify';
import { PurchaseService } from './purchase.service.js';
import { makePurchaseController } from './purchase.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function purchaseRoutes(app: FastifyInstance): Promise<void> {
  const c = makePurchaseController(new PurchaseService());
  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });

  app.get('/', can(PERMISSIONS.PURCHASE_VIEW), c.list);
  app.get('/:id', can(PERMISSIONS.PURCHASE_VIEW), c.getById);
  app.post('/', can(PERMISSIONS.PURCHASE_CREATE), c.create);
}
