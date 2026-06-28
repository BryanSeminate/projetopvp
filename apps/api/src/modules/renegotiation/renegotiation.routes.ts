import type { FastifyInstance } from 'fastify';
import { RenegotiationService } from './renegotiation.service.js';
import { makeRenegotiationController } from './renegotiation.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function renegotiationRoutes(app: FastifyInstance): Promise<void> {
  const c = makeRenegotiationController(new RenegotiationService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });
  const M = PERMISSIONS.RENEGOTIATION_MANAGE;

  app.get('/', can(M), c.list);
  app.get('/:id', can(M), c.getById);
  app.post('/', can(M), c.create);
}
