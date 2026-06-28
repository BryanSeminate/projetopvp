import type { FastifyRequest, FastifyReply } from 'fastify';
import { PurchaseService } from './purchase.service.js';
import { createPurchaseSchema, listPurchaseQuerySchema } from './purchase.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makePurchaseController(service: PurchaseService) {
  return {
    async create(req: FastifyRequest, reply: FastifyReply) {
      return reply.status(201).send(await service.create(actor(req), createPurchaseSchema.parse(req.body)));
    },
    async list(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.list(actor(req), listPurchaseQuerySchema.parse(req.query)));
    },
    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(actor(req), id));
    },
  };
}
