import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SettingsService } from './settings.service.js';
import { updateSettingsSchema } from './settings.schema.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  const service = new SettingsService();
  const actor = (req: FastifyRequest) => ({ userId: req.auth.userId, companyId: req.auth.companyId! });

  const guard = {
    onRequest: [app.authenticate, app.requireCompany],
    preHandler: [app.requirePermission(PERMISSIONS.SETTINGS_MANAGE)],
  };

  app.get('/', guard, async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await service.get(actor(req)));
  });

  app.put('/', guard, async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await service.update(actor(req), updateSettingsSchema.parse(req.body)));
  });
}
