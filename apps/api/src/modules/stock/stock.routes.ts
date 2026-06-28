import type { FastifyInstance } from 'fastify';
import { StockService } from './stock.service.js';
import { makeStockController } from './stock.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function stockRoutes(app: FastifyInstance): Promise<void> {
  const c = makeStockController(new StockService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });

  app.get('/movements', can(PERMISSIONS.STOCK_VIEW), c.list);
  app.post('/movements', can(PERMISSIONS.STOCK_MANAGE), c.create);
  app.get('/low', can(PERMISSIONS.STOCK_VIEW), c.lowStock);
}
