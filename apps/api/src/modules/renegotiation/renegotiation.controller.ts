import type { FastifyRequest, FastifyReply } from 'fastify';
import { RenegotiationService } from './renegotiation.service.js';
import { createRenegotiationSchema, listRenegotiationQuerySchema } from './renegotiation.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeRenegotiationController(service: RenegotiationService) {
  return {
    async create(req: FastifyRequest, reply: FastifyReply) {
      const data = createRenegotiationSchema.parse(req.body);
      return reply.status(201).send(await service.create(actor(req), data));
    },
    async list(req: FastifyRequest, reply: FastifyReply) {
      const query = listRenegotiationQuerySchema.parse(req.query);
      return reply.send(await service.list(actor(req), query));
    },
    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(actor(req), id));
    },
  };
}
