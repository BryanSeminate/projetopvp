import type { FastifyInstance } from 'fastify';
import { SupplierService } from './supplier.service.js';
import { makeSupplierController } from './supplier.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function supplierRoutes(app: FastifyInstance): Promise<void> {
  const c = makeSupplierController(new SupplierService());
  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });

  app.get('/', can(PERMISSIONS.SUPPLIER_VIEW), c.list);
  app.get('/:id', can(PERMISSIONS.SUPPLIER_VIEW), c.getById);
  app.post('/', can(PERMISSIONS.SUPPLIER_CREATE), c.create);
  app.put('/:id', can(PERMISSIONS.SUPPLIER_UPDATE), c.update);
  app.delete('/:id', can(PERMISSIONS.SUPPLIER_UPDATE), c.remove);
}
