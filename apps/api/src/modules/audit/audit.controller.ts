import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuditQueryService } from './audit.service.js';
import { listAuditQuerySchema } from './audit.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeAuditController(service: AuditQueryService) {
  return {
    async list(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.list(actor(req), listAuditQuerySchema.parse(req.query)));
    },
    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(actor(req), id));
    },
  };
}
