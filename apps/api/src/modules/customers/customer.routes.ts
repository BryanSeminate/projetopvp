import type { FastifyInstance } from 'fastify';
import { CustomerService } from './customer.service.js';
import { makeCustomerController } from './customer.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  const c = makeCustomerController(new CustomerService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });

  app.get('/', can(PERMISSIONS.CUSTOMER_VIEW), c.list);
  app.get('/:id', can(PERMISSIONS.CUSTOMER_VIEW), c.getById);
  app.post('/', can(PERMISSIONS.CUSTOMER_CREATE), c.create);
  app.put('/:id', can(PERMISSIONS.CUSTOMER_UPDATE), c.update);
  app.delete('/:id', can(PERMISSIONS.CUSTOMER_UPDATE), c.remove);
}
