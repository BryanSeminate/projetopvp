import type { FastifyInstance } from 'fastify';
import { UserService } from './user.service.js';
import { makeUserController } from './user.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const service = new UserService();
  const c = makeUserController(service);

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });

  // roles dropdown — any authenticated company user that can view users
  app.get('/roles', can(PERMISSIONS.USER_VIEW), c.listRoles);

  app.get('/', can(PERMISSIONS.USER_VIEW), c.list);
  app.get('/:id', can(PERMISSIONS.USER_VIEW), c.getById);
  app.post('/', can(PERMISSIONS.USER_CREATE), c.create);
  app.put('/:id', can(PERMISSIONS.USER_UPDATE), c.update);
  app.patch('/:id/role', can(PERMISSIONS.USER_UPDATE), c.setRole);
  app.post('/:id/companies', can(PERMISSIONS.USER_UPDATE), c.linkCompany);
  app.patch('/:id/block', can(PERMISSIONS.USER_BLOCK), c.block);
  app.patch('/:id/unblock', can(PERMISSIONS.USER_BLOCK), c.unblock);
}
