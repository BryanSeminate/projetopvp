import type { FastifyRequest, FastifyReply } from 'fastify';
import { StockService } from './stock.service.js';
import { createMovementSchema, listMovementQuerySchema } from './stock.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeStockController(service: StockService) {
  return {
    async create(req: FastifyRequest, reply: FastifyReply) {
      const data = createMovementSchema.parse(req.body);
      return reply.status(201).send(await service.createManual(actor(req), data));
    },
    async list(req: FastifyRequest, reply: FastifyReply) {
      const query = listMovementQuerySchema.parse(req.query);
      return reply.send(await service.list(actor(req), query));
    },
    async lowStock(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.lowStock(actor(req)));
    },
  };
}
