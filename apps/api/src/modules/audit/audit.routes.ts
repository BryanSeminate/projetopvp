import type { FastifyInstance } from 'fastify';
import { AuditQueryService } from './audit.service.js';
import { makeAuditController } from './audit.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  const c = makeAuditController(new AuditQueryService());

  const guard = {
    onRequest: [app.authenticate, app.requireCompany],
    preHandler: [app.requirePermission(PERMISSIONS.AUDIT_VIEW)],
  };

  app.get('/', guard, c.list);
  app.get('/:id', guard, c.getById);
}
