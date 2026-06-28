import type { FastifyInstance } from 'fastify';
import { CompanyService } from './company.service.js';
import { makeCompanyController } from './company.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function companyRoutes(app: FastifyInstance): Promise<void> {
  const service = new CompanyService();
  const c = makeCompanyController(service);

  // every route: must be authenticated + have an active company selected
  const base = { onRequest: [app.authenticate, app.requireCompany] };

  app.get('/', { ...base, preHandler: [app.requirePermission(PERMISSIONS.COMPANY_VIEW)] }, c.list);
  app.get('/:id', { ...base, preHandler: [app.requirePermission(PERMISSIONS.COMPANY_VIEW)] }, c.getById);
  app.post('/', { ...base, preHandler: [app.requirePermission(PERMISSIONS.COMPANY_CREATE)] }, c.create);
  app.put('/:id', { ...base, preHandler: [app.requirePermission(PERMISSIONS.COMPANY_UPDATE)] }, c.update);
  app.delete('/:id', { ...base, preHandler: [app.requirePermission(PERMISSIONS.COMPANY_DELETE)] }, c.remove);
}
